/**
 * MongoDB Extended JSON helpers (standalone copy — no dependency on components/training).
 */

export function isMongoObjectId(value: unknown): value is { $oid: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    '$oid' in (value as object) &&
    typeof (value as { $oid: string }).$oid === 'string' &&
    /^[0-9a-fA-F]{24}$/.test((value as { $oid: string }).$oid)
  );
}

export function extractObjectId(id: unknown): string | null {
  if (id == null) return null;
  if (typeof id === 'string') return id;
  if (isMongoObjectId(id)) return id.$oid;
  if (typeof id === 'object' && id !== null && '$oid' in id && typeof (id as { $oid: string }).$oid === 'string') {
    return (id as { $oid: string }).$oid;
  }
  return String(id);
}

export function isValidMongoId(id: string | null | undefined): boolean {
  return !!(id && typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id));
}

export function normalizeObjectIds<T>(data: unknown): T {
  if (data === null || data === undefined) return data as T;
  if (isMongoObjectId(data)) return (data as { $oid: string }).$oid as T;
  if (Array.isArray(data)) return data.map((item) => normalizeObjectIds(item)) as T;
  if (typeof data === 'object') {
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(data as object)) {
      const value = (data as Record<string, unknown>)[key];
      if (key === '_id' || key === 'id' || key.endsWith('Id') || key.endsWith('Ids')) {
        if (key === 'id' && typeof value === 'number') {
          normalized[key] = value;
        } else if (Array.isArray(value)) {
          normalized[key] = value.map((item: unknown) => extractObjectId(item));
        } else {
          normalized[key] = extractObjectId(value);
        }
      } else {
        normalized[key] = normalizeObjectIds(value);
      }
    }
    return normalized as T;
  }
  return data as T;
}
