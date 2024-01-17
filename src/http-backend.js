const { HttpBackend, HttpResponseError, HttpRequestFailed } = require('@taquito/http-utils');
const assert = require("assert");
const consola = require("consola");

const HTTP_METHODS_WITH_BODY = ['POST', 'PUT', 'PATCH'];

class HttpBackendWithFetch extends HttpBackend {
  pausePromise;
  pauseOn429;

  /**
   * @param {number} timeout // Same default as Taquito's - 30 seconds
   * @param {number | undefined} pauseOn429
   */
  constructor(timeout = 30_000, pauseOn429 = 0) {
    super(timeout);
    this.pauseOn429 = pauseOn429;

    assert(timeout > pauseOn429, '`pauseOn429` must be lower than `timeout`');
  }

  async createRequest({ url, method, timeout = this.timeout, query, headers = {}, json = true, abortController }, data) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (!method) method = 'GET';

    const body = data !== undefined && HTTP_METHODS_WITH_BODY.includes(method)
      ? JSON.stringify(data)
      : undefined;

    let fullUrl;

    try {
      fullUrl = url + this.serialize(query);

      if (!abortController) {
        abortController = new AbortController();
        setTimeout(() => void abortController.abort(), timeout);
      }

      const response = await (this.pauseOn429 ? this.queueFetch : fetch)(
        fullUrl,
        {
          method,
          headers,
          body,
          signal: abortController.signal
        }
      );

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
      if (err instanceof HttpResponseError) throw err;

      throw new HttpRequestFailed(`${method} ${fullUrl} ${String(err)}`);
    }
  }

  queueFetch = (url, init) => {
    if (this.pausePromise) return this.pausePromise.then(() => this.queueFetch(url, init));

    return fetch(url, init).then(response => {
      if (response.status === 429) {
        consola.warn(`[HttpBackendWithFetch] Caught 429. ${this.pausePromise ? 'Waiting' : 'Pausing'}...`);

        if (!this.pausePromise) // Building a pause promise
          this.pausePromise = new Promise(resolve => {
            setTimeout(() => {
              consola.info('[HttpBackendWithFetch] Releasing delay after 429...');
              delete this.pausePromise;
              resolve();
            }, this.pauseOn429);
          });

        return this.pausePromise.then(() => this.queueFetch(url, init));
      }

      return response;
    });
  }
}

module.exports = HttpBackendWithFetch;
