import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const apiPort = process.env.API_PORT ?? '3001';
const webPort = process.env.WEB_PORT ?? '3000';
const apiBaseUrl = process.env.API_BASE_URL ?? `http://localhost:${apiPort}`;

const services = [
  {
    name: 'api',
    file: join(rootDir, 'apps/api/server.mjs'),
    env: {
      API_PORT: apiPort,
    },
  },
  {
    name: 'web',
    file: join(rootDir, 'apps/web/server.mjs'),
    env: {
      WEB_PORT: webPort,
      API_BASE_URL: apiBaseUrl,
    },
  },
];

const children = services.map((service) =>
  spawn(process.execPath, [service.file], {
    cwd: rootDir,
    env: {
      ...process.env,
      ...service.env,
    },
    stdio: 'inherit',
  }),
);

let shuttingDown = false;

function shutdown(signal = 'SIGTERM') {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      process.exitCode = code ?? (signal ? 1 : 0);
      shutdown('SIGTERM');
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
