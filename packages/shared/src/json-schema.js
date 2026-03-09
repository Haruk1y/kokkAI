function decodePointerSegment(segment) {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~');
}

function resolveJsonPointer(document, pointer) {
  if (pointer === '#') {
    return document;
  }

  if (!pointer.startsWith('#/')) {
    throw new Error(`Only local JSON pointers are supported: ${pointer}`);
  }

  const segments = pointer
    .slice(2)
    .split('/')
    .map((segment) => decodePointerSegment(segment));

  let current = document;

  for (const segment of segments) {
    if (current === null || typeof current !== 'object' || !(segment in current)) {
      throw new Error(`Could not resolve JSON pointer: ${pointer}`);
    }

    current = current[segment];
  }

  return current;
}

function deepEqual(left, right) {
  if (Object.is(left, right)) {
    return true;
  }

  if (typeof left !== typeof right || left === null || right === null) {
    return false;
  }

  if (Array.isArray(left)) {
    return (
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => deepEqual(value, right[index]))
    );
  }

  if (typeof left === 'object') {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => deepEqual(left[key], right[key]))
    );
  }

  return false;
}

function matchesType(value, type) {
  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'null':
      return value === null;
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    default:
      throw new Error(`Unsupported JSON Schema type: ${type}`);
  }
}

function formatMatches(value, format) {
  if (typeof value !== 'string') {
    return false;
  }

  switch (format) {
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/u.test(value) && !Number.isNaN(Date.parse(value));
    case 'date-time':
      return !Number.isNaN(Date.parse(value));
    case 'uri': {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }
    default:
      return true;
  }
}

function joinPath(parentPath, segment) {
  return parentPath === '$' ? `$.${segment}` : `${parentPath}.${segment}`;
}

function validateNode(value, schema, rootSchema, path, errors) {
  if (schema.$ref) {
    const resolvedSchema = resolveJsonPointer(rootSchema, schema.$ref);
    validateNode(value, resolvedSchema, rootSchema, path, errors);
    return;
  }

  if (schema.oneOf) {
    let matchCount = 0;
    let lastBranchErrors = [];

    for (const candidateSchema of schema.oneOf) {
      const branchErrors = [];
      validateNode(value, candidateSchema, rootSchema, path, branchErrors);

      if (branchErrors.length === 0) {
        matchCount += 1;
        continue;
      }

      lastBranchErrors = branchErrors;
    }

    if (matchCount !== 1) {
      errors.push(
        matchCount === 0
          ? `${path} must match exactly one schema in oneOf`
          : `${path} matched multiple schemas in oneOf`,
      );

      if (matchCount === 0 && lastBranchErrors.length > 0) {
        errors.push(...lastBranchErrors);
      }
    }

    return;
  }

  if ('const' in schema && !deepEqual(value, schema.const)) {
    errors.push(`${path} must equal ${JSON.stringify(schema.const)}`);
    return;
  }

  if (schema.enum && !schema.enum.some((item) => deepEqual(item, value))) {
    errors.push(`${path} must be one of ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}`);
    return;
  }

  if (schema.type) {
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];

    if (!expectedTypes.some((type) => matchesType(value, type))) {
      errors.push(`${path} must be ${expectedTypes.join(' or ')}`);
      return;
    }
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path} must have length >= ${schema.minLength}`);
    }

    if (schema.format && !formatMatches(value, schema.format)) {
      errors.push(`${path} must match format ${schema.format}`);
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path} must be >= ${schema.minimum}`);
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path} must be <= ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path} must contain at least ${schema.minItems} item(s)`);
    }

    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path} must contain at most ${schema.maxItems} item(s)`);
    }

    if (schema.items) {
      value.forEach((item, index) => {
        validateNode(item, schema.items, rootSchema, `${path}[${index}]`, errors);
      });
    }
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const properties = schema.properties ?? {};
    const required = schema.required ?? [];

    for (const propertyName of required) {
      if (!(propertyName in value)) {
        errors.push(`${path} is missing required property "${propertyName}"`);
      }
    }

    if (schema.additionalProperties === false) {
      for (const propertyName of Object.keys(value)) {
        if (!(propertyName in properties)) {
          errors.push(`${path} must not include unknown property "${propertyName}"`);
        }
      }
    }

    for (const [propertyName, propertySchema] of Object.entries(properties)) {
      if (propertyName in value) {
        validateNode(value[propertyName], propertySchema, rootSchema, joinPath(path, propertyName), errors);
      }
    }
  }
}

export function validateJsonSchema(candidate, schema, rootSchema = schema) {
  const errors = [];

  validateNode(candidate, schema, rootSchema, '$', errors);

  return {
    ok: errors.length === 0,
    errors,
  };
}
