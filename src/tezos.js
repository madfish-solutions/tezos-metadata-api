const { TezosToolkit, MichelCodecPacker } = require("@taquito/taquito");
const {
  Tzip16Module,
  HttpHandler,
  TezosStorageHandler,
  IpfsHttpHandler,
  MetadataProvider,
} = require("@taquito/tzip16");
const { Tzip12Module } = require("@taquito/tzip12");
const memoize = require("mem");

const LambdaViewSigner = require("./signer");
const { rpcUrl } = require("./config");

const michelEncoder = new MichelCodecPacker();
const metadataProvider = new MetadataProvider(
  new Map([
    ["http", new HttpHandler()],
    ["https", new HttpHandler()],
    ["tezos-storage", new TezosStorageHandler()],
    ["ipfs", new IpfsHttpHandler("cloudflare-ipfs.com")],
  ])
);

const buildTezos = memoize(
  (rpcUrl) => {
    const tezos = new TezosToolkit(rpcUrl);

    tezos.addExtension(new Tzip16Module(metadataProvider));
    tezos.addExtension(new Tzip12Module(metadataProvider));
    tezos.setSignerProvider(new LambdaViewSigner());
    tezos.setPackerProvider(michelEncoder);

    return tezos;
  },
  {
    maxAge: 60 * 60_000, // 1 hour
  }
);

const Tezos = buildTezos(rpcUrl);

module.exports = { Tezos, buildTezos };
