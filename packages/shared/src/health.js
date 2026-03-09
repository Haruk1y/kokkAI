export const HEALTH_ROUTE = '/health';
export const HEALTH_STATUS = 'ok';

export function createHealthPayload({
  service,
  notes = [],
  seed = null,
  checkedAt = new Date().toISOString(),
} = {}) {
  return {
    status: HEALTH_STATUS,
    service,
    checkedAt,
    notes: Array.isArray(notes) ? notes : [],
    seed,
  };
}

export function validateHealthPayload(candidate) {
  const errors = [];

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return {
      ok: false,
      errors: ['payload must be an object'],
    };
  }

  if (candidate.status !== HEALTH_STATUS) {
    errors.push(`status must be "${HEALTH_STATUS}"`);
  }

  if (typeof candidate.service !== 'string' || candidate.service.length === 0) {
    errors.push('service must be a non-empty string');
  }

  if (
    typeof candidate.checkedAt !== 'string' ||
    Number.isNaN(Date.parse(candidate.checkedAt))
  ) {
    errors.push('checkedAt must be an ISO timestamp');
  }

  if (!Array.isArray(candidate.notes)) {
    errors.push('notes must be an array');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
