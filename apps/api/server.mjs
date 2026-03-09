import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRepositoryDossiers } from '../../packages/shared/src/dossiers.js';
import { createHealthPayload, HEALTH_ROUTE } from '../../packages/shared/src/health.js';
import {
  buildPersonaRegistrySummary,
  loadRepositoryPersonaRegistries,
  loadRepositoryPersonaRegistryByDossierId,
} from '../../packages/shared/src/personas.js';

const host = '127.0.0.1';
const port = Number(process.env.API_PORT ?? '3001');
const modulePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(modulePath);
const seedFile = join(currentDirectory, '../../data/seeds/prototype-health.json');

function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}

function writeText(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(body);
}

async function readSeedData() {
  return JSON.parse(await readFile(seedFile, 'utf8'));
}

export async function handleApiRequest(request, response) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Origin': '*',
    });
    response.end();
    return;
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  try {
    if (request.method === 'GET' && url.pathname === '/') {
      writeText(
        response,
        200,
        `kokkAI prototype API is running.\nHealth route: http://localhost:${port}${HEALTH_ROUTE}\n`,
      );
      return;
    }

    if (request.method === 'GET' && url.pathname === HEALTH_ROUTE) {
      const [seed, dossiers, personaRegistries] = await Promise.all([
        readSeedData(),
        loadRepositoryDossiers(),
        loadRepositoryPersonaRegistries(),
      ]);
      const payload = createHealthPayload({
        service: 'api',
        notes: [
          'API entrypoint reachable',
          'Seed data loaded from data/seeds/prototype-health.json',
          `Loaded ${dossiers.length} dossier(s) from data/dossiers`,
          `Loaded ${personaRegistries.length} persona registries from data/personas`,
        ],
        seed: {
          ...seed,
          dossier_ids: dossiers.map((dossier) => dossier.id),
          persona_registry_dossier_ids: personaRegistries.map((registry) => registry.dossier_id),
        },
      });

      writeJson(response, 200, payload);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/personas') {
      const registries = await loadRepositoryPersonaRegistries();

      writeJson(response, 200, {
        registries: registries.map((registry) => buildPersonaRegistrySummary(registry)),
      });
      return;
    }

    const pathSegments = url.pathname.split('/').filter(Boolean);
    if (request.method === 'GET' && pathSegments[0] === 'personas' && pathSegments.length === 2) {
      const dossierId = decodeURIComponent(pathSegments[1]);
      const registry = await loadRepositoryPersonaRegistryByDossierId(dossierId);

      if (!registry) {
        writeJson(response, 404, {
          error: 'Not Found',
          path: url.pathname,
        });
        return;
      }

      writeJson(response, 200, registry);
      return;
    }

    writeJson(response, 404, {
      error: 'Not Found',
      path: url.pathname,
    });
  } catch (error) {
    writeJson(response, 500, {
      error: 'Internal Server Error',
      message: error.message,
    });
  }
}

export function createApiServer() {
  return http.createServer(handleApiRequest);
}

if (process.argv[1] === modulePath) {
  const server = createApiServer();

  server.listen(port, host, () => {
    process.stdout.write(`API listening on http://localhost:${port}\n`);
  });

  server.on('error', (error) => {
    process.stderr.write(`API server error: ${error.message}\n`);
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}
