const assert = require("assert");
const memoizee = require("memoizee");
const retry = require("async-retry");
const consola = require("consola");
const { compose } = require("@taquito/taquito");
const { tzip12 } = require("@taquito/tzip12");
const { tzip16 } = require("@taquito/tzip16");
const fixtures = require("./mainnet-fixtures");
const Tezos = require("./tezos");
const { toTokenSlug, parseBoolean } = require("./utils");

const RETRY_PARAMS = {
  retries: 3,
  minTimeout: 0,
  maxTimeout: 300,
};

const getContractForMetadata = memoizee(
  (address) => Tezos.contract.at(address, compose(tzip12, tzip16)),
  { promise: true }
);

async function getTokenMetadata(contractAddress, tokenId = 0) {
  const slug = toTokenSlug(contractAddress, tokenId);
  if (fixtures.has(slug)) {
    return fixtures.get(slug);
  }

  // Flow based on Taquito TZIP-012 & TZIP-016 implementaion
  // and https://tzip.tezosagora.org/proposal/tzip-21
  try {
    const contract = await getContractForMetadata(contractAddress);

    const tzip12Data = await retry(
      () => contract.tzip12().getTokenMetadata(tokenId),
      RETRY_PARAMS
    );

    assert(
      "decimals" in tzip12Data &&
        ("name" in tzip12Data || "symbol" in tzip12Data)
    );

    return {
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
  } catch (err) {
    consola.error(err);

    throw new NotFoundTokenMetadata();
  }
}

class NotFoundTokenMetadata extends Error {
  name = "NotFoundTokenMetadata";
  message = "Metadata for token doesn't found";
}

module.exports = memoizee(getTokenMetadata, {
  promise: true,
  length: 2,
  resolvers: [String, Number],
});
