const config = require("./config");
const { getChainId } = require("./tezos");

const callMetastore = async (key, params) => {
  const chainId = await getChainId();

  const headers = {
    Authorization: config.metastoreAuthSecret,
    "Content-Type": "application/json",
    ...params?.headers
  };

  return await fetch(`${config.metastoreUrl}/${chainId}/${key}`, {
    ...params,
    headers,
  });
};

const set = (key, value, ttl = undefined) =>
  callMetastore(key, {
    method: "POST",
    body: JSON.stringify(value),
    headers: ttl ? { "X-TTL": String(ttl) } : {},
  }).then(response => {
    if (!response.ok) throw new Error(`Metastore error ${response.status}`);
  });

const del = (key) =>
  callMetastore(key, {
    method: "DELETE",
  }).then(response => {
    if (!response.ok) throw new Error(`Metastore error ${response.status}`);
  });

const get = async (key) => {
  const response = await callMetastore(key, {
    method: "GET",
  });

  if (response.status === 404) return undefined;

  if (!response.ok) throw new Error(`Metastore error ${response.status}`);

  return await response.json();
};

module.exports = { set, get, del };
