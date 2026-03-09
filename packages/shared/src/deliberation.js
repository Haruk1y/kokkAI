import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateJsonSchema } from './json-schema.js';

export const DELIBERATION_SCHEMA_VERSION = 'deliberation.v1';
export const DELIBERATION_MODES = Object.freeze([
  'committee_institution_replay',
  'committee_party_bias_removed',
  'citizens_assembly',
]);

export const COMPARISON_UI_REQUIRED_FIELDS = Object.freeze({
  dossier: Object.freeze([
    'title',
    'summary',
    'briefing',
    'comparison_focus',
    'source_documents',
  ]),
  modeRun: Object.freeze([
    'mode',
    'briefing',
    'consensus',
    'minority_opinions',
    'contention_points',
    'stakeholder_impacts',
    'citations',
    'uncertainty_notes',
    'diffable_summary',
  ]),
  comparison: Object.freeze([
    'mode_summaries',
    'agreements',
    'disagreements',
    'unstable_points',
    'comparison_takeaway',
  ]),
});

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const schemaFile = join(currentDirectory, '../schemas/deliberation.schema.json');
const deliberationSchema = JSON.parse(readFileSync(schemaFile, 'utf8'));

const schemaRefs = Object.freeze({
  dossier: '#/$defs/dossier',
  personaRegistry: '#/$defs/persona_registry',
  modeRun: '#/$defs/mode_run',
  comparison: '#/$defs/comparison',
});

function definitionFromPointer(pointer) {
  return pointer
    .slice(2)
    .split('/')
    .reduce((current, segment) => current[segment], deliberationSchema);
}

function combineValidationResults(...results) {
  const errors = results.flatMap((result) => result.errors);

  return {
    ok: errors.length === 0,
    errors,
  };
}

function validateUniqueStrings(values, path, errors) {
  const seen = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`${path} contains duplicate value "${value}"`);
      continue;
    }

    seen.add(value);
  }
}

function validateRequiredRefs(ids, validIds, path, errors) {
  for (const id of ids) {
    if (!validIds.has(id)) {
      errors.push(`${path} references unknown id "${id}"`);
    }
  }
}

function buildModeRunTargetIndex(run) {
  const targets = new Map([
    ['briefing', new Set(['briefing'])],
    ['consensus', new Set(['consensus'])],
    ['minority_opinion', new Set(run.minority_opinions.map((item) => item.id))],
    ['contention_point', new Set(run.contention_points.map((item) => item.id))],
    ['stakeholder_impact', new Set(run.stakeholder_impacts.map((item) => item.id))],
    ['uncertainty_note', new Set(run.uncertainty_notes.map((item) => item.id))],
  ]);

  return targets;
}

function validateDossierSemantics(dossier) {
  const errors = [];
  const documentIds = dossier.source_documents.map((document) => document.id);

  validateUniqueStrings(documentIds, '$.source_documents', errors);

  const chunkIds = [];

  dossier.source_documents.forEach((document, documentIndex) => {
    const documentPath = `$.source_documents[${documentIndex}]`;
    const localChunkIds = document.chunks.map((chunk) => chunk.id);

    validateUniqueStrings(localChunkIds, `${documentPath}.chunks`, errors);
    chunkIds.push(...localChunkIds);
  });

  validateUniqueStrings(chunkIds, '$.source_documents[*].chunks', errors);

  return {
    ok: errors.length === 0,
    errors,
  };
}

function validatePersonaRegistrySemantics(registry) {
  const errors = [];
  const modes = registry.modes.map((definition) => definition.mode);
  const personaIds = registry.modes.flatMap((definition) =>
    definition.personas.map((persona) => persona.id),
  );

  validateUniqueStrings(modes, '$.modes', errors);
  validateUniqueStrings(personaIds, '$.modes[*].personas', errors);

  return {
    ok: errors.length === 0,
    errors,
  };
}

function validateModeRunSemantics(run) {
  const errors = [];
  const citationIds = new Set(run.citations.map((citation) => citation.id));
  const targetIndex = buildModeRunTargetIndex(run);

  validateUniqueStrings(run.personas_considered, '$.personas_considered', errors);
  validateUniqueStrings(run.citations.map((citation) => citation.id), '$.citations', errors);

  validateRequiredRefs(run.briefing.citation_ids, citationIds, '$.briefing.citation_ids', errors);
  validateRequiredRefs(run.consensus.citation_ids, citationIds, '$.consensus.citation_ids', errors);

  run.minority_opinions.forEach((opinion, index) => {
    validateRequiredRefs(
      opinion.citation_ids,
      citationIds,
      `$.minority_opinions[${index}].citation_ids`,
      errors,
    );
  });

  run.contention_points.forEach((point, index) => {
    validateRequiredRefs(
      point.citation_ids,
      citationIds,
      `$.contention_points[${index}].citation_ids`,
      errors,
    );

    point.positions.forEach((position, positionIndex) => {
      validateRequiredRefs(
        position.citation_ids,
        citationIds,
        `$.contention_points[${index}].positions[${positionIndex}].citation_ids`,
        errors,
      );
    });
  });

  run.stakeholder_impacts.forEach((impact, index) => {
    validateRequiredRefs(
      impact.citation_ids,
      citationIds,
      `$.stakeholder_impacts[${index}].citation_ids`,
      errors,
    );
  });

  run.uncertainty_notes.forEach((note, index) => {
    validateRequiredRefs(
      note.citation_ids,
      citationIds,
      `$.uncertainty_notes[${index}].citation_ids`,
      errors,
    );
  });

  run.citations.forEach((citation, citationIndex) => {
    citation.supports.forEach((support, supportIndex) => {
      const validTargetIds = targetIndex.get(support.target_type);

      if (!validTargetIds || !validTargetIds.has(support.target_id)) {
        errors.push(
          `$.citations[${citationIndex}].supports[${supportIndex}] references unknown ${support.target_type} id "${support.target_id}"`,
        );
      }
    });
  });

  return {
    ok: errors.length === 0,
    errors,
  };
}

function validateComparisonSemantics(comparison) {
  const errors = [];
  const modes = comparison.mode_summaries.map((summary) => summary.mode);
  const modeSet = new Set(modes);

  validateUniqueStrings(modes, '$.mode_summaries', errors);

  if (modeSet.size !== DELIBERATION_MODES.length) {
    errors.push('$.mode_summaries must cover all three MVP deliberation modes exactly once');
  }

  comparison.agreements.forEach((item, index) => {
    item.claim_refs.forEach((reference, referenceIndex) => {
      if (!modeSet.has(reference.mode)) {
        errors.push(
          `$.agreements[${index}].claim_refs[${referenceIndex}] references unknown mode "${reference.mode}"`,
        );
      }
    });
  });

  comparison.disagreements.forEach((item, index) => {
    item.mode_positions.forEach((position, positionIndex) => {
      if (!modeSet.has(position.mode)) {
        errors.push(
          `$.disagreements[${index}].mode_positions[${positionIndex}] references unknown mode "${position.mode}"`,
        );
      }
    });

    item.claim_refs.forEach((reference, referenceIndex) => {
      if (!modeSet.has(reference.mode)) {
        errors.push(
          `$.disagreements[${index}].claim_refs[${referenceIndex}] references unknown mode "${reference.mode}"`,
        );
      }
    });
  });

  comparison.unstable_points.forEach((item, index) => {
    item.claim_refs.forEach((reference, referenceIndex) => {
      if (!modeSet.has(reference.mode)) {
        errors.push(
          `$.unstable_points[${index}].claim_refs[${referenceIndex}] references unknown mode "${reference.mode}"`,
        );
      }
    });
  });

  return {
    ok: errors.length === 0,
    errors,
  };
}

function validateByRef(candidate, ref, semanticValidator) {
  const schemaValidation = validateJsonSchema(candidate, { $ref: ref }, deliberationSchema);
  const semanticValidation = semanticValidator(candidate);

  return combineValidationResults(schemaValidation, semanticValidation);
}

export function getDeliberationSchema() {
  return deliberationSchema;
}

export function validateSharedDeliberationPayload(candidate) {
  const schemaValidation = validateJsonSchema(candidate, deliberationSchema);

  if (
    !candidate ||
    typeof candidate !== 'object' ||
    Array.isArray(candidate) ||
    typeof candidate.kind !== 'string'
  ) {
    return schemaValidation;
  }

  switch (candidate.kind) {
    case 'dossier':
      return combineValidationResults(schemaValidation, validateDossierSemantics(candidate));
    case 'persona_registry':
      return combineValidationResults(
        schemaValidation,
        validatePersonaRegistrySemantics(candidate),
      );
    case 'mode_run':
      return combineValidationResults(schemaValidation, validateModeRunSemantics(candidate));
    case 'comparison':
      return combineValidationResults(schemaValidation, validateComparisonSemantics(candidate));
    default:
      return schemaValidation;
  }
}

export function getDeliberationSchemaDefinition(name) {
  const ref = schemaRefs[name];

  if (!ref) {
    throw new Error(`Unknown deliberation schema definition: ${name}`);
  }

  return definitionFromPointer(ref);
}

export function validateDossier(candidate) {
  return validateByRef(candidate, schemaRefs.dossier, validateDossierSemantics);
}

export function validatePersonaRegistry(candidate) {
  return validateByRef(candidate, schemaRefs.personaRegistry, validatePersonaRegistrySemantics);
}

export function validateModeRun(candidate) {
  return validateByRef(candidate, schemaRefs.modeRun, validateModeRunSemantics);
}

export function validateComparison(candidate) {
  return validateByRef(candidate, schemaRefs.comparison, validateComparisonSemantics);
}
