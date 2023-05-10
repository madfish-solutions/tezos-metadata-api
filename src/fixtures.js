const { KnownChainIDs, getChainId } = require("./tezos");

const MAINNET_FIXTURES = {
  "KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV_0": {
    decimals: 18,
    symbol: "KUSD",
    name: "Kolibri",
    thumbnailUri: "https://kolibri-data.s3.amazonaws.com/logo.png",
    standard: "fa12"
  },

  "KT1VYsVfmobT7rsMVivvZ4J8i3bPiqz12NaH_0": {
    decimals: 6,
    symbol: "wXTZ",
    name: "Wrapped Tezos",
    thumbnailUri:
      "https://raw.githubusercontent.com/StakerDAO/wrapped-xtz/dev/assets/wXTZ-token-FullColor.png",
    standard: "fa12"
  },

  "KT1REEb5VxWRjcHm5GzDMwErMmNFftsE5Gpf_0": {
    decimals: 6,
    symbol: "USDS",
    name: "Stably USD",
    thumbnailUri: "https://quipuswap.com/tokens/stably.png",
    standard: "fa2"
  },

  "KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn_0": {
    decimals: 8,
    symbol: "tzBTC",
    name: "tzBTC",
    thumbnailUri:
      "https://tzbtc.io/wp-content/uploads/2020/03/tzbtc_logo_single.svg",
    standard: "fa12"
  },

  "KT1AEfeckNbdEYwaMKkytBwPJPycz7jdSGea_0": {
    decimals: 18,
    symbol: "STKR",
    name: "Staker Governance Token",
    thumbnailUri: "https://github.com/StakerDAO/resources/raw/main/stkr.png",
    standard: "fa12"
  },

  "KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9_0": {
    decimals: 6,
    symbol: "USDtz",
    name: "USDtez",
    thumbnailUri: "https://quipuswap.com/tokens/usdtz.png",
    standard: "fa12"
  },

  "KT19at7rQUvyjxnZ2fBv7D9zc8rkyG7gAoU8_0": {
    decimals: 18,
    symbol: "ETHtz",
    name: "ETHtez",
    thumbnailUri: "https://quipuswap.com/tokens/ethtz.png",
    standard: "fa12"
  },

  "KT1AxaBxkFLCUi3f8rdDAAxBKHfzY8LfKDRA_0": {
    decimals: 36,
    symbol: "QLkUSD",
    name: "Quipuswap Liquidating kUSD",
    thumbnailUri: "https://kolibri-data.s3.amazonaws.com/logo.png",
    standard: "fa12"
  },

  "KT1S6t5PrHXnozytDU3vYdajmsenoBNYY8WJ_0": {
    decimals: 6,
    symbol: "XTZGold",
    name: "OroPocket Gold",
    standard: "fa12"
  },

  "KT1EqhKGcu9nztF5p9qa4c3cYVqVewQrJpi2_0": {
    decimals: 6,
    symbol: "XTZSilver",
    name: "OroPocket Silver",
    standard: "fa12"
  },

  "KT1TwzD6zV3WeJ39ukuqxcfK2fJCnhvrdN1X_0": {
    decimals: 3,
    symbol: "SMAK",
    name: "SmartLink",
    thumbnailUri: "https://quipuswap.com/tokens/smak.png",
    standard: "fa12"
  },

  "KT1AafHA1C1vk959wvHWBispY9Y2f3fxBUUo_0": {
    decimals: 0,
    symbol: "SIRS",
    name: "Sirius",
    thumbnailUri: "ipfs://QmNXQPkRACxaR17cht5ZWaaKiQy46qfCwNVT5FGZy6qnyp",
    standard: "fa12"
  },
};

const ITHACANNET2_FIXTURES = {
  "KT1Wdq6sj3ZkNqQ7CeE6kTNbJXfobMX7Eqpz_0": {
    decimals: 8,
    symbol: "tzBTC",
    name: "Test tzBTC",
    thumbnailUri: "https://tzbtc.io/wp-content/uploads/2020/03/tzbtc_logo_single.svg",
    standard: "fa12"
  },

  "KT1N4NfnYmJucXYkuPdvJG4Jxbz3TetCTqJc_2": {
    decimals: 12,
    symbol: "uBTC",
    name: "Test youves BTC",
    thumbnailUri: "https://app.youves.com/assets/img/symbols/ubtc.svg",
    standard: "fa2"
  },

  "KT1QzmrMs1xUXZJ8TPAoDEFaKC6w56RfdLWo_0": {
    decimals: 6,
    symbol: "USDtz",
    name: "Test USDtez",
    thumbnailUri: "https://quipuswap.com/tokens/usdtz.png",
    standard: "fa12"
  },
};

const T4L3NT_FIXTURES = {
  "KT1N7Rh6SgSdExMPxfnYw1tHqrkSm7cm6JDN_0": {
    decimals: 0,
    symbol: 'APX',
    name: 'APXCOIN',
    thumbnailUri: 'https://loonfilms.com/apx/apx-coin-220px.png',
    standard: "fa2"
  }
};

const FIXTURES_BY_CHAIN_ID = {
  [KnownChainIDs.MAINNET]: MAINNET_FIXTURES,
  [KnownChainIDs.ITHACANET2]: ITHACANNET2_FIXTURES,
  [KnownChainIDs.T4L3NT]: T4L3NT_FIXTURES,
};

async function getFixture(slug) {
  const chainId = await getChainId();

  return FIXTURES_BY_CHAIN_ID[chainId]?.[slug];
}

module.exports = getFixture;
