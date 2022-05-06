const assert = require("assert");
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
const fixtures = require("./mainnet-fixtures");
const Tezos = require("./tezos");
const redis = require("./redis");
const { toTokenSlug, parseBoolean } = require("./utils");

const RETRY_PARAMS = {
  retries: 2,
  minTimeout: 0,
  maxTimeout: 100,
};
const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;
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
  } catch {}

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
  } catch {}

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
  } catch {}

  return metadataFromUri;
};

async function getTokenMetadata(contractAddress, tokenId = 0) {
  const slug = toTokenSlug(contractAddress, tokenId);
  if (fixtures.has(slug)) {
    return fixtures.get(slug);
  }

  let cached; // : undefined | null | Metadata{}
  try {
    const cachedStr = await redis.get(slug);
    if (cachedStr) cached = JSON.parse(cachedStr);
  } catch {}

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

    const tzip12Metadata = await getTzip12Metadata(contract, tokenId);
    const metadataFromUri = await getMetadataFromUri(contract, tokenId);

    const rawMetadata = { ...metadataFromUri, ...tzip12Metadata };

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
        rawMetadata.artifactUri ||
        rawMetadata.displayUri,
      artifactUri: rawMetadata.artifactUri,
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
