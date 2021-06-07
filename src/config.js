module.exports = {
  port: process.env.PORT || 3000,
  rpcUrl: process.env.RPC_URL || "https://mainnet-tezos.giganode.io/",
  readOnlySignerPK: process.env.READ_ONLY_SIGNER_PK || 'edpkvWbk81uh1DEvdWKR4g1bjyTGhdu1mDvznPUFE2zDwNsLXrEb9K',
  readOnlySingerPKHash: process.env.READ_ONLY_SIGNER_PK_HASH || 'tz1fVQangAfb9J1hRRMP2bSB6LvASD6KpY8A',
};
