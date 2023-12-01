const config = require("./config");

const callMetastore = (key, params) =>
  fetch(`${config.metastoreUrl}/${key}`, {
    ...params,
    headers: {
      "Content-Type": "application/json",
      ...(config.metastoreAuthSecret
        ? { Authorization: config.metastoreAuthSecret }
        : {}),
    },
  });

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

  if (call.status === 404) {
    return undefined;
  }

  return call.json();
};

module.exports = { set, get, del };
