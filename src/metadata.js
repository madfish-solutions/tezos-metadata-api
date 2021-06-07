const memoizee = require("memoizee");
const { compose } = require("@taquito/taquito");
const { tzip12 } = require("@taquito/tzip12");
const { tzip16 } = require("@taquito/tzip16");
const Tezos = require("./tezos");

const getContractForMetadata = memoizee(
  (address) => Tezos.contract.at(address, compose(tzip12, tzip16)),
  { promise: true }
);

async function getTokenMetadata(contractAddress, fa2TokenId = 0) {
  const tokenId = fa2TokenId;
  const contract = await getContractForMetadata(contractAddress);

  let tokenData;
  let latestErrMessage;

  /**
   * Try fetching token data with TZIP12
   */
  try {
    tokenData = await contract.tzip12().getTokenMetadata(tokenId);
  } catch (err) {
    latestErrMessage = err.message;
  }

  /**
   * Try fetching token data with TZIP16
   * Get them from plain tzip16 structure/scheme
   */
  if (!tokenData || Object.keys(tokenData).length === 0) {
    try {
      const { metadata } = await contract.tzip16().getMetadata();
      tokenData = metadata;
    } catch (err) {
      latestErrMessage = err.message;
    }
  }

  if (!tokenData) {
    tokenData = {};
  }

  return {
    decimals: tokenData.decimals ? +tokenData.decimals : 0,
    symbol: tokenData.symbol || contractAddress,
    name: tokenData.name || tokenData.symbol || "Unknown Token",
    thumbnailUri:
      tokenData.thumbnailUri ||
      tokenData.logo ||
      tokenData.icon ||
      tokenData.iconUri ||
      tokenData.iconUrl,
  };
}

module.exports = memoizee(getTokenMetadata, {
  promise: true,
  length: 2,
  resolvers: [String, Number],
});
