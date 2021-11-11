const assert = require("assert");
const memoize = require("p-memoize");
const retry = require("async-retry");
const consola = require("consola");
const { compose } = require("@taquito/taquito");
const { tzip12 } = require("@taquito/tzip12");
const { tzip16 } = require("@taquito/tzip16");
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

    const tzip12Data = await retry(
      () =>
        contract.tzip12().getTokenMetadata(new BigNumber(tokenId).toFixed()),
      RETRY_PARAMS
    );

    assert(
      "decimals" in tzip12Data &&
        ("name" in tzip12Data || "symbol" in tzip12Data)
    );

    let tzip16Data;
    try {
      tzip16Data = await retry(
        () =>
          contract
            .tzip16()
            .getMetadata()
            .then(({ metadata }) => metadata),
        RETRY_PARAMS
      );
    } catch {}

    const result = {
      ...(tzip16Data?.assets?.[assetId] ?? {}),
      ...tzip12Data,
      decimals: +tzip12Data.decimals,
      symbol: tzip12Data.symbol || tzip12Data.name.substr(0, 8),
      name: tzip12Data.name || tzip12Data.symbol,
      shouldPreferSymbol: parseBoolean(tzip12Data.shouldPreferSymbol),
      thumbnailUri:
        tzip12Data.thumbnailUri ||
        tzip12Data.logo ||
        tzip12Data.icon ||
        tzip12Data.iconUri ||
        tzip12Data.iconUrl,
      artifactUri: tzip12Data.artifactUri,
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
