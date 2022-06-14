const { MAINNET } = require("./constants");

module.exports = {
  baUsername: process.env.BA_USERNAME || "admin",
  baPassword: process.env.BA_PASSWORD || "admin",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  port: process.env.PORT || 3000,
  rpcUrl: process.env.RPC_URL || "https://rpc.tzbeta.net/",
  readOnlySignerPK:
    process.env.READ_ONLY_SIGNER_PK ||
    "edpkvWbk81uh1DEvdWKR4g1bjyTGhdu1mDvznPUFE2zDwNsLXrEb9K",
  readOnlySingerPKHash:
    process.env.READ_ONLY_SIGNER_PK_HASH ||
    "tz1fVQangAfb9J1hRRMP2bSB6LvASD6KpY8A",
  network: process.env.NETWORK || MAINNET,
};
