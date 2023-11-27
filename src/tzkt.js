const axios = require("axios");

const { KnownChainIDs } = require("./tezos");

const api = axios.create();

const TZKT_API_BASE_URLS = {
  [KnownChainIDs.MAINNET]: 'https://api.tzkt.io/v1',
  [KnownChainIDs.JAKARTANET2]: 'https://api.jakartanet.tzkt.io/v1',
  [KnownChainIDs.LIMANET]: 'https://api.limanet.tzkt.io/v1',
  [KnownChainIDs.MUMBAINET]: 'https://api.mumbainet.tzkt.io/v1',
  [KnownChainIDs.ITHACANET2]: 'https://api.ghostnet.tzkt.io/v1',
  [KnownChainIDs.T4L3NT]: 'https://explorer-api.tlnt.net/v1',
  [KnownChainIDs.T4L3NT_TEST]: 'https://explorer.tlnt.net:8009/v1'
};


const KNOWN_CHAIN_IDS = Object.keys(TZKT_API_BASE_URLS);

function isKnownChainId(chainId) {
  return chainId != null && KNOWN_CHAIN_IDS.includes(chainId);
}

async function getFromTzkt(chainId, endpoint, params) {
  const { data } = await api.get(endpoint, {
    baseURL: TZKT_API_BASE_URLS[chainId],
    params
  });

  return data;
}

async function fetchTokenMetadataFromTzkt(chainId, address, tokenId = '0') {
  if (!isKnownChainId(chainId)) return;

  const [token] = await getFromTzkt(chainId, '/tokens', {
    'contract.eq': address,
    'tokenId.eq': tokenId
  });

  const metadata = token?.metadata;

  if (!metadata?.decimals) return;

  const decimals = Number(metadata.decimals);

  return { ...metadata, decimals };
};

module.exports = fetchTokenMetadataFromTzkt;
