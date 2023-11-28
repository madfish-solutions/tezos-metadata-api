const { HttpBackend, HttpResponseError, HttpRequestFailed } = require('@taquito/http-utils');
const consola = require("consola");

const HTTP_METHODS_WITH_BODY = ['POST', 'PUT', 'PATCH'];

class HttpBackendWithFetch extends HttpBackend {
  pausePromise;
  pauseOn429;

  /**
   * @param {number | undefined} pauseOn429 // Must be lower than `timeout`
   */
  constructor(timeout, pauseOn429 = 0) {
    super(timeout);
    this.pauseOn429 = pauseOn429;
  }

  async createRequest({ url, method, timeout = this.timeout, query, headers = {}, json = true }, data) {
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

      const controller = new AbortController();
      setTimeout(() => void controller.abort(), timeout);

      const response = await (this.pauseOn429 ? this.queueFetch : fetch)(
        fullUrl,
        {
          method,
          headers,
          body,
          signal: controller.signal
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
