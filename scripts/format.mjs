import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const checkOnly = process.argv.includes('--check');
const ignoredDirectories = new Set(['.git', 'node_modules']);
const supportedExtensions = new Set([
  '.css',
  '.editorconfig',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.txt',
  '.yaml',
  '.yml',
]);

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

    const extension = extname(entry.name);
    if (supportedExtensions.has(extension) || entry.name === '.editorconfig') {
      files.push(entryPath);
    }
  }

  return files;
}

function normalizeText(contents) {
  const normalizedLines = contents
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/u, ''));

  return `${normalizedLines.join('\n').replace(/\n*$/u, '')}\n`;
}

function formatFile(file, contents) {
  if (extname(file) === '.json') {
    return `${JSON.stringify(JSON.parse(contents), null, 2)}\n`;
  }

  return normalizeText(contents);
}

const files = await collectFiles(rootDir);
const changedFiles = [];

for (const file of files) {
  const original = await readFile(file, 'utf8');
  const formatted = formatFile(file, original);

  if (formatted === original) {
    continue;
  }

  changedFiles.push(file);

  if (!checkOnly) {
    await writeFile(file, formatted, 'utf8');
  }
}

if (changedFiles.length === 0) {
  process.stdout.write(
    checkOnly ? 'Formatting already clean.\n' : 'No formatting changes needed.\n',
  );
  process.exit(0);
}

if (checkOnly) {
  for (const file of changedFiles) {
    process.stderr.write(`${file}\n`);
  }

  process.stderr.write('Formatting check failed.\n');
  process.exit(1);
}

process.stdout.write(`Formatted ${changedFiles.length} files.\n`);
