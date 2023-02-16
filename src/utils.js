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

const RETRY_PARAMS = { retries: 2, minTimeout: 0, maxTimeout: 0 };

const FA1_2_ENTRYPOINTS_SCHEMA = [
  ['approve', 'pair', 'address', 'nat'],
  // TODO: investigate why different FA 1.2 tokens have different transfer schema
  // ['transfer', 'pair', 'address', 'pair'],
  ['getAllowance', 'pair', 'pair', 'contract'],
  ['getBalance', 'pair', 'address', 'contract'],
  ['getTotalSupply', 'pair', 'unit', 'contract']
];

const FA2_ENTRYPOINTS_SCHEMA = [
  ['balance_of', 'pair', 'list', 'contract'],
  ['transfer', 'list', 'pair'],
  ['update_operators', 'list', 'or']

];

function isEntrypointsMatched(entrypoints, schema) {
  try {
    for (const [name, prim, ...args] of schema) {
      const entry = entrypoints[name];
      if (
        !entry ||
        entry.prim !== prim ||
        entry.args.length !== args.length ||
        args.some((arg, i) => arg !== entry.args[i]?.prim)
      ) {
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error(err);

    return false;
  }
};

function detectTokenStandard(contract) {
  const { entrypoints } = contract.entrypoints;

  switch (true) {
    case isEntrypointsMatched(entrypoints, FA2_ENTRYPOINTS_SCHEMA):
      return 'fa2';

    case isEntrypointsMatched(entrypoints, FA1_2_ENTRYPOINTS_SCHEMA):
      return 'fa1.2';

    default:
      return null;
  }
};

module.exports = {
  isNumeric,
  isValidContract,
  toTokenSlug,
  fromTokenSlug,
  parseBoolean,
  detectTokenStandard
};
