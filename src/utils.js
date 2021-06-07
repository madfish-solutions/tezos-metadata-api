const { validateContractAddress } = require("@taquito/utils");

function isNumeric(str) {
  if (typeof str != "string") return false;
  return (
    !isNaN(str) &&
    !isNaN(parseFloat(str))
  );
}

function isValidContract(address) {
  return validateContractAddress(address) === 3;
}

module.exports = {
  isNumeric,
  isValidContract,
};
