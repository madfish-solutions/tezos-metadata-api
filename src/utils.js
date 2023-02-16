const { validateContractAddress } = require("@taquito/utils");
const BigNumber = require("bignumber.js");

function isNumeric(str) {
  if (BigNumber.isBigNumber(str)) return true;
  if (typeof str != "string") return false;
  return !isNaN(str) && !isNaN(parseFloat(str));
}

function isValidContract(address) {
  return validateContractAddress(address) === 3;
}

function toTokenSlug(address, tokenId = 0) {
  return `${address}_${new BigNumber(tokenId).toFixed()}`;
}

function fromTokenSlug(slug) {
  const [address, tokenIdStr] = slug.split("_");
  return { address, tokenId: new BigNumber(tokenIdStr ?? 0) };
}

function parseBoolean(value) {
  if (value === "true") return true;
  if (value === "false") return false;
}

function getContractStandard(contract) {
  if ('approve' in contract.methods) {
    return 'fa12';
  } else if ('update_operators' in contract.methods) {
    return 'fa2';
  }

  return null;
}

module.exports = {
  isNumeric,
  isValidContract,
  toTokenSlug,
  fromTokenSlug,
  parseBoolean,
  getContractStandard
};
