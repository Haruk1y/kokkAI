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
export const MODE_CONFIGURATION_EXPECTATIONS = Object.freeze({
  committee_institution_replay: Object.freeze({
    persona_source: 'institutional_roles',
    party_bias: 'preserved',
    seat_count_influence: 'preserved',
  }),
  committee_party_bias_removed: Object.freeze({
    persona_source: 'policy_tradeoff_roles',
    party_bias: 'removed',
    seat_count_influence: 'removed',
  }),
  citizens_assembly: Object.freeze({
    persona_source: 'citizen_stakeholders',
    party_bias: 'not_applicable',
    seat_count_influence: 'not_applicable',
  }),
});

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
const MIN_PERSONA_GOAL_COUNT = 2;
const MIN_PERSONA_CONSTRAINT_COUNT = 2;
const MIN_CITIZEN_PERSONA_COUNT = 3;
const REQUIRED_CITIZEN_DEMOGRAPHIC_FIELDS = Object.freeze([
  'age_range',
  'region',
  'occupation',
  'income_band',
  'household',
  'health_context',
  'mobility_context',
]);
const CITIZEN_DIVERSITY_FIELDS = Object.freeze([
  'age_range',
  'region',
  'occupation',
  'income_band',
  'household',
]);

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

function validateMinimumListLength(values, minimum, path, errors, label) {
  const size = Array.isArray(values) ? values.length : 0;

  if (size < minimum) {
    errors.push(`${path} must include at least ${minimum} ${label}`);
  }
}

function validateModeConfiguration(modeDefinition, path, errors) {
  const expected = MODE_CONFIGURATION_EXPECTATIONS[modeDefinition.mode];
  const configuration =
    modeDefinition.configuration && typeof modeDefinition.configuration === 'object'
      ? modeDefinition.configuration
      : null;

  if (!expected) {
    errors.push(`${path}.mode references unsupported mode "${modeDefinition.mode}"`);
    return;
  }

  if (!configuration) {
    errors.push(`${path}.configuration is required`);
    return;
  }

  Object.entries(expected).forEach(([key, value]) => {
    if (configuration[key] !== value) {
      errors.push(
        `${path}.configuration.${key} must be "${value}" for mode "${modeDefinition.mode}"`,
      );
    }
  });

  validateMinimumListLength(
    configuration.primary_objectives,
    2,
    `${path}.configuration.primary_objectives`,
    errors,
    'primary objectives',
  );
  validateMinimumListLength(
    configuration.evidence_lens,
    2,
    `${path}.configuration.evidence_lens`,
    errors,
    'evidence lenses',
  );
}

function validateCitizenAssemblyDiversity(modeDefinition, path, errors) {
  const personas = Array.isArray(modeDefinition.personas) ? modeDefinition.personas : [];

  validateMinimumListLength(
    personas,
    MIN_CITIZEN_PERSONA_COUNT,
    `${path}.personas`,
    errors,
    'citizen personas',
  );

  const diversityValues = new Map(
    CITIZEN_DIVERSITY_FIELDS.map((field) => [field, new Set()]),
  );

  personas.forEach((persona, personaIndex) => {
    const personaPath = `${path}.personas[${personaIndex}]`;

    if (!persona.bias_flags.includes('citizen_lived_experience')) {
      errors.push(`${personaPath}.bias_flags must include "citizen_lived_experience"`);
    }

    if (!persona.demographics) {
      errors.push(`${personaPath}.demographics is required for citizens_assembly personas`);
      return;
    }

    REQUIRED_CITIZEN_DEMOGRAPHIC_FIELDS.forEach((field) => {
      const value = persona.demographics[field];

      if (!value) {
        errors.push(`${personaPath}.demographics.${field} is required`);
        return;
      }

      if (diversityValues.has(field)) {
        diversityValues.get(field).add(value);
      }
    });
  });

  diversityValues.forEach((values, field) => {
    if (values.size < 2) {
      errors.push(
        `${path}.personas must express stakeholder diversity across demographics.${field}`,
      );
    }
  });
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
  const modeDefinitions = Array.isArray(registry.modes) ? registry.modes : [];
  const modes = modeDefinitions.map((definition) => definition.mode);
  const personaIds = modeDefinitions.flatMap((definition) =>
    Array.isArray(definition.personas)
      ? definition.personas.map((persona) => persona.id)
      : [],
  );

  validateUniqueStrings(modes, '$.modes', errors);
  validateUniqueStrings(personaIds, '$.modes[*].personas', errors);

  if (modes.length !== DELIBERATION_MODES.length || !DELIBERATION_MODES.every((mode) => modes.includes(mode))) {
    errors.push('$.modes must cover all three MVP deliberation modes exactly once');
  }

  modeDefinitions.forEach((definition, definitionIndex) => {
    const definitionPath = `$.modes[${definitionIndex}]`;
    const personas = Array.isArray(definition.personas) ? definition.personas : [];

    validateModeConfiguration(definition, definitionPath, errors);

    personas.forEach((persona, personaIndex) => {
      validateMinimumListLength(
        persona.goals,
        MIN_PERSONA_GOAL_COUNT,
        `${definitionPath}.personas[${personaIndex}].goals`,
        errors,
        'goals',
      );
      validateMinimumListLength(
        persona.constraints,
        MIN_PERSONA_CONSTRAINT_COUNT,
        `${definitionPath}.personas[${personaIndex}].constraints`,
        errors,
        'constraints',
      );
    });

    if (definition.mode === 'citizens_assembly') {
      validateCitizenAssemblyDiversity(definition, definitionPath, errors);
    }
  });

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
