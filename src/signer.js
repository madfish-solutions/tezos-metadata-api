const { readOnlySingerPKHash, readOnlySignerPK } = require("./config");

module.exports = class LambdaViewSigner {
  async publicKeyHash() {
    return readOnlySingerPKHash;
  }

  async publicKey() {
    return readOnlySignerPK;
  }

  async secretKey() {
    throw new Error("Secret key cannot be exposed");
  }

  async sign() {
    throw new Error("Cannot sign");
  }
};
