import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const ignoredDirectories = new Set(['.git', 'node_modules']);
const jsExtensions = new Set(['.js', '.mjs']);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await collectFiles(entryPath)));
      }

      continue;
    }

    files.push(entryPath);
  }

  return files;
}

const files = await collectFiles(rootDir);
const jsFiles = files.filter((file) => jsExtensions.has(extname(file)));
const jsonFiles = files.filter((file) => extname(file) === '.json');

let hasErrors = false;

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    hasErrors = true;
    process.stderr.write(result.stderr);
  }
}

for (const file of jsonFiles) {
  try {
    JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    hasErrors = true;
    process.stderr.write(`${file}: ${error.message}\n`);
  }
}

if (hasErrors) {
  process.exit(1);
}

process.stdout.write(
  `Linted ${jsFiles.length} JavaScript files and ${jsonFiles.length} JSON files.\n`,
);
