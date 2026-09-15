import { SERVING_UNIT_LABELS, SERVING_UNITS } from '@/features/library/constants';
import type { Serving, ServingUnit } from '@/features/library/types';
import { APP_LOCALE } from '@/utils/format';

const amountFormatter = new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 2 });

export function isServingUnit(value: unknown): value is ServingUnit {
  return typeof value === 'string' && (SERVING_UNITS as readonly string[]).includes(value);
}

export function formatAmount(value: number): string {
  return amountFormatter.format(value);
}

export function formatServingAmount(amount: number, unit: ServingUnit): string {
  const labels = SERVING_UNIT_LABELS[unit];
  if (unit === 'g' || unit === 'ml' || unit === 'tbsp' || unit === 'tsp') {
    return `${formatAmount(amount)} ${labels.short}`;
  }
  return `${formatAmount(amount)} ${amount === 1 ? labels.singular : labels.plural}`;
}

export function formatServing(serving: Serving): string {
  return formatServingAmount(serving.amount, serving.unit);
}
