const { HttpResponseError } = require('@taquito/http-utils');
const {
  IpfsHttpHandler,
} = require("@taquito/tzip16");
const consola = require("consola");
const memoizee = require("memoizee");

const HttpBackend = require("./http-backend");

class IpfsHttpHandlerStacked extends IpfsHttpHandler {
  _gateways;

  constructor() {
    super();

    this.httpBackend = new HttpBackend(120_000);

    /**
     * (!) Make sure, added gateway responds to overload with error 429.
     * (i) `ipfs.io` responds with error 502
     *
     * TODO: Dismiss broken gateways in runtime
     */
    this._gateways = [
      new Gateway('cloudflare-ipfs.com', 10_000),
      new Gateway('cf-ipfs.com', 10_000),
      new Gateway('gateway.pinata.cloud', 10_000),
      // new Gateway('ipfs.eth.aragon.network', 10_000), // Slow, but works (unknown behavior on overload)
    ];
  }

  async getMetadata(_contractAbstraction, { location }, _context) {
    return this.getMetadataMemoized(location.substring(2));
  }

  getMetadataMemoized = memoizee((hash) => {
    const abortController = new AbortController();
    setTimeout(() => {
      abortController.abort();
    }, this.httpBackend.timeout);

    return this._createRequest(hash, abortController);
  }, {
    promise: true,
    maxAge: 60 * 60_000,
    max: 1_000
  })

  async _createRequest(hash, abortController) {
    const gateway = await this._getGateway();
    const url = `https://${gateway}/ipfs/${hash}/`;

    try {
      return await this.httpBackend.createRequest({
        url,
        method: 'GET',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        },
        json: false,
        abortController
      });
    } catch (error) {
      if (abortController.signal.aborted) consola.warn('[IpfsHttpHandlerStacked] Aborted for:', url);

      if (error instanceof HttpResponseError && error.status === 429) {
        this._pauseGateway(gateway);

        return this._createRequest(hash, abortController);
      }

      throw error;
    }
  }

  _getGateway() {
    return Promise.race(
      this._gateways.map(g => g.promise)
    );
  }

  _pauseGateway(gatewayValue) {
    const gateway = this._gateways.find(g => g.value === gatewayValue);
    if (gateway) gateway.pause();
    else consola.warn(`[IpfsHttpHandlerStacked] Gateway '${gatewayValue}' not found`);
  }
}

class Gateway {
  value;
  timeout;
  promise;
  paused = false;

  constructor(value, timeout = 30_000) {
    this.value = value;
    this.timeout = timeout;
    this.promise = Promise.resolve(value);
  }

  pause() {
    if (this.paused) return;

    this.paused = true;
    consola.info(`[IpfsHttpHandlerStacked] Gateway '${this.value}' is paused for ${this.timeout} ms.`);

    this.promise = new Promise(resolve => {
      setTimeout(() => {
        this.paused = false;

        consola.info(`[IpfsHttpHandlerStacked] Gateway '${this.value}' is released.`);

        resolve(this.value);
      }, this.timeout);
    });
  }
}

module.exports = IpfsHttpHandlerStacked;
