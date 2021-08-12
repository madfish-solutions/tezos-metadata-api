const { validateContractAddress } = require("@taquito/utils");

function isNumeric(str) {
  if (typeof str != "string") return false;
  return !isNaN(str) && !isNaN(parseFloat(str));
}

function isValidContract(address) {
  return validateContractAddress(address) === 3;
}

function toTokenSlug(address, tokenId = 0) {
  return `${address}_${tokenId}`;
}

function fromTokenSlug(slug) {
  const [address, tokenId = 0] = slug.split("_");
  return { address, tokenId };
}

function parseBoolean(value) {
  if (value === "true") return true;
  if (value === "false") return false;
}

module.exports = {
  isNumeric,
  isValidContract,
  toTokenSlug,
  fromTokenSlug,
  parseBoolean,
};
