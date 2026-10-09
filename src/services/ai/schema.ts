/** Keep the generation grammar small; the full domain schema still validates every result. */
export function generationSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(generationSchema);
  if (!value || typeof value !== 'object') return value;
  const validationOnly = new Set(['$schema', 'additionalProperties', 'minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems', 'default']);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !validationOnly.has(key)).map(([key, item]) => [key, generationSchema(item)]));
}
