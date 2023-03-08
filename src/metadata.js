const assert = require("assert");
const axios = require("axios");
const memoize = require("p-memoize");
const retry = require("async-retry");
const consola = require("consola");
const { compose, Context } = require("@taquito/taquito");
const { tzip12 } = require("@taquito/tzip12");
const {
  tzip16,
  MetadataProvider,
  DEFAULT_HANDLERS,
} = require("@taquito/tzip16");
const BigNumber = require("bignumber.js");
const mainnetFixtures = require("./mainnet-fixtures");
const ithacanetFixtures = require("./ithacanet-fixtures");
const Tezos = require("./tezos");
const redis = require("./redis");
const { toTokenSlug, parseBoolean, detectTokenStandard } = require("./utils");
const { network } = require("./config");
const { MAINNET, ITHACANNET } = require("./constants");

const RETRY_PARAMS = {
  retries: 2,
  minTimeout: 0,
  maxTimeout: 100,
};
const ONE_WEEK_IN_SECONDS = 60 * 5 * 24 * 7;
const FIVE_MIN_IN_SECONDS = 60 * 5;

const getContractForMetadata = memoize((address) =>
  Tezos.contract.at(address, compose(tzip12, tzip16))
);

const getTzip12Metadata = async (contract, tokenId) => {
  let tzip12Metadata = {};

  try {
    tzip12Metadata = await retry(
      () =>
        contract.tzip12().getTokenMetadata(new BigNumber(tokenId).toFixed()),
      RETRY_PARAMS
    );
  } catch { }

  return tzip12Metadata;
};

const getTzip16Metadata = async (contract) => {
  let tzip16Metadata = {};

  try {
    tzip16Metadata = await retry(
      () =>
        contract
          .tzip16()
          .getMetadata()
          .then(({ metadata }) => metadata),
      RETRY_PARAMS
    );
  } catch { }

  return tzip16Metadata;
};

const metadataProvider = new MetadataProvider(DEFAULT_HANDLERS);
const context = new Context(Tezos.rpc);

const getMetadataFromUri = async (contract, tokenId) => {
  let metadataFromUri = {};

  try {
    const storage = await contract.storage();
    assert("token_metadata_uri" in storage);

    const metadataUri = storage.token_metadata_uri.replace(
      "{tokenId}",
      tokenId
    );

    metadataFromUri = await metadataProvider
      .provideMetadata(contract, metadataUri, context)
      .then(({ metadata }) => metadata);
  } catch { }

  return metadataFromUri;
};

async function getTokenMetadata(contractAddress, tokenId = 0) {
  const slug = toTokenSlug(contractAddress, tokenId);

  if (network === MAINNET) {
    if (mainnetFixtures.has(slug)) {
      return mainnetFixtures.get(slug);
    }
  }

  if (network === ITHACANNET) {
    if (ithacanetFixtures.has(slug)) {
      return ithacanetFixtures.get(slug);
    }
  }

  let cached; // : undefined | null | Metadata{}
  try {
    const cachedStr = await redis.get(slug);
    if (cachedStr) cached = JSON.parse(cachedStr);
  } catch { }

  if (cached !== undefined) {
    if (cached === null) {
      throw new NotFoundTokenMetadata();
    }

    return cached;
  }

  // Flow based on Taquito TZIP-012 & TZIP-016 implementaion
  // and https://tzip.tezosagora.org/proposal/tzip-21
  try {
    const contract = await getContractForMetadata(contractAddress);

    const standard = detectTokenStandard(contract);

    let rawMetadata;
    try {
      const tzip12Metadata = await getTzip12Metadata(contract, tokenId);
      const metadataFromUri = await getMetadataFromUri(contract, tokenId);

      rawMetadata = { ...metadataFromUri, ...tzip12Metadata };
    } catch (err) {
      consola.warn(`Looking for token_metadata off-chain view, contractAddress=${contractAddress}, tokenId=${tokenId}...`);
      const tzip16Metadata = await getTzip16Metadata(contract);
      const tokenMetadataView = tzip16Metadata?.views?.find(view => view.name === 'token_metadata');
      const implementation = tokenMetadataView?.implementations[0];

      if (!implementation) {
        throw err;
      }

      console.warn('Trying to call token_metadata view via BCD...');
      const bcdNetwork = network === ITHACANNET ? 'ghostnet' : network;
      const { data: bcdResponseData } = await retry(
        () => axios.post(
          `https://api.better-call.dev/v1/contract/${bcdNetwork}/${contractAddress}/views/execute`,
          {
            data: {
              '@nat_1': tokenId
            },
            implementation: 0,
            kind: 'off-chain',
            name: 'token_metadata',
            view: implementation
          }
        ),
        RETRY_PARAMS
      );

      if (!Array.isArray(bcdResponseData)) {
        throw err;
      }

      const { children } = bcdResponseData[0];
      const tokenInfo = children[1];

      if (!tokenInfo) {
        throw err;
      }

      rawMetadata = Object.fromEntries(tokenInfo.children.map(({ name, value }) => [name, value]));
    }

    assert(
      "decimals" in rawMetadata &&
      ("name" in rawMetadata || "symbol" in rawMetadata)
    );

    const tzip16Metadata = await getTzip16Metadata(contract);

    const result = {
      ...(tzip16Metadata?.assets?.[assetId] ?? {}),
      ...rawMetadata,
      decimals: +rawMetadata.decimals,
      symbol: rawMetadata.symbol || rawMetadata.name.substr(0, 8),
      name: rawMetadata.name || rawMetadata.symbol,
      shouldPreferSymbol: parseBoolean(rawMetadata.shouldPreferSymbol),
      thumbnailUri:
        rawMetadata.thumbnailUri ||
        rawMetadata.thumbnail_uri ||
        rawMetadata.logo ||
        rawMetadata.icon ||
        rawMetadata.iconUri ||
        rawMetadata.iconUrl ||
        rawMetadata.displayUri ||
        rawMetadata.artifactUri,
      artifactUri: rawMetadata.artifactUri,
      standard
    };

    redis
      .set(slug, JSON.stringify(result), "EX", ONE_WEEK_IN_SECONDS, "NX")
      .catch((err) => {
        console.warn("Failed to set cache", err);
      });

    return result;
  } catch (err) {
    consola.error(err);

    redis
      .set(slug, JSON.stringify(null), "EX", FIVE_MIN_IN_SECONDS, "NX")
      .catch((err) => {
        console.warn("Failed to set cache", err);
      });

    throw new NotFoundTokenMetadata();
  }
}

class NotFoundTokenMetadata extends Error {
  name = "NotFoundTokenMetadata";
  message = "Metadata for token doesn't found";
}

module.exports = memoize(getTokenMetadata, {
  cacheKey: ([contractAddress, tokenId]) =>
    toTokenSlug(contractAddress, tokenId),
  maxAge: 1_000 * 60 * 10, // 10 min
});
