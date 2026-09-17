export const AI_CONTRACT_VERSION = 1;

export const AI_RATE_LIMIT_KEY_HEADER = 'x-macrozone-rate-limit-key';

export const AI_ANALYSIS_PATH = '/v1/meal-analysis';

export const AI_LIMITS = {
  minTextLength: 3,
  maxTextLength: 500,
  maxItems: 20,
  maxTitleLength: 80,
  maxNoteLength: 200,
  maxWarnings: 8,
  maxPhotoNoteLength: 300,
  maxQuestionLength: 200,
  maxWarningLength: 200,
  maxResponseCharacters: 200_000,
  maxImageBytes: 1_100_000,
  requestTimeoutMs: 60_000,
  totalsTolerance: 0.011,
} as const;

export const AI_PHOTO_ATTEMPTS = [
  { maxDimension: 1280, compress: 0.7 },
  { maxDimension: 1024, compress: 0.55 },
  { maxDimension: 768, compress: 0.45 },
] as const;

export const AI_SOURCE_PHOTO_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp'] as const;

export const AI_PHOTO_DISCLOSURE_VERSION = 1;

export const AI_PREFERENCES_STORAGE_KEY = 'ai_meal_preferences';

export const AI_ESTIMATE_NOTICE = 'AI estimates can be inaccurate. Review the portions and nutrition before saving.';

export const AI_PHOTO_CAVEAT = 'Photo estimates are often less accurate because portions and hidden ingredients are hard to judge.';

export const AI_PHOTO_DISCLOSURE = {
  title: 'Send Photo for Analysis?',
  message:
    'The photo you selected will be sent to the AI service used by MacroZone to estimate its nutrition. MacroZone does not save the photo. The AI provider’s data policy applies to the request.',
  confirmLabel: 'Continue',
} as const;

export const AI_TEXT_EXAMPLES = ['200 g grilled chicken with 150 g rice', 'two eggs, one slice of bread and a banana'] as const;

export const AI_UNCERTAINTY_LABELS = {
  portion_size: 'portion size',
  overlapping_foods: 'overlapping foods',
  hidden_ingredients: 'hidden ingredients',
  cooking_method: 'cooking method',
  added_fat_or_sauce: 'oil, dressing, or sauce',
  photo_quality: 'photo quality',
} as const;

export const AI_PHOTO_NOTE_EXAMPLE = 'For example: grilled, no oil, half a portion of rice';

export const AI_CONFIDENCE_LABELS = { low: 'Low', medium: 'Medium', high: 'High' } as const;

export const AI_INPUT_KIND_LABELS = { text: 'Describe', photo: 'Photo' } as const;
