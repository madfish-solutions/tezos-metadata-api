const { HttpRequestFailed } = require('@taquito/http-utils');
const { HttpHandler } = require("@taquito/tzip16");

const HttpBackend = require("./http-backend");

const IPFS_IO_LOCATION = '//ipfs.io/ipfs/';

class HttpHandlerWithIpfs extends HttpHandler {
  _ipfsHandler;
  _ipfsLocations;

  constructor(ipfsHandler) {
    super();

    this.httpBackend = new HttpBackend();
    this._ipfsHandler = ipfsHandler;

    this._ipfsLocations = ipfsHandler.gateways.map(g => `//${g.value}/ipfs/`);
  }

  getMetadata(_contractAbstraction, { protocol, location }, _context) {
    if (/^\/\/(localhost|127.0.0.1)/.test(location))
      throw new HttpRequestFailed(`Localhost requests are not allowed. Requesting ${protocol}:${location}`);

    if (location.startsWith(IPFS_IO_LOCATION)) {
      // `ipfs.io` is often slow or even fails with `504 Gateway timeout`
      const ipfsPath = location.substring(IPFS_IO_LOCATION.length);

      return this._ipfsHandler.getMetadataMemoized(ipfsPath);
    }

    for (const ipfsLocationBeginning of this._ipfsLocations) {
      if (location.startsWith(ipfsLocationBeginning)) {
        // E.g. `location === '//gateway.pinata.cloud/ipfs/QmNvb2LjPc3PKoxtJR5BvgYxyjBLGSZefgT47nhCqSWudG'`
        // See storage of `KT1HGfnsBuAqQnJ4j8QMw3gh6Q1x9nHAJpwC`

        const ipfsPath = location.substring(ipfsLocationBeginning.length);

        return this._ipfsHandler.getMetadataMemoized(ipfsPath);
      }
    }

    return super.getMetadata(_contractAbstraction, { protocol, location }, _context);
  }
}

module.exports = HttpHandlerWithIpfs;
