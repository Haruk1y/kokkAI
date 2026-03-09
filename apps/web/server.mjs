import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HEALTH_ROUTE } from '../../packages/shared/src/health.js';

const host = '127.0.0.1';
const port = Number(process.env.WEB_PORT ?? '3000');
const defaultApiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001';
const modulePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(modulePath);
const publicDirectory = join(currentDirectory, 'public');
const indexFile = join(publicDirectory, 'index.html');
const sharedHealthFile = join(currentDirectory, '../../packages/shared/src/health.js');

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
]);

function writeResponse(response, statusCode, contentType, body) {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
  });
  response.end(body);
}

async function serveFile(response, filePath, contentType) {
  const body = await readFile(filePath, 'utf8');
  writeResponse(response, 200, contentType, body);
}

async function serveIndex(response, apiBaseUrl) {
  const template = await readFile(indexFile, 'utf8');
  const rendered = template
    .replace('__API_BASE_URL__', JSON.stringify(apiBaseUrl))
    .replace('__HEALTH_ROUTE__', JSON.stringify(HEALTH_ROUTE));

  writeResponse(response, 200, contentTypes.get('.html'), rendered);
}

export function createWebHandler({ apiBaseUrl = defaultApiBaseUrl } = {}) {
  return async function handleWebRequest(request, response) {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    try {
      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === HEALTH_ROUTE)) {
        await serveIndex(response, apiBaseUrl);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/main.js') {
        await serveFile(response, join(publicDirectory, 'main.js'), contentTypes.get('.js'));
        return;
      }

      if (request.method === 'GET' && url.pathname === '/styles.css') {
        await serveFile(response, join(publicDirectory, 'styles.css'), contentTypes.get('.css'));
        return;
      }

      if (request.method === 'GET' && url.pathname === '/shared/health.js') {
        await serveFile(response, sharedHealthFile, contentTypes.get('.js'));
        return;
      }

      writeResponse(
        response,
        404,
        'text/plain; charset=utf-8',
        `Not Found: ${url.pathname}\n`,
      );
    } catch (error) {
      writeResponse(
        response,
        500,
        'text/plain; charset=utf-8',
        `Internal Server Error: ${error.message}\n`,
      );
    }
  };
}

export const handleWebRequest = createWebHandler();

export function createWebServer() {
  return http.createServer(handleWebRequest);
}

if (process.argv[1] === modulePath) {
  const server = createWebServer();

  server.listen(port, host, () => {
    process.stdout.write(`Web listening on http://localhost:${port}\n`);
  });

  server.on('error', (error) => {
    process.stderr.write(`Web server error: ${error.message}\n`);
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}
