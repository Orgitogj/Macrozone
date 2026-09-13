export const APP_LOCALE = 'en-US';

const calorieFormatter = new Intl.NumberFormat(APP_LOCALE, {
  maximumFractionDigits: 0,
});

const gramFormatter = new Intl.NumberFormat(APP_LOCALE, {
  maximumFractionDigits: 1,
});

export function formatCalories(value: number): string {
  return calorieFormatter.format(value);
}

export function formatGrams(value: number): string {
  return `${gramFormatter.format(value)}g`;
}
