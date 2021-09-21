const Redis = require("ioredis");
const { redisUrl } = require("./config");

module.exports = new Redis(redisUrl);
