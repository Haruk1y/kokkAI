import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validatePersonaRegistry } from './deliberation.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = join(currentDirectory, '../../..');
const defaultPersonasDirectory = join(rootDirectory, 'data/personas');

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function assertValidPersonaRegistry(registry, sourceDescription) {
  const validation = validatePersonaRegistry(registry);

  if (!validation.ok) {
    throw new Error(
      `${sourceDescription} failed persona registry validation:\n- ${validation.errors.join('\n- ')}`,
    );
  }

  return registry;
}

function ensureUniqueRegistryDossierIds(registries) {
  const seen = new Set();

  for (const registry of registries) {
    if (seen.has(registry.dossier_id)) {
      throw new Error(`Duplicate persona registry dossier_id found in repository data: ${registry.dossier_id}`);
    }

    seen.add(registry.dossier_id);
  }
}

function summarizeMode(modeDefinition) {
  return {
    mode: modeDefinition.mode,
    label: modeDefinition.label,
    configuration: modeDefinition.configuration,
    institutional_constraints: modeDefinition.institutional_constraints,
    persona_count: modeDefinition.personas.length,
    personas: modeDefinition.personas.map((persona) => ({
      id: persona.id,
      name: persona.name,
      role: persona.role,
      goals: persona.goals,
      constraints: persona.constraints,
      bias_flags: persona.bias_flags,
      demographics: persona.demographics ?? null,
    })),
  };
}

export function buildPersonaRegistrySummary(registry) {
  return {
    dossier_id: registry.dossier_id,
    topic: registry.topic,
    mode_count: registry.modes.length,
    modes: registry.modes.map((definition) => summarizeMode(definition)),
  };
}

export function getModeDefinition(registry, mode) {
  return registry.modes.find((definition) => definition.mode === mode) ?? null;
}

export async function loadRepositoryPersonaRegistries({
  personasDirectory = defaultPersonasDirectory,
} = {}) {
  const entries = await readdir(personasDirectory, { withFileTypes: true });
  const sortedEntries = [...entries].sort((left, right) => left.name.localeCompare(right.name));
  const registries = [];

  for (const entry of sortedEntries) {
    if (!entry.isFile() || extname(entry.name) !== '.json') {
      continue;
    }

    const entryPath = join(personasDirectory, entry.name);
    const registry = await readJson(entryPath);
    registries.push(assertValidPersonaRegistry(registry, `Persona registry file ${entryPath}`));
  }

  ensureUniqueRegistryDossierIds(registries);

  return registries;
}

export async function loadRepositoryPersonaRegistryByDossierId(dossierId, options) {
  const registries = await loadRepositoryPersonaRegistries(options);

  return registries.find((registry) => registry.dossier_id === dossierId) ?? null;
}
