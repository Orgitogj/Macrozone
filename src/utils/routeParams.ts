export function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === undefined || candidate === '' ? undefined : candidate;
}
