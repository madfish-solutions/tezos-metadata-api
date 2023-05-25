const { TezosToolkit, MichelCodecPacker, ChainIds } = require("@taquito/taquito");
const {
  Tzip16Module,
  HttpHandler,
  TezosStorageHandler,
  IpfsHttpHandler,
  MetadataProvider,
} = require("@taquito/tzip16");
const { Tzip12Module } = require("@taquito/tzip12");
const consola = require("consola");
const memoize = require("p-memoize");

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

const Tezos = new TezosToolkit(rpcUrl);

Tezos.addExtension(new Tzip16Module(metadataProvider));
Tezos.addExtension(new Tzip12Module(metadataProvider));
Tezos.setSignerProvider(new LambdaViewSigner());
Tezos.setPackerProvider(michelEncoder);

const getChainId = memoize(async () => {
  const chainId = await Tezos.rpc.getChainId();
  consola.info('Chain ID = ', chainId);

  return chainId;
});

const KnownChainIDs = {
  ...ChainIds,
  MUMBAINET: 'NetXgbcrNtXD2yA',
  /** DCP Network */
  T4L3NT: 'NetXooyhiru73tk',
  T4L3NT_TEST: 'NetXX7Tz1sK8JTa'
};

module.exports = { Tezos, KnownChainIDs, getChainId };
