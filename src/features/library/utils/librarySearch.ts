export function normalizeLibraryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function toNameKey(name: string): string {
  return normalizeLibraryName(name).toLowerCase();
}

export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function buildContainsPattern(search: string | undefined): string | null {
  const key = toNameKey(search ?? '');
  return key === '' ? null : `%${escapeLikePattern(key)}%`;
}

export function matchesNameSearch(nameKey: string, search: string | undefined): boolean {
  const key = toNameKey(search ?? '');
  return key === '' || nameKey.includes(key);
}

export function compareCodePoints(a: string, b: string): number {
  const left = Array.from(a);
  const right = Array.from(b);
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index].codePointAt(0) ?? 0) - (right[index].codePointAt(0) ?? 0);
    if (difference !== 0) {
      return difference < 0 ? -1 : 1;
    }
  }
  return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
}

export function compareByNameThenId(a: { name: string; id: string }, b: { name: string; id: string }): number {
  return compareCodePoints(toNameKey(a.name), toNameKey(b.name)) || compareCodePoints(a.id, b.id);
}
