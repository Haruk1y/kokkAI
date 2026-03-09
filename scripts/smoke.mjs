import { handleApiRequest } from '../apps/api/server.mjs';
import { createWebHandler } from '../apps/web/server.mjs';
import { validateHealthPayload } from '../packages/shared/src/health.js';

async function invokeHandler(handler, { method = 'GET', url = '/', host = 'localhost' } = {}) {
  return new Promise((resolve, reject) => {
    const request = {
      method,
      url,
      headers: { host },
    };

    const response = {
      headers: {},
      statusCode: 200,
      writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        this.headers = {
          ...this.headers,
          ...headers,
        };
      },
      end(body = '') {
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body,
        });
      },
    };

    Promise.resolve(handler(request, response)).catch(reject);
  });
}

const webHandler = createWebHandler({
  apiBaseUrl: 'http://localhost:3001',
});

const apiHealthResponse = await invokeHandler(handleApiRequest, {
  url: '/health',
  host: 'localhost:3001',
});

if (apiHealthResponse.statusCode !== 200) {
  throw new Error(`API /health returned ${apiHealthResponse.statusCode}`);
}

const apiPayload = JSON.parse(apiHealthResponse.body);
const apiValidation = validateHealthPayload(apiPayload);

if (!apiValidation.ok) {
  throw new Error(apiValidation.errors.join('; '));
}

const apiRootResponse = await invokeHandler(handleApiRequest, {
  url: '/',
  host: 'localhost:3001',
});

if (apiRootResponse.statusCode !== 200) {
  throw new Error(`API / returned ${apiRootResponse.statusCode}`);
}

const webHealthResponse = await invokeHandler(webHandler, {
  url: '/health',
  host: 'localhost:3000',
});

if (webHealthResponse.statusCode !== 200) {
  throw new Error(`Web /health returned ${webHealthResponse.statusCode}`);
}

if (!webHealthResponse.body.includes('Prototype 01 Bootstrap')) {
  throw new Error('Web /health did not render the expected heading');
}

if (!webHealthResponse.body.includes('http://localhost:3001')) {
  throw new Error('Web /health did not inject the API base URL');
}

const webRootResponse = await invokeHandler(webHandler, {
  url: '/',
  host: 'localhost:3000',
});

if (webRootResponse.statusCode !== 200) {
  throw new Error(`Web / returned ${webRootResponse.statusCode}`);
}

process.stdout.write(
  'Smoke test passed for API and web route handlers without binding network sockets.\n',
);
