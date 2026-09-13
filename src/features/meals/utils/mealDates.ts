import type { Meal, MealDateGroup } from '@/features/meals/types';
import { calculateMacroTotals } from '@/features/meals/utils/macroTotals';
import { compareDateKeys, type LocalDateKey } from '@/utils/date';

export function compareMealsNewestFirst(a: Meal, b: Meal): number {
  const byTime = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (byTime !== 0) {
    return byTime;
  }
  if (a.id === b.id) {
    return 0;
  }
  return a.id < b.id ? 1 : -1;
}

export function filterMealsByDate(
  meals: readonly Meal[],
  dateKey: LocalDateKey,
): Meal[] {
  return meals
    .filter((meal) => meal.date === dateKey)
    .sort(compareMealsNewestFirst);
}

export function groupMealsByDate(meals: readonly Meal[]): MealDateGroup[] {
  const mealsByDate = new Map<LocalDateKey, Meal[]>();
  for (const meal of meals) {
    const group = mealsByDate.get(meal.date);
    if (group) {
      group.push(meal);
    } else {
      mealsByDate.set(meal.date, [meal]);
    }
  }

  return [...mealsByDate.entries()]
    .sort(([a], [b]) => compareDateKeys(b, a))
    .map(([dateKey, group]) => {
      const sortedMeals = group.sort(compareMealsNewestFirst);
      return {
        dateKey,
        meals: sortedMeals,
        totals: calculateMacroTotals(sortedMeals),
      };
    });
}
