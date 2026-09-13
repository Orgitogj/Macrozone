export const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat'] as const;

export type MacroKey = (typeof MACRO_KEYS)[number];

export type MacroTotals = Record<MacroKey, number>;
