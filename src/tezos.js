const { TezosToolkit, MichelCodecPacker, ChainIds } = require("@taquito/taquito");
const { RpcClient, RpcClientCache } = require('@taquito/rpc');
const {
  Tzip16Module,
  TezosStorageHandler,
  MetadataProvider,
} = require("@taquito/tzip16");
const { Tzip12Module } = require("@taquito/tzip12");
const consola = require("consola");
const pMemoize = require("p-memoize");

const LambdaViewSigner = require("./signer");
const { rpcUrl } = require("./config");
const IpfsHttpHandler = require("./ipfs-handler-stacked");
const HttpHandlerWithIpfs = require("./http-handler-with-ipfs");
const HttpBackend = require("./http-backend");

const Tezos = new TezosToolkit(
  new RpcClientCache(
    new RpcClient(rpcUrl, undefined, new HttpBackend()),
    60_000
  )
);

const tezosContext = Tezos._context;

const ipfsHandler = new IpfsHttpHandler();
const httpHandler = new HttpHandlerWithIpfs(ipfsHandler);

const metadataProvider = new MetadataProvider(
  new Map([
    ["http", httpHandler],
    ["https", httpHandler],
    ["tezos-storage", new TezosStorageHandler()],
    ["ipfs", ipfsHandler],
  ])
);

Tezos.addExtension(new Tzip16Module(metadataProvider));
Tezos.addExtension(new Tzip12Module(metadataProvider));
Tezos.setSignerProvider(new LambdaViewSigner());
Tezos.setPackerProvider(new MichelCodecPacker());

const getChainId = pMemoize(async () => {
  const chainId = await Tezos.rpc.getChainId();
  consola.info('Chain ID = ', chainId);

  return chainId;
});

getChainId().catch(err => {
  console.error('Failed to get Chain ID:', err);
  process.exit(1);
});

const KnownChainIDs = {
  ...ChainIds,
  MUMBAINET: 'NetXgbcrNtXD2yA',
  /** DCP Network */
  T4L3NT: 'NetXooyhiru73tk',
  T4L3NT_TEST: 'NetXX7Tz1sK8JTa'
};

module.exports = {
  Tezos,
  tezosContext,
  KnownChainIDs,
  metadataProvider,
  getChainId
};
