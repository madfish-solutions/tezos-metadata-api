const assert = require("assert");
const axios = require("axios");
const pMemoize = require("p-memoize");
const memoizee = require("memoizee");
const retry = require("async-retry");
const consola = require("consola");
const { compose, ChainIds } = require("@taquito/taquito");
const { tzip12 } = require("@taquito/tzip12");
const { tzip16 } = require("@taquito/tzip16");
const getFixture = require("./fixtures");
const redis = require("./redis");
const { Tezos, tezosContext, metadataProvider, getChainId } = require("./tezos");
const fetchTokenMetadataFromTzkt = require("./tzkt");
const { toTokenSlug, parseBoolean, detectTokenStandard } = require("./utils");
const { getOrUpdateCachedImage } = require("./image-cache");

/** Sometimes Tezos node falsely throws 404 */
const RPC_RETRY_OPTIONS = {
  retries: 2,
  minTimeout: 100,
  maxTimeout: 100,
};

const MEMOIZED_CONTRACTS_NUMBER = 1_000;

const ONE_HOUR_IN_SECONDS = 60 * 60;
const ONE_HOUR_IN_MS = ONE_HOUR_IN_SECONDS * 1000;
const ONE_DAY_IN_MS = ONE_HOUR_IN_MS * 24;

const getContractForMetadata = memoizee(
  address => Tezos.contract.at(address, compose(tzip12, tzip16)),
  {
    promise: true,
    maxAge: 7 * ONE_DAY_IN_MS,
    max: MEMOIZED_CONTRACTS_NUMBER
  }
);

const getTzip12Metadata = async (contract, tokenId) => retry(
  () => contract.tzip12().getTokenMetadata(tokenId),
  RPC_RETRY_OPTIONS
);

const getTzip16MetadataView = memoizee(async (contract) =>
  retry(() =>
    contract
      .tzip16()
      .getMetadata()
      .then(({ metadata }) => metadata?.views?.find(view => view.name === 'token_metadata')),
    RPC_RETRY_OPTIONS,
  ),
  {
    promise: true,
    maxAge: ONE_HOUR_IN_MS,
    max: MEMOIZED_CONTRACTS_NUMBER
  }
);

const getContractStorageTokenMetadataUri = memoizee(
  contract => contract.storage().then(
    storage => storage?.token_metadata_uri,
    error => {
      consola.error(`Caught when getting contract ${contract.address} storage. Error:`);
      console.error(error);

      throw error;
    }
  ),
  {
    promise: true,
    maxAge: ONE_HOUR_IN_MS,
    max: MEMOIZED_CONTRACTS_NUMBER
}
);

const getMetadataFromUri = async (contract, tokenId) => {
  const token_metadata_uri = await getContractStorageTokenMetadataUri(contract);
  assert(typeof token_metadata_uri === 'string');

  const metadataUri = token_metadata_uri.replace(
    "{tokenId}",
    tokenId
  );

  return await metadataProvider
    .provideMetadata(contract, metadataUri, tezosContext)
    .then(
      ({ metadata }) => metadata,
      error => {
        console.error('[From URI] Caught for slug:', `${contract.address}_${tokenId}`, 'Error:');
        console.error(error);

        throw error;
      }
    );
};

const getBCDNetwork = (chainId) => {
  switch (chainId) {
    case ChainIds.MAINNET:
      return 'mainnet';
    case ChainIds.ITHACANET2:
      return 'ghostnet';
    default:
      return undefined;
  }
};

const getTokenMetadataFromOffchainView = async (contract, tokenId, chainId) => {
  const bcdNetwork = getBCDNetwork(chainId);

  if (!bcdNetwork) return null;

  const tzip16MetadataView = await getTzip16MetadataView(contract).catch(error => void console.error(error));
  const implementation = tzip16MetadataView?.implementations?.[0];

  if (!implementation) return null;

  console.warn('Trying to call token_metadata view via BCD...');
  const { data: bcdResponseData } = await retry(
    () => axios.post(
      `https://api.better-call.dev/v1/contract/${bcdNetwork}/${contract.address}/views/execute`,
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
    {
      retries: 1,
      minTimeout: 0,
      maxTimeout: 100,
    }
  );

  if (!Array.isArray(bcdResponseData)) return null;

  const { children } = bcdResponseData[0];
  const tokenInfo = children[1];

  if (!tokenInfo) return null;

  return Object.fromEntries(tokenInfo.children.map(({ name, value }) => [name, value]));
};

async function getTokenMetadata(contractAddress, tokenId = 0) {
  const slug = toTokenSlug(contractAddress, tokenId);

  const predefined = await getFixture(slug);
  if (predefined) return predefined;

  let cached; // : undefined | null | Metadata{}
  try {
    const cachedStr = await redis.get(slug);
    if (cachedStr) cached = JSON.parse(cachedStr);
  } catch (error) { console.error(error); }

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

    const tzip12Metadata = await getTzip12Metadata(contract, tokenId).catch(() => null);
    // TODO: Parallelize. Note, might need to wrap in retry the following call.
    //       As it is now using cached data from the previous one.
    const metadataFromUri = await getMetadataFromUri(contract, tokenId).catch(() => null);

    let rawMetadata = { ...metadataFromUri, ...tzip12Metadata };

    if (!isMetadataUsable(rawMetadata)) {
      consola.info(`Looking for token_metadata off-chain view, slug=${contractAddress}_${tokenId} ...`);

      const chainId = await getChainId();
      rawMetadata = await getTokenMetadataFromOffchainView(contract, tokenId, chainId).catch(error => {
        consola.error(error);
      });
    }

    if (!isMetadataUsable(rawMetadata)) {
      consola.info(`Looking for metadata on TZKT, slug=${contractAddress}_${tokenId} ...`);

      const chainId = await getChainId();
      rawMetadata = await fetchTokenMetadataFromTzkt(chainId, contractAddress, tokenId);
    }

    assert( isMetadataUsable(rawMetadata) );

    const thumbnailUri = rawMetadata.thumbnailUri ||
      rawMetadata.thumbnail_uri ||
      rawMetadata.logo ||
      rawMetadata.icon ||
      rawMetadata.iconUri ||
      rawMetadata.iconUrl ||
      rawMetadata.displayUri ||
      rawMetadata.artifactUri;

    const result = await applyImageCacheForDataUris(
      {
        standard,
        decimals: Number(rawMetadata.decimals) || 0,
        symbol: rawMetadata.symbol || rawMetadata.name.substr(0, 8),
        name: rawMetadata.name || rawMetadata.symbol,
        shouldPreferSymbol: parseBoolean(rawMetadata.shouldPreferSymbol),
        artifactUri: rawMetadata.artifactUri,
        displayUri: rawMetadata.displayUri,
        thumbnailUri,
      },
      slug
    );

    redis
      .set(slug, JSON.stringify(result))
      .catch((err) => {
        console.warn("Failed to set cache", err);
      });

    return result;
  } catch (error) {
    consola.error('No metadata for', slug, 'Error:');
    console.error(error);

    redis
      .set(slug, JSON.stringify(null), "EX", ONE_HOUR_IN_SECONDS, "NX")
      .catch((err) => {
        console.warn("Failed to set cache", err);
      });

    throw new NotFoundTokenMetadata();
  }
}

function isMetadataUsable(metadata) {
  return metadata && typeof metadata === 'object'
    && (Number.isInteger(metadata.decimals) || typeof metadata.artifactUri === 'string')
    && (typeof metadata.name === 'string' || typeof metadata.symbol === 'string');
}

async function applyImageCacheForDataUris(metadata, slug) {
  return {
    ...metadata,
    thumbnailUri: await getOrUpdateCachedImage(
      metadata.thumbnailUri,
      `${slug}_thumbnail`
    ),
    artifactUri: await getOrUpdateCachedImage(
      metadata.artifactUri,
      `${slug}_artifact`
    ),
    displayUri: await getOrUpdateCachedImage(
      metadata.displayUri,
      `${slug}_display`
    ),
  };
}

class NotFoundTokenMetadata extends Error {
  name = "NotFoundTokenMetadata";
  message = "Metadata for token doesn't found";
}

module.exports = pMemoize(getTokenMetadata, {
  cacheKey: ([contractAddress, tokenId]) => toTokenSlug(contractAddress, tokenId),
  maxAge: 1_000 * 60 * 10, // 10 min
});
