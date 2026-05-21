export function unwrapMongoAggregationBatch(result) {
  if (Array.isArray(result)) {
    return result;
  }

  const batch = result?.cursor?.firstBatch;

  if (Array.isArray(batch)) {
    return batch;
  }

  return [];
}

export function normalizeMongoValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeMongoValue);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object') {
    if (typeof value.$oid === 'string' && Object.keys(value).length === 1) {
      return value.$oid;
    }

    if (typeof value.$date === 'string' && Object.keys(value).length === 1) {
      return new Date(value.$date).toISOString();
    }

    if (
      typeof value.$date === 'object' &&
      value.$date !== null &&
      typeof value.$date.$numberLong === 'string' &&
      Object.keys(value).length === 1
    ) {
      return new Date(Number(value.$date.$numberLong)).toISOString();
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        normalizeMongoValue(entryValue),
      ]),
    );
  }

  return value;
}

export function normalizeMongoResponse(value) {
  return normalizeMongoValue(value);
}
