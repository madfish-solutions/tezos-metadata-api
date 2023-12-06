const config = require("./config");
const { getChainId } = require("./tezos");

const callMetastore = async (key, params) => {
  const chainId = await getChainId();

  const authHeaders = config.metastoreAuthSecret
    ? { Authorization: config.metastoreAuthSecret }
    : {};

  const response = await fetch(`${config.metastoreUrl}/${chainId}/${key}`, {
    ...params,
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(`Metastore returned ${response.status}`);
  }

  return response;
};

const set = (key, value, ttl = undefined) =>
  callMetastore(key, {
    method: "POST",
    body: JSON.stringify(value),
    headers: ttl ? { "X-TTL": ttl } : {},
  });

const del = (key) =>
  callMetastore(key, {
    method: "DELETE",
  });

const get = async (key) => {
  const call = await callMetastore(key, {
    method: "GET",
  });

  return call.json();
};

module.exports = { set, get, del };
