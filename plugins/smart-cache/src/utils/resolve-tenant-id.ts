function hasId(value: object): value is { id: unknown } {
  return 'id' in value;
}

/**
 * Extracts the tenant ID from a document.
 * Handles raw ID values (string/number) and populated relationship objects.
 * Returns `undefined` if `tenantField` is not set or the field is absent/null.
 */
export function resolveTenantId(
  doc: Record<string, unknown>,
  tenantField: string | undefined,
): string | undefined {
  if (!tenantField) return undefined;

  const value = doc[tenantField];
  if (value == null) return undefined;

  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object' && hasId(value)) {
    return String(value.id);
  }

  return undefined;
}
