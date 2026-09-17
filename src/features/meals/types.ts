import type { Serving } from '@/features/library/types';
import type { MEAL_TYPES } from '@/features/meals/constants';
import type {
  DailyNutritionGoals,
  MacroGoalBreakdown,
} from '@/features/nutrition-goals/types';
import type { MacroTotals } from '@/types/nutrition';
import type { LocalDateKey } from '@/utils/date';
import type { LocalTime } from '@/utils/time';

export type MealType = (typeof MEAL_TYPES)[number];

export type MealInput = MacroTotals & {
  name: string;
  mealType: MealType;
  date: LocalDateKey;
  time: LocalTime | null;
};

export type Meal = MealInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type MealDateGroup = {
  dateKey: LocalDateKey;
  meals: Meal[];
  totals: MacroTotals;
};

export type DailyMealSummary = {
  dateKey: LocalDateKey;
  meals: Meal[];
  totals: MacroTotals;
  goals: DailyNutritionGoals;
  goalProgress: MacroGoalBreakdown;
};

export type LibraryEntrySourceType = 'food' | 'recipe';

export type AiEntryInputKind = 'text' | 'photo';

export type LibraryMealEntrySource = {
  sourceType: LibraryEntrySourceType;
  foodId: string | null;
  recipeId: string | null;
  savedMealId: string | null;
  logGroupId: string | null;
  sourceName: string;
  serving: Serving;
  baseNutrition: MacroTotals;
  amount: number;
  loggedAt: string;
};

export type AiMealEntrySource = {
  sourceType: 'ai';
  inputKind: AiEntryInputKind;
  mealTitle: string;
  itemName: string;
  amount: number;
  unit: Serving['unit'];
  matchedFoodId: string | null;
  logGroupId: string | null;
  loggedAt: string;
};

export type MealEntrySource = LibraryMealEntrySource | AiMealEntrySource;

export type NewLibraryEntrySource = Omit<LibraryMealEntrySource, 'loggedAt' | 'logGroupId'>;

export type NewAiEntrySource = Omit<AiMealEntrySource, 'loggedAt' | 'logGroupId'>;

export type NewDiaryEntry = {
  input: MealInput;
  source: NewLibraryEntrySource | NewAiEntrySource;
};

export type RecentFoodUsage = {
  foodId: string;
  lastLoggedAt: string;
  lastAmount: number;
  lastServingUnit: Serving['unit'];
};

export type CopyMealEntriesRequest = {
  sourceDate: LocalDateKey;
  destinationDate: LocalDateKey;
  mealType: MealType | null;
};
