import type { Food, ServingUnit } from '@/features/library/types';
import { compareByNameThenId, toNameKey } from '@/features/library/utils/librarySearch';

export type LocalFoodMatch = {
  match: Food | null;
  suggestions: Food[];
};

const MAX_SUGGESTIONS = 3;

function singularizeToken(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
}

export function normalizeForMatching(name: string): string {
  return toNameKey(name)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map(singularizeToken)
    .join(' ');
}

export function buildMatchSearchTerm(name: string): string {
  return normalizeForMatching(name).split(' ').sort((a, b) => b.length - a.length)[0] ?? '';
}

export function matchLocalFood(itemName: string, itemUnit: ServingUnit, foods: readonly Food[]): LocalFoodMatch {
  const exactKey = toNameKey(itemName);
  const looseKey = normalizeForMatching(itemName);
  const sorted = [...new Map(foods.map((food) => [food.id, food])).values()].sort(compareByNameThenId);
  const exact = sorted.filter((food) => toNameKey(food.name) === exactKey);
  if (exact.length === 1 && exact[0].serving.unit === itemUnit) {
    return { match: exact[0], suggestions: [] };
  }
  const loose = sorted.filter((food) => !exact.includes(food) && looseKey.length > 0 && normalizeForMatching(food.name) === looseKey);
  return { match: null, suggestions: [...exact, ...loose].slice(0, MAX_SUGGESTIONS) };
}
