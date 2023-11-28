const { TezosToolkit, MichelCodecPacker, ChainIds } = require("@taquito/taquito");
const { RpcClient } = require('@taquito/rpc');
const { HttpBackend, HttpResponseError, HttpRequestFailed } = require('@taquito/http-utils');
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

const HTTP_METHODS_WITH_BODY = ['POST', 'PUT', 'PATCH'];

class HttpBackendWithFetch extends HttpBackend {
  async createRequest({ url, method, timeout = this.timeout, query, headers = {}, json = true }, data) {
    if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    if(!method) method = 'GET';

    const body = data !== undefined && HTTP_METHODS_WITH_BODY.includes(method)
      ? JSON.stringify(data)
      : undefined;

    let fullUrl;

    try {
      fullUrl = url + this.serialize(query);

      const response = await Promise.race([
        fetch(
          fullUrl,
          {
            method,
            headers,
            body,
          }
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${timeout} reached`)), timeout))
      ]);

      if (!response.ok) {
        const errorData = await response.text();

        throw new HttpResponseError(
          `Http error response: (${response.status}) ${errorData}`,
          response.status,
          response.statusText,
          errorData,
          fullUrl
        );
      }

      if (json) return await response.json();
      else return await response.text();
    }
    catch (err) {
      throw new HttpRequestFailed(`${method} ${fullUrl} ${String(err)}`);
    }
  }
}

const Tezos = new TezosToolkit(
  new RpcClient(rpcUrl, undefined, new HttpBackendWithFetch())
);

Tezos.addExtension(new Tzip16Module(metadataProvider));
Tezos.addExtension(new Tzip12Module(metadataProvider));
Tezos.setSignerProvider(new LambdaViewSigner());
Tezos.setPackerProvider(michelEncoder);

const getChainId = memoize(async () => {
  const chainId = await Tezos.rpc.getChainId().catch(err => {
    console.error('Failed to get Chain ID:', err);
    throw err;
  });
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
