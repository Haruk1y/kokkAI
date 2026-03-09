import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DELIBERATION_SCHEMA_VERSION, validateDossier } from './deliberation.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = join(currentDirectory, '../../..');
const defaultDossiersDirectory = join(rootDirectory, 'data/dossiers');
const directoryFiles = Object.freeze({
  metadata: 'metadata.json',
  summary: 'summary.json',
  sources: 'sources.json',
});

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function assertValidDossier(dossier, sourceDescription) {
  const validation = validateDossier(dossier);

  if (!validation.ok) {
    throw new Error(
      `${sourceDescription} failed dossier validation:\n- ${validation.errors.join('\n- ')}`,
    );
  }

  return dossier;
}

async function loadDirectoryDossier(directoryPath) {
  const [metadata, summary, sources] = await Promise.all([
    readJson(join(directoryPath, directoryFiles.metadata)),
    readJson(join(directoryPath, directoryFiles.summary)),
    readJson(join(directoryPath, directoryFiles.sources)),
  ]);

  const dossier = {
    kind: 'dossier',
    schema_version: DELIBERATION_SCHEMA_VERSION,
    ...metadata,
    ...summary,
    source_documents: sources.source_documents,
  };

  return assertValidDossier(dossier, `Dossier directory ${directoryPath}`);
}

async function loadJsonDossier(filePath) {
  const dossier = await readJson(filePath);

  return assertValidDossier(dossier, `Dossier file ${filePath}`);
}

function ensureUniqueDossierIds(dossiers) {
  const seen = new Set();

  for (const dossier of dossiers) {
    if (seen.has(dossier.id)) {
      throw new Error(`Duplicate dossier id found in repository data: ${dossier.id}`);
    }

    seen.add(dossier.id);
  }
}

export async function loadRepositoryDossiers({
  dossiersDirectory = defaultDossiersDirectory,
} = {}) {
  const entries = await readdir(dossiersDirectory, { withFileTypes: true });
  const sortedEntries = [...entries].sort((left, right) => left.name.localeCompare(right.name));
  const dossiers = [];

  for (const entry of sortedEntries) {
    const entryPath = join(dossiersDirectory, entry.name);

    if (entry.isDirectory()) {
      dossiers.push(await loadDirectoryDossier(entryPath));
      continue;
    }

    if (entry.isFile() && extname(entry.name) === '.json') {
      dossiers.push(await loadJsonDossier(entryPath));
    }
  }

  ensureUniqueDossierIds(dossiers);

  return dossiers;
}

export async function loadRepositoryDossierBySlug(slug, options) {
  const dossiers = await loadRepositoryDossiers(options);

  return dossiers.find((dossier) => dossier.slug === slug) ?? null;
}
