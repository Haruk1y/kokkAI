import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COMPARISON_UI_REQUIRED_FIELDS,
  DELIBERATION_MODES,
  MODE_CONFIGURATION_EXPECTATIONS,
  validateSharedDeliberationPayload,
  validateComparison,
  validateDossier,
  validateModeRun,
  validatePersonaRegistry,
} from '../packages/shared/src/deliberation.js';
import { loadRepositoryDossiers } from '../packages/shared/src/dossiers.js';
import {
  buildPersonaRegistrySummary,
  loadRepositoryPersonaRegistries,
} from '../packages/shared/src/personas.js';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(rootDir, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertValidation(name, result) {
  if (!result.ok) {
    throw new Error(`${name} failed validation:\n- ${result.errors.join('\n- ')}`);
  }
}

function assertRequiredFields(name, candidate, fields) {
  for (const field of fields) {
    assert(field in candidate, `${name} is missing required comparison UI field "${field}"`);
  }
}

function buildRunTargetIndex(run) {
  return new Map([
    ['briefing', new Set(['briefing'])],
    ['consensus', new Set(['consensus'])],
    ['minority_opinion', new Set(run.minority_opinions.map((item) => item.id))],
    ['contention_point', new Set(run.contention_points.map((item) => item.id))],
    ['stakeholder_impact', new Set(run.stakeholder_impacts.map((item) => item.id))],
    ['uncertainty_note', new Set(run.uncertainty_notes.map((item) => item.id))],
  ]);
}

const dossiers = await loadRepositoryDossiers();
const dossiersById = new Map(dossiers.map((dossier) => [dossier.id, dossier]));
const dossier = dossiersById.get('summer-electricity-relief');
const personaRegistries = await loadRepositoryPersonaRegistries();
const personaRegistry =
  personaRegistries.find((candidate) => candidate.dossier_id === 'summer-electricity-relief') ?? null;
const runs = await Promise.all([
  readJson('data/runs/summer-electricity-relief.committee-institution-replay.example.json'),
  readJson('data/runs/summer-electricity-relief.committee-party-bias-removed.example.json'),
  readJson('data/runs/summer-electricity-relief.citizens-assembly.example.json'),
]);
const comparison = await readJson('data/comparisons/summer-electricity-relief.example.json');

assert(
  dossiers.length >= 2,
  'repository should include the sample dossier and at least one curated dossier',
);
dossiers.forEach((candidate) => {
  assertValidation(`dossier ${candidate.id}`, validateDossier(candidate));
  assertValidation(`root schema dossier ${candidate.id}`, validateSharedDeliberationPayload(candidate));
});
assert(personaRegistries.length >= 1, 'repository should include at least one persona registry');
assert(dossier, 'sample dossier summer-electricity-relief must exist');
assert(personaRegistry, 'sample persona registry summer-electricity-relief must exist');
assertValidation('sample persona registry', validatePersonaRegistry(personaRegistry));
assertValidation(
  'root schema sample persona registry',
  validateSharedDeliberationPayload(personaRegistry),
);
runs.forEach((run) => {
  assertValidation(`mode run ${run.mode}`, validateModeRun(run));
  assertValidation(`root schema mode run ${run.mode}`, validateSharedDeliberationPayload(run));
});
assertValidation('sample comparison', validateComparison(comparison));
assertValidation('root schema sample comparison', validateSharedDeliberationPayload(comparison));

assertRequiredFields('dossier', dossier, COMPARISON_UI_REQUIRED_FIELDS.dossier);
assertRequiredFields(
  'mode run',
  runs[0],
  COMPARISON_UI_REQUIRED_FIELDS.modeRun,
);
assertRequiredFields(
  'comparison',
  comparison,
  COMPARISON_UI_REQUIRED_FIELDS.comparison,
);

assert(personaRegistry.dossier_id === dossier.id, 'persona registry dossier_id must match the dossier id');
assert(comparison.dossier_id === dossier.id, 'comparison dossier_id must match the dossier id');
assert(
  personaRegistries.every((registry) => dossiersById.has(registry.dossier_id)),
  'every persona registry dossier_id must reference a repository dossier',
);

const sourceDocuments = new Map(
  dossier.source_documents.map((document) => [
    document.id,
    new Set(document.chunks.map((chunk) => chunk.id)),
  ]),
);
const personasByMode = new Map(
  personaRegistry.modes.map((modeDefinition) => [
    modeDefinition.mode,
    new Set(modeDefinition.personas.map((persona) => persona.id)),
  ]),
);
const personaSummary = buildPersonaRegistrySummary(personaRegistry);
const runsByMode = new Map(runs.map((run) => [run.mode, run]));

assert(
  DELIBERATION_MODES.every((mode) => runsByMode.has(mode)),
  'sample payloads must include one run for each MVP deliberation mode',
);
assert(
  personaSummary.mode_count === DELIBERATION_MODES.length,
  'persona registry summary must enumerate all three MVP deliberation modes',
);

const institutionReplayMode = personaRegistry.modes.find(
  (modeDefinition) => modeDefinition.mode === 'committee_institution_replay',
);
const partyRemovedMode = personaRegistry.modes.find(
  (modeDefinition) => modeDefinition.mode === 'committee_party_bias_removed',
);
const citizensAssemblyMode = personaRegistry.modes.find(
  (modeDefinition) => modeDefinition.mode === 'citizens_assembly',
);

assert(institutionReplayMode, 'persona registry must define committee_institution_replay');
assert(partyRemovedMode, 'persona registry must define committee_party_bias_removed');
assert(citizensAssemblyMode, 'persona registry must define citizens_assembly');

Object.entries(MODE_CONFIGURATION_EXPECTATIONS).forEach(([mode, expectedConfiguration]) => {
  const definition = personaRegistry.modes.find((candidate) => candidate.mode === mode);

  assert(definition, `persona registry must define ${mode}`);

  Object.entries(expectedConfiguration).forEach(([key, value]) => {
    assert(
      definition.configuration[key] === value,
      `${mode} configuration.${key} must equal ${value}`,
    );
  });
});

assert(
  JSON.stringify(institutionReplayMode.configuration) !==
    JSON.stringify(partyRemovedMode.configuration),
  'party-preserving and party-removed modes must differ in configuration',
);
assert(
  citizensAssemblyMode.personas.length >= 3,
  'citizens assembly mode must include at least three personas',
);
assert(
  citizensAssemblyMode.personas.every((persona) => persona.demographics),
  'citizens assembly personas must include demographics to express stakeholder diversity',
);

runs.forEach((run) => {
  assert(run.dossier_id === dossier.id, `${run.run_id} dossier_id must match the dossier id`);

  const validPersonas = personasByMode.get(run.mode);
  assert(validPersonas, `${run.run_id} references unknown mode ${run.mode}`);

  run.personas_considered.forEach((personaId) => {
    assert(validPersonas.has(personaId), `${run.run_id} references unknown persona ${personaId}`);
  });

  run.citations.forEach((citation) => {
    const validChunks = sourceDocuments.get(citation.source_document_id);
    assert(
      validChunks,
      `${run.run_id} citation ${citation.id} references unknown source document ${citation.source_document_id}`,
    );
    assert(
      validChunks.has(citation.source_chunk_id),
      `${run.run_id} citation ${citation.id} references unknown source chunk ${citation.source_chunk_id}`,
    );
  });
});

comparison.mode_summaries.forEach((summary) => {
  const run = runsByMode.get(summary.mode);
  assert(run, `comparison references missing run for mode ${summary.mode}`);
  assert(
    summary.run_id === run.run_id,
    `comparison run id mismatch for mode ${summary.mode}: expected ${run.run_id}`,
  );
});

const claimReferenceGroups = [
  ...comparison.agreements.map((item) => item.claim_refs),
  ...comparison.disagreements.map((item) => item.claim_refs),
  ...comparison.unstable_points.map((item) => item.claim_refs),
];

claimReferenceGroups.flat().forEach((reference) => {
  const run = runsByMode.get(reference.mode);
  const targetIndex = buildRunTargetIndex(run);
  const validTargetIds = targetIndex.get(reference.target_type);
  const citationIds = new Set(run.citations.map((citation) => citation.id));

  assert(
    validTargetIds && validTargetIds.has(reference.target_id),
    `comparison references unknown ${reference.target_type} target ${reference.target_id} for mode ${reference.mode}`,
  );

  reference.citation_ids.forEach((citationId) => {
    assert(
      citationIds.has(citationId),
      `comparison references unknown citation ${citationId} for mode ${reference.mode}`,
    );
  });
});

process.stdout.write(
  `Validated ${dossiers.length} dossiers, ${personaRegistries.length} persona registries, 3 mode runs, and 1 comparison payload against the shared deliberation schema.\n`,
);
