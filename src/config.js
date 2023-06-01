module.exports = {
  baUsername: process.env.BA_USERNAME || "admin",
  baPassword: process.env.BA_PASSWORD || "admin",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  port: process.env.PORT || 3000,
  rpcUrl: process.env.RPC_URL || "https://rpc.decentralized.pictures",
  readOnlySignerPK:
    process.env.READ_ONLY_SIGNER_PK ||
    "edpkvWbk81uh1DEvdWKR4g1bjyTGhdu1mDvznPUFE2zDwNsLXrEb9K",
  readOnlySingerPKHash:
    process.env.READ_ONLY_SIGNER_PK_HASH ||
    "tz1fVQangAfb9J1hRRMP2bSB6LvASD6KpY8A",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  s3Endpoint: process.env.S3_ENDPOINT || "https://fra1.digitaloceanspaces.com",
  s3Region: process.env.S3_REGION || "us-east-1",
  s3Bucket: process.env.S3_BUCKET || "metadata-storage",
  s3CdnUrl:
    process.env.S3_CDN_URL ||
    "https://metadata-storage.fra1.cdn.digitaloceanspaces.com",
};
