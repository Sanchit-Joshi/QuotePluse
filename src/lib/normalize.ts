/**
 * Converts empty-string values to `undefined` for the given keys. Used
 * server-side, right before persistence, so optional free-text form fields
 * (GSTIN, phone, email, ...) that RHF/Zod validate as `string | undefined`
 * without a transform (see validators/common.schema.ts) don't get written
 * to the database as empty strings.
 */
export function emptyToUndefined<T extends Record<string, unknown>>(
  obj: T,
  keys: readonly (keyof T)[],
): T {
  const result = { ...obj };
  for (const key of keys) {
    if (result[key] === "") {
      result[key] = undefined as T[keyof T];
    }
  }
  return result;
}
