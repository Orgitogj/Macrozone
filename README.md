# MacroZone

MacroZone is a mobile meal and macronutrient tracker built with Expo and React Native. It aims to become an offline-first nutrition and fitness tracking app built around one core workflow:

```text
Select a date → log food → view daily macros → track progress
```

The app is currently an early MVP. All data stays on the device, except a meal description or photo that you explicitly send for an AI estimate (see [AI meal estimates](#ai-meal-estimates)).

## Current features

- **Onboarding (new users):** on first launch, choose to calculate personalized targets, enter targets manually, or skip for now.
  - The calculator asks for units, the sex used by the formula (female, male, or not specified), age, height, weight, activity level, and a goal (lose, maintain, or gain) with a weekly rate.
  - Before saving, it shows BMR, TDEE, the calorie target, macros, and an explanation of the formulas.
  - Everything is presented as an estimate, not medical advice.
- **Navigation:** three tabs (Home, Add, Diary). The tab bar hides while the keyboard is open.
- **Nutrition Goals, reminders, and appearance:** open from the options button in the Home header to review targets and saved details, recalculate them, edit them manually, open meal reminders, or choose the theme.
- **Home (daily dashboard):** move to the previous or next day, or jump back to today. Future dates are not selectable.
  - A calorie card shows calories eaten against the estimated target, with a progress bar and one status: "left", "Target reached", or "over". Protein, carbs, and fat follow as compact progress cards. Every card has a text equivalent for screen readers, and status is never shown by color alone.
  - Meals are grouped into Breakfast, Lunch, Dinner, and Snacks, each with its calorie subtotal and an "Add" button that opens the Add screen preset to that meal type and the selected date. Empty sections show a short hint instead of a large empty state.
  - "Clear Day" deletes the selected day's meals after confirmation. On a past day, "Copy to Today" copies that day's meals to today after a confirmation that shows the source, destination, and number of meals.
  - Users who already have meals but have not set goals see a dismissible "Personalize your goals" suggestion.
  - Copy and Share are secondary actions at the bottom of the day.
  - If refreshing fails after data has loaded, the data stays visible with a warning and a "Try again" button.
- **Themes:** System (default), Light, or Dark, chosen on the Nutrition Goals screen and remembered on the device. System follows the device setting and falls back to dark when the device does not report one. The status bar, navigation bars, tab bar, iOS picker sheet, web inputs, and the root background follow the active theme.
- **Add (logging hub):** the Add tab, Home's contextual Add buttons, and reminder taps open one screen that shows where food will be added (date and meal type) and lets you choose from Recent, Favorites, Foods, Saved Meals, Recipes, Barcode, AI, or Manual entry.
  - **Recent** lists the foods you logged most recently from your library, newest first, each once, with the last amount you used.
  - **Favorites** and **Foods** list your food library with local, case-insensitive search. Tap the star on a food to favorite or unfavorite it.
  - Tap a food to choose an amount in its serving unit (with ½×, 1×, and 2× serving shortcuts), review the calculated nutrition, adjust the date and meal type, and add it.
  - **Saved Meals** are reusable groups of foods with amounts. Adding one creates one diary entry per food, all at once or not at all.
  - **Recipes** are built from foods with a total number of servings. They show whole-recipe and per-serving nutrition, and you log them by the serving.
  - Foods, saved meals, and recipes can be created, edited, duplicated (saved meals and recipes), and deleted after confirmation. Editing or deleting them never changes meals you already logged.
  - **AI** opens an estimate from a meal description or a photo. It is available only when the app is built with an AI endpoint; otherwise it says so and offers manual logging.
- **Barcode lookup (packaged food):** scan a retail barcode with the camera (Android and iOS) or type its number, look the product up on Open Food Facts, review the name, nutrition basis (per 100 g, per 100 ml, or per serving), nutrition, amount, date, and meal type, then tap Add to Diary.
  - Missing nutrition is never filled in for you: it is shown as missing and must be entered from the package before saving. Community data is always labeled as coming from Open Food Facts.
  - Optionally save the reviewed product to My Foods. If the barcode is already linked to one of your foods, you choose to keep it or update it (after confirmation).
  - Products you looked up are kept on the device, so a recent lookup works offline, and older saved data is shown with a clear warning when a refresh fails.
- **AI meal estimates:** describe a meal or take or choose a photo, tap Analyze, and review the estimate before anything is saved.
  - The review lists each food with its amount, unit, calories, and macros. You can edit the title and every item, remove items, add items, link an item to one of your foods or unlink it, and change the date and meal type. Totals are recalculated by the app as you edit.
  - The screen always states that AI estimates can be inaccurate and are not medical advice, and shows the overall confidence and any warnings. Photo estimates carry an extra caution.
  - "Add to Diary" saves one diary entry per reviewed item, all at once or not at all. Analysis can be cancelled, retried, or abandoned for manual logging at any point.
- **Manual entry:** log a meal with a name, meal type (breakfast, lunch, dinner, snack), date (today or earlier), an optional time, calories, and optional protein, carbs, and fat.
  - The date is chosen with a native date picker (future dates are blocked) or with the previous/next-day and Today controls. The optional time uses a native time picker and can be cleared.
  - On Android the pickers open as system dialogs. On iOS they open in a bottom sheet with Cancel and Done. On web they use the browser's date and time inputs. Saving is disabled while a picker is open.
  - Fields are validated inline. Decimals accept `.` or `,`, negative values are rejected, and limits are 10,000 kcal and 1,000 g per macro.
  - While saving, the button shows progress and ignores repeated taps. If saving fails, the form keeps what you entered.
  - After saving, Home opens on the meal's date without adding duplicate navigation history.
- **Meal details:** tap a meal to edit any field (including moving it to another meal type or date), duplicate it into a new meal dated today, or delete it. Meals added from the library show what they were added from; changing their name or nutrition turns them into manual entries.
- **Deleting:** every meal row has a visible delete button. Long-pressing a row and the screen-reader "Delete" action are shortcuts. Every deletion asks for confirmation.
- **Diary (history):** every logged meal, grouped by local date (newest first) with daily calorie totals and meal counts, in a virtualized list. Each day has its own "Clear Day" action. "Delete all history" is a low-emphasis action at the end of the list and asks for a separate confirmation.
- **Copy / Share summary:** copy or share a plain-text summary of the selected day, including consumed, goal, and remaining or exceeded values for each macro.
- **Local persistence:** on Android and iOS, meals and the food library are stored in an on-device SQLite database. On first launch after updating, meals saved by earlier versions are copied from AsyncStorage automatically. On web, meals and the food library stay in AsyncStorage (browser storage). Everything works offline.
- **Meal reminders (Android and iOS):** open Meal reminders from the Nutrition Goals screen to set a daily local reminder for breakfast, lunch, dinner, and snacks.
  - Each reminder has its own switch, time picker, and status (off, on, on without notification permission, or not scheduled yet), with a retry when something fails. All reminders start off, and nothing is scheduled until you turn one on.
  - MacroZone asks for notification permission only when you turn on a reminder. If notifications are blocked, the reminder stays off and the screen explains how to allow notifications in system settings.
  - Tapping a reminder opens Add Meal for today with that meal type selected, whether the app was open, in the background, or closed.
  - On web, the screen explains that reminders are available in the Android and iOS apps.

## Technology stack

| Area          | Technology                                                        |
| ------------- | ----------------------------------------------------------------- |
| Framework     | [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/), React Native 0.81, React 19.1 |
| Navigation    | Expo Router 6 (file-based routing, typed routes)                  |
| Language      | TypeScript 5.9 (`strict`)                                         |
| Persistence   | `expo-sqlite` (Android, iOS); `@react-native-async-storage/async-storage` (web meals, legacy data, small preferences) |
| Device APIs   | `expo-notifications`, `expo-haptics`, `expo-clipboard`, `expo-crypto`, `expo-image-picker`, `expo-image-manipulator`, `expo-file-system`, `expo-camera` |
| AI service    | Standalone Node.js service in `server/` (no framework) using the official `@anthropic-ai/sdk` |
| Pickers       | `@react-native-community/datetimepicker` (Android and iOS; web uses HTML inputs) |
| Tooling       | ESLint 9 (`eslint-config-expo`), Expo Doctor, React Compiler (experimental) |
| Testing       | Jest 29 with `jest-expo`                                          |

The New Architecture is enabled (`newArchEnabled: true`).

## Local setup

Prerequisites:

- Node.js 22.18 or later (local database tests use Node's built-in `node:sqlite`, and the AI service runs TypeScript directly with Node's type stripping) and npm
- The [Expo Go](https://expo.dev/go) app on a device, or an Android emulator / iOS simulator

```bash
git clone https://github.com/Orgitogj/Macrozone.git
cd Macrozone
npm ci
npm start
```

In the Expo CLI, press `a` for Android, `i` for iOS, or `w` for web, or scan the QR code with Expo Go.

> Note: Expo Go on Android does not support remote push notifications on SDK 53+. MacroZone only schedules local notifications, which Expo Go still supports, but notification channels, permissions, and tap handling are most reliable to verify in a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

## Available commands

| Command             | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `npm start`         | Start the Expo development server                        |
| `npm run android`   | Start and open on Android                                |
| `npm run ios`       | Start and open on iOS                                    |
| `npm run web`       | Start and open in a browser                              |
| `npm run lint`      | Run ESLint through `expo lint`                           |
| `npm run typecheck` | Run the TypeScript compiler without emitting files       |
| `npm run typecheck:server` | Type-check the AI service in `server/` (run `npm run server:install` first) |
| `npm run server:install` | Install the AI service dependencies from its lockfile |
| `npm run server:start` | Start the AI service (requires the environment variables below) |
| `npm test`          | Run unit tests once                                      |
| `npm run test:watch`| Run unit tests in watch mode                             |
| `npm run check`     | Run lint, app and server typechecks, and tests           |
| `npm run doctor`    | Run Expo Doctor (checks config and dependency versions)  |

When adding or updating Expo-related packages, use `npx expo install <package>` so that versions stay compatible with the installed SDK.

## Project structure

```text
src/
  app/                        Expo Router routes (thin: they render feature screens)
    _layout.tsx               Root stack inside the theme provider (tabs plus detail screens)
    (tabs)/                   Home (index.tsx), Add (add.tsx), Diary (diary.tsx)
    meal/[id].tsx             Edit meal
    meal/new.tsx              Add hub preset from Home or a reminder (?date=&mealType=), manual entry (&mode=manual),
                              or a duplicate (?duplicateOf=<id>)
    ai-meal.tsx               AI estimate and review (?date=&mealType=&input=text|photo)
    barcode.tsx               Barcode scan or entry, product review, and logging (?date=&mealType=&mode=scan|manual)
    food/, saved-meal/,       new.tsx (create), [id]/index.tsx (details and logging), [id]/edit.tsx (edit);
    recipe/                   routes carry the diary destination (?date=&mealType=)
    onboarding.tsx            First-run goal setup (shown only while the onboarding gate requires it)
    goals/                    Nutrition Goals overview, calculator (calculate.tsx), manual editor (edit.tsx)
  features/
    meals/
      components/             Presentational meal UI (form, calorie and macro cards, meal-type sections,
                              meal rows, history list, copy/share actions)
      hooks/                  useMeals, useMeal, useMealForm, useMealNavigation, useAddHubRows, useMealEntrySource
      screens/                Home, MealHistory (Diary), AddFood (logging hub), CreateMeal (manual), EditMeal
      services/               mealActions (load, save, confirm-and-delete), diaryLogActions (log food, saved meal,
                              recipe; copy day)
      repositories/           MealRepository and DiaryLogRepository interfaces with SQLite and AsyncStorage
                              implementations, row mapping, legacy AsyncStorage import, get*Repository(.web).ts
      utils/                  Pure logic: totals, date filtering/grouping, meal-type sections, new-meal route
                              params, summaries, record normalization, diary entries built from library items,
                              entry snapshots
      validation/mealForm.ts  Form values, validation rules and messages
      types.ts, constants.ts
      index.ts                Public API of the feature
    nutrition-goals/
      components/             Calculator steps, review breakdown, targets editor, goals overview, personalize card
      hooks/                  useNutritionPlan, useGoalCalculatorFlow, useGoalTargetsForm, useGoalsNavigation
      repositories/           NutritionPlanRepository with SQLite and AsyncStorage implementations
      screens/                NutritionGoals, GoalCalculator, ManualGoals
      services/               Use cases: load plan, save calculated/adjusted/manual goals, skip setup
      utils/                  Pure logic: goal calculator, progress descriptions, calculator step reducer
      validation/             Manual target validation and warnings
    profile/                  Body profile types, unit conversion, profile form validation
    onboarding/               Onboarding gate (provider and pure decision) and onboarding screen
    library/
      components/             Library rows, food form fields, amount field, portion list editor, food picker,
                              nutrition preview, favorite button
      hooks/                  useLibraryResource, useLibraryNavigation, useLibraryRouteParams, usePortionDrafts
      repositories/           FoodRepository, SavedMealRepository, RecipeRepository interfaces; SQLite and
                              AsyncStorage implementations; getLibraryRepositories(.web).ts
      screens/                Food, saved meal, and recipe details and forms
      services/               Library use cases (search, recents, save, favorite, duplicate, delete)
      utils/                  Pure logic: nutrition math and rounding, search normalization and escaping,
                              record parsing, serving formatting, route parameters, row text
      validation/             Food, amount, portion, saved meal, and recipe validation
    reminders/
      components/             Reminder card, permission notice, entry card
      hooks/                  useReminderSettings (screen state), useReminderLifecycle (tap handling, reconciliation),
                              useReminderNavigation
      repositories/           ReminderRepository interface and AsyncStorage implementation
      screens/                Reminders
      services/               Reminder use cases (enable, disable, change time, reconcile), notification platform
                              interfaces, expo-notifications adapter, getReminderPlatform(.web).ts
      utils/                  Pure logic: settings model and parsing, notification payloads, permission mapping,
                              reconciliation planning, tap-to-route mapping, status text
    settings/                 Appearance (theme) settings
    barcode/
      adapters/               Camera permission and external link adapter
      components/             Scanner panel, manual barcode form, product review form, lookup notices,
                              product image, Open Food Facts attribution, Add hub entry panel
      hooks/                  useBarcodeFlow (lookup, review, save), useBarcodeScanner (permission, scan lock,
                              focus and background pause), useBarcodeNavigation
      providers/              OnlineFoodProvider interface and the Open Food Facts adapter (config, request,
                              response parsing, rate-limited transport)
      repositories/           Product cache, barcode-to-food links, and the all-or-nothing barcode log
                              (SQLite transaction and compensated AsyncStorage write), getters (.web)
      screens/                Barcode
      services/               Product lookup with cache policy, barcode logging and My Foods saving
      utils/                  Pure logic: GTIN validation and normalization, nutrition bases, review draft,
                              cache payloads and pruning, flow reducer, request rate limiter, accessibility labels,
                              save operation IDs and the Update My Food confirmation choice
    ai-meal/
      adapters/               AI endpoint client (the only network call in the app) and photo picker/processing adapter
                              that tracks and deletes only the processed files it creates
      components/             Text composer, photo picker, analysis progress, error notice, estimate notice,
                              review item card, Add hub entry panel
      config/                 Endpoint URL resolution (HTTPS only, local HTTP in development)
      hooks/                  useAiMealFlow (single-flight analysis and saving, cancellation, stale protection),
                              useAiMealNavigation
      repositories/           AI preferences (rate-limit key, photo disclosure acknowledgement) in AsyncStorage
      screens/                AiMeal (compose, analyze, review, save)
      services/               AI meal use cases (analyze, build review with local matching, save)
      utils/                  Pure logic: flow reducer, review draft math, local food matching, error messages, routes,
                              owned temporary files, photo session cleanup
      validation/             Text, photo, and response validation
  theme/                      Design system: semantic light/dark palettes, spacing, radii, typography,
                              sizes, theme preference (resolution, storage), AppThemeProvider and hooks
  components/
    layout/                   Screen (safe areas, max width) and ScrollScreen (scrolling, keyboard-aware)
    ui/                       Shared UI: AppText, AppCard, AppButton, TextButton, IconButton, AppTextInput,
                              FormField, SegmentedControl, ChoiceList, DateNavigator, DateTimePickerField
                              (.tsx native, .web.tsx web), ProgressBar, ScreenHeader, SectionHeader,
                              KeyValueRow, NoticeCard, StepHeader, AppSwitch, SearchField, ChipGroup,
                              loading/empty/error states
  hooks/                      Cross-feature hooks: useSelectedDate, useTodayDateKey, useDebouncedValue
  storage/database/           SQLite access: SqlDatabase interface, connection setup (foreign keys, serialized
                              transactions), open/prepare, ordered schema migrations, shared write queue
  types/nutrition.ts          Shared nutrition types (MacroTotals)
  utils/                      Pure shared utilities: dates, times, date/time input conversion, number input, formatting, ids,
                              single-flight guard, serial queue, checksum, route params, async loading state,
                              device time zone, confirmation dialog
jest.environment.js           Jest environment: pins/switches timezones, provides in-memory SQLite for tests
assets/images/                App icon, adaptive icons, splash image, favicon
server/                       AI meal analysis service (never bundled into the app)
  src/main.ts                 Startup: configuration, provider, rate limiter, HTTP server, shutdown
  src/config.ts               Environment validation (fails fast, logs variable names only)
  src/contract.ts             Versioned request/response contract, error codes, limits
  src/app/handleRequest.ts    Routing, CORS, rate-limit key, limits, concurrency, budget, validation, deadlines, errors
  src/http/                   node:http adapter (body limit, disconnect cancellation) and trusted-proxy client IP
  src/providers/              Provider interface, model allowlist, retry policy, Anthropic adapter, prompt and schema
  src/validation/             Request validation (text, image type and size) and model output normalization
  src/security/, src/logging/ In-memory usage store (rate limits, daily budget), concurrency limit; JSON logger
```

Import paths use the `@/` alias, which maps to `src/` (see `tsconfig.json`). For example, `import { HomeScreen } from '@/features/meals'`. Use `./` only for files in the same folder. Route files and other features import a feature through its `index.ts`.

## Design system

- **Semantic colors only.** Components read colors from the active theme (`useTheme()` or `useThemedStyles(createStyles)`). Raw color values exist only in `src/theme/palettes.ts`. Both palettes define the same tokens, such as `background`, `surface`, `textPrimary`, `primary`, `danger`, and one accent per nutrient.
- **Tokens.** Spacing, radii, border widths, typography variants, icon sizes, touch targets (at least 44 pt), and layout limits live in `src/theme/tokens.ts`.
- **Contrast.** Primary and secondary text meet WCAG AA (4.5:1) on backgrounds and surfaces in both themes, and accent colors reach at least 3:1. Progress states are always also shown as text.
- **Text scaling.** Text respects the system font size up to a capped multiplier, and card rows wrap instead of truncating.
- **Theme preference.** Stored in AsyncStorage under `theme_preference` (`system`, `light`, or `dark`). A missing or invalid value means `system`. The preference is loaded before the first screen renders, so the app does not flash the wrong theme.
- **Layout.** `Screen` and `ScrollScreen` apply safe-area insets per edge and limit content to a readable width on tablets and web. `ScrollScreen` keeps inputs visible above the keyboard (iOS content insets, Android `KeyboardAvoidingView` with edge-to-edge), and taps on buttons work while the keyboard is open.

## Local data model

### Dates and meal fields

- **Local calendar days.** Every meal belongs to a local calendar day, stored as a `YYYY-MM-DD` key (`LocalDateKey`) that is computed from the device's local time. Days are never derived from the UTC ISO string, which would put late-evening or early-morning meals on the wrong day.
- **Selected day in the URL.** Home keeps the selected day in its `date` route parameter (`/?date=2026-09-13`). Missing, invalid, or future values fall back to today.
- **Meal fields.** Each meal has:
  - `id`: a UUID v4 from `expo-crypto`'s cryptographically secure generator. If an ID cannot be generated, the save fails and nothing is written.
  - `name`, `calories`, `protein`, `carbs`, `fat`.
  - `mealType`, `date`, and an optional `time` (`HH:MM`, local 24-hour).
  - `createdAt` and `updatedAt`.

### Persistence architecture

Screens, hooks, and components never touch a database. They use services that depend only on repository interfaces:

```text
Screens → hooks/services → MealRepository, DiaryLogRepository,
                           FoodRepository, SavedMealRepository, RecipeRepository
                         → SQLite (Android, iOS) | AsyncStorage (web)
```

Each repository getter is split into a native file (SQLite) and a `.web.ts` file (AsyncStorage), so web bundles never include SQLite. `expo-sqlite` web support is still in alpha and needs special hosting headers.

### Connection setup and foreign keys

- `getDatabase()` opens the database and immediately runs `PRAGMA foreign_keys = ON`, then reads the setting back and fails with a clear initialization error if it is not `1`. This happens before `prepareDatabase()`, migrations, the legacy import, or any transaction. SQLite's default is not relied on.
- `prepareDatabase()` verifies the setting again before changing anything, sets WAL mode, migrates, and then runs `PRAGMA foreign_key_check`. Any reported violation is logged in development only; no data is repaired or deleted.
- Transactions run on that same foreign-key-enabled connection (`BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`), and a queue keeps other statements from interleaving with them. `expo-sqlite`'s own `withExclusiveTransactionAsync` is not used, because it opens a separate connection on which the pragma has not been set.
- Repositories also clear or delete references explicitly inside their transactions. This mirrors the web implementation and is defense in depth; SQLite enforcement remains the final protection.

### SQLite schema (`macrozone.db`, schema version 5)

| Table | Purpose | Key columns and constraints |
| ----- | ------- | --------------------------- |
| `meals` | Logged meals | `id TEXT PRIMARY KEY`, `name`, `calories`/`protein`/`carbs`/`fat REAL` (must be numeric), `meal_type` (breakfast, lunch, dinner, snack), `local_date` (`YYYY-MM-DD`), `local_time` (`HH:MM` or null), `created_at`, `updated_at`, `extra_json` (valid JSON or null) |
| `app_metadata` | App-level markers such as the legacy-import record | `key TEXT PRIMARY KEY`, `value` (valid JSON), `updated_at` |
| `legacy_meal_records` | Raw legacy records that could not be imported as meals, kept for recovery | `source_index`, `raw_json`, `reason` (`unreadable`, `duplicate_id`, `conflict`, `unparseable_source`), `imported_at` |
| `user_profile` (v2) | The one saved body profile used for goal calculation | `id` (always 1), `unit_system`, `sex` (female, male, unspecified), `age_years`, `height_cm`, `weight_kg`, `activity_level`, `weight_goal`, `weekly_rate_kg`, `updated_at` |
| `nutrition_goals` (v2) | The current daily targets | `id` (always 1), `calories`/`protein`/`carbs`/`fat` (non-negative), `source` (calculated or manual), `updated_at` |
| `foods` (v3) | Reusable food definitions | `id`, `name`, `name_key` (normalized lowercase), `serving_amount` (> 0), `serving_unit` (g, ml, serving, piece, cup, tbsp, tsp), nutrition per serving (non-negative, limited), `is_favorite` with `favorited_at`, timestamps; unique on the full definition |
| `saved_meals` / `saved_meal_items` (v3) | Reusable groups of foods | items: `saved_meal_id → saved_meals ON DELETE CASCADE`, `position` (unique per saved meal), `food_id → foods ON DELETE SET NULL`, food snapshot (name, serving, nutrition), `amount` (> 0) |
| `recipes` / `recipe_ingredients` (v3) | Recipes built from foods | `servings` (> 0); ingredients: `recipe_id → recipes ON DELETE CASCADE`, `position`, `food_id → foods ON DELETE SET NULL`, food snapshot, `amount` |
| `meal_entry_sources` (v3) | Immutable snapshot of what a logged meal was added from (one per meal at most) | `meal_id → meals ON DELETE CASCADE` (primary key), `source_type` (food or recipe), `food_id` / `recipe_id` / `saved_meal_id` (each `ON DELETE SET NULL`), `log_group_id`, source name, serving, base nutrition, amount, `logged_at` |
| `meal_entry_ai_sources` (v4) | Snapshot of a meal added from a reviewed AI estimate (one per meal at most) | `meal_id → meals ON DELETE CASCADE` (primary key), `input_kind` (text or photo), `meal_title`, `item_name` (1–80 characters), `amount` (> 0), `unit` (g, ml, serving, piece, cup, tbsp, tsp), `matched_food_id → foods ON DELETE SET NULL`, `log_group_id` (required), `logged_at` |
| `meal_entry_product_sources` (v5) | Snapshot of a meal added from a reviewed barcode product (one per meal at most) | `meal_id → meals ON DELETE CASCADE` (primary key), `provider` (open_food_facts), `barcode` (8–14 digits, text), `provider_product_name`, `item_name`, `basis_amount` / `basis_unit` (g, ml, serving), reviewed base nutrition, `amount`, `user_reviewed`, `looked_up_at`, `provider_modified_at`, `food_id → foods ON DELETE SET NULL`, `log_group_id`, `logged_at` |
| `food_barcodes` (v5) | Links a barcode to one of your foods | `barcode` (primary key, 8–14 digits), `food_id → foods ON DELETE CASCADE`, `linked_at` |
| `online_product_cache` (v5) | Normalized product lookups kept for offline use (not the raw response) | `(provider, barcode)` primary key, `status` (found or not_found), `payload_version`, `payload_json` (normalized product, valid JSON, only when found), `fetched_at`, `stale_at`, `expires_at`, `provider_modified_at` |

Indexes: meals `(local_date, local_time, created_at)`, `(local_date, meal_type)`, `(created_at)`; foods `(name_key, id)`, `(is_favorite, name_key, id)`, and the unique definition index; saved meals and recipes `(name_key, id)`; item and ingredient `food_id`; entry sources `(food_id, logged_at)`, `(logged_at)`, `(log_group_id)`; AI entry sources `(log_group_id)`, `(matched_food_id)`; product entry sources `(food_id)`, `(barcode)`; food barcodes `(food_id)`; product cache `(fetched_at, provider, barcode)`, `(expires_at)`.

Onboarding status (`completed` or `skipped`) is stored in `app_metadata` under the key `onboarding`. Saving goals writes the profile (when calculated), goals, and status in one exclusive transaction. On web, the whole plan is one JSON value under the AsyncStorage key `nutrition_plan`.

### Schema migrations

- Schema versions are tracked with `PRAGMA user_version`. Migrations are an ordered, consecutively numbered list in `src/storage/database/schemaMigrations.ts`.
- Each migration runs in an exclusive transaction together with its version bump. A failed migration rolls back completely and leaves the previous version in place.
- A database created by a newer app version is refused rather than modified.
- Version 2 adds `user_profile` and `nutrition_goals` without changing existing tables.
- Version 3 adds the food library, saved meals, recipes, and meal entry snapshots. It only creates new tables and indexes; existing meals, goals, and recovery records are not changed.
- Version 5 adds `online_product_cache`, `food_barcodes`, and `meal_entry_product_sources` with their indexes. It only creates new tables; existing meals, foods, snapshots, goals, and recovery records are not changed.
- Version 4 adds `meal_entry_ai_sources` and its indexes. It is a separate table because the CHECK constraints of `meal_entry_sources` cannot be changed in place; no existing row is changed or recalculated.
- Future data (measurements) will be added as new numbered migrations in the phases that introduce those features. Meal reminders are device settings and are stored in AsyncStorage, not SQLite.

### Migration from AsyncStorage

On Android and iOS, the first repository access opens the database, applies schema migrations, and then imports the legacy AsyncStorage `meals` array once:

1. **Already imported?** If `app_metadata` already contains `legacy_async_storage_meals_import`, nothing happens.
2. **Read without changing anything.** The legacy value is only read. It is never modified or deleted, so AsyncStorage remains a full pre-migration backup.
3. **Classify each record:**
   - Records that can be read become rows in `meals`, keeping their original ID (numeric IDs become text). Dates and meal types are calculated once and stored, so they no longer shift with timezone changes. Fields the app doesn't recognize are kept in `extra_json`.
   - Records that cannot be read, and repeated IDs, are copied as raw JSON into `legacy_meal_records`.
   - If the whole value cannot be parsed, the raw text is kept there too.
4. **Never overwrite.** Rows are inserted with `ON CONFLICT(id) DO NOTHING`. If a row with the same ID already exists with different content, it is not overwritten, and the incoming record is saved as a `conflict`.
5. **One transaction.** All rows, raw records, and the completion marker (with counts and a checksum of the source) are written in a single exclusive transaction. If anything fails, nothing is written, no marker is recorded, and the import is retried on the next access. The app shows an error with a retry option.

Running the import again is safe: the marker is checked before and inside the transaction, and inserts ignore existing IDs.

### Concurrency and recovery

- **No lost updates.** Writes change individual rows instead of rewriting the whole list.
- **One write at a time.** All repository writes, on both SQLite and AsyncStorage, go through a serial queue.
- **Exclusive transactions.** Multi-statement work (updates, deletes with snapshots, migrations, import, saved meals and recipes with their items, logging a saved meal or recipe, copying a day) runs in one transaction and rolls back completely on failure.
- **One setup per launch.** Database setup is cached, so concurrent screens trigger a single migration and import. A failed setup is retried on the next call.
- **Delete All** removes all rows from `meals` only. Migration-recovery records in `legacy_meal_records` and the legacy AsyncStorage backup are kept; no ordinary meal deletion (single meal, Clear Day, or Delete All) removes them.
- **Reverting to an older build.** An app version from before this change would read the untouched AsyncStorage snapshot, which does not include meals added afterwards.

## Food library and logging

### Food definitions and diary snapshots

- A **food** is a reusable definition: a name, a base serving (amount and unit), and nutrition for that serving. Favorites are a flag on the food, so favoriting is an idempotent update.
- A **logged meal** stays a normal `meals` row with its own totals, so Home, Diary, and existing meals work exactly as before. When it is added from the library, a `meal_entry_sources` row records an immutable snapshot: source name, serving, base nutrition, amount, and optional links to the food, recipe, or saved meal. On web, the same snapshot is stored inside the meal record under `macrozoneEntrySource`.
- Editing or deleting a food, saved meal, or recipe never changes logged meals. Deleting a library item clears its link on snapshots (SQLite `ON DELETE SET NULL`) and never deletes diary history.
- Saved meal items and recipe ingredients also store a snapshot of the food, so they keep working if the food is later edited or deleted; the item is then shown as "not in food library".
- Editing a library-added meal in the manual form keeps its snapshot when only the date, time, or meal type changes. Changing its name or nutrition removes the snapshot, turning it into a manual entry.

### Servings and calculations

- Amounts are entered in the food's own serving unit. The multiplier is amount ÷ serving amount. Units are not converted into each other (for example, grams into cups), because that would need density information.
- Consumed nutrition = base nutrition × multiplier, calculated at full precision. Values are rounded to 2 decimal places (with decimal-safe rounding, so 1.005 becomes 1.01) at the boundary: each diary entry or saved meal item when it is stored or shown, and each total when it is shown. Saved meal totals are the sum of the rounded items, re-rounded to remove floating-point drift.
- Recipe totals are summed from unrounded ingredients. Per-serving nutrition is total ÷ servings, and a logged recipe is total × servings logged ÷ servings; both are rounded to 2 decimals.
- Calculations reject non-finite or negative values and zero servings instead of clamping them. A single diary entry cannot exceed the manual form's limits (10,000 kcal and 1,000 g per macro), so every logged meal stays editable.
- Limits: names up to 80 characters; serving size up to 10,000; amounts up to 100,000 with 2 decimals; calories per serving up to 10,000 and each macro up to 1,000 g; recipe servings up to 1,000; up to 100 servings logged at once; up to 50 foods per saved meal and 100 ingredients per recipe.

### Recent foods, search, and copying

- Recent foods are derived from snapshots of meals that still exist: one row per food, newest first, ties broken by name and ID, up to 30. Manual and legacy meals, and meals whose food was deleted, are not suggested, because they have no reusable serving information.
- Search trims and lowercases the input and matches it anywhere in the normalized name. SQLite uses a parameterized `LIKE ? ESCAPE '\'` with `%`, `_`, and `\` escaped; web applies the same normalization in memory. Results are ordered by normalized name, then ID, and limited to 200 with a hint to refine the search.
- Adding a saved meal creates one diary entry per food with a shared group ID, in one transaction. "Copy to Today" copies every meal of a past day in one transaction with new IDs, keeping snapshots and regrouping saved meal entries; originals are unchanged.
- Repeated taps are ignored while an action is running, and database constraints remain the final protection against invalid data.

### Web storage

- The library is one versioned JSON value under `food_library` (`version: 1`). Each change is written in a single `setItem`, which keeps multi-item changes atomic within a tab.
- Malformed entries are skipped when reading, and the original value is copied to `food_library_unreadable_backup` before the first overwrite. A payload from a newer version is refused for reading and writing.

## AI meal estimates

### Architecture and why

```text
AiMealScreen → useAiMealFlow → aiMealService → AI endpoint client ──HTTPS──▶ MacroZone AI service (server/)
                                            → preferences repository                 │
                                            → food library (local matching)          ▼
                                            → DiaryLogRepository (atomic save)   Provider adapter ──▶ Anthropic API
```

- The app never talks to an AI provider and never holds a provider key. It only knows the MacroZone AI endpoint URL, set at build time with `EXPO_PUBLIC_AI_ENDPOINT_URL` (a public URL, not a secret). HTTPS is required; plain HTTP is accepted only for local network hosts in development builds. When the variable is missing or invalid, AI is shown as unavailable and manual logging stays available.
- MacroZone had no backend, so the AI boundary is a small standalone Node.js service in `server/`. It has one runtime dependency (the official Anthropic SDK), no web framework, and runs anywhere Node.js 22.18+ runs. It is not an Expo API route, which would couple the secret-holding code to the app's routing and change the web build to server output.
- The server uses a provider-agnostic `MealAnalysisProvider` interface (`analyze(input, { signal, deadlineAt })`). The Anthropic adapter is the only implementation; another provider can be added without changing the app or the contract.

### Models, retries, and fallbacks

- **Default model:** `claude-sonnet-5`, a better latency and cost balance for nutrition extraction than Opus.
- **Allowed models:** `AI_MODEL` accepts only an explicit allowlist of models that support image input, structured outputs, and every effort level: `claude-sonnet-5` (default) and `claude-opus-5`. Any other value stops the server at startup.
- **Request shape:** the non-beta Messages API with `output_config.format` (JSON Schema) and `output_config.effort` (default `medium`), `max_tokens` from `AI_MAX_OUTPUT_TOKENS` (default 8,000, which leaves room for adaptive thinking and bounds the output cost of each attempt), and no tools.
- **No fallbacks:** provider fallbacks are disabled, so a request is never silently served by a model that was not approved. The model that answered is written to the server log for diagnostics; it is not sent to the app or stored with diary entries.
- **Retries:** the SDK's automatic retries are turned off and the service retries itself.
  - Only connection failures, attempt timeouts, and provider server errors (including overloaded responses) are retried, up to `AI_PROVIDER_MAX_RETRIES` times (default 1, at most 2), with jittered exponential backoff (250–500 ms, then 500–1,000 ms, capped at 4 s).
  - Validation failures, refusals, truncated or malformed output, bad requests, and rejected credentials are never retried.
  - A provider rate limit is retried only when it includes `retry-after` and that wait plus a minimum attempt time still fits inside the request deadline (and a retry remains); otherwise the service returns `AI_RATE_LIMITED` right away.
  - Every attempt's timeout is the smaller of `AI_PROVIDER_TIMEOUT_MS` and the time left before the request deadline, and no attempt starts with less than 2 seconds left.
  - Cancellation (the client disconnecting or the deadline passing) interrupts a pending backoff and prevents another attempt.
  - Retries belong to the same user request: they use the same concurrency slot and the same single unit of the daily budget.

### Request and response contract (version 1)

`POST /v1/meal-analysis` with `content-type: application/json` and `x-macrozone-rate-limit-key: <UUID v4>`:

```json
{ "version": 1, "inputKind": "text", "text": "200 g grilled chicken with 150 g rice" }
{ "version": 1, "inputKind": "photo", "image": { "mediaType": "image/jpeg", "base64": "<JPEG data>" }, "note": "grilled, no oil" }
```

Success (`200`):

```json
{
  "version": 1,
  "status": "ok",
  "result": {
    "analysisId": "<request id>",
    "inputKind": "text",
    "title": "Chicken and rice",
    "items": [
      { "name": "Grilled chicken", "amount": 200, "unit": "g", "calories": 330, "protein": 62, "carbs": 0, "fat": 7.2, "confidence": "high", "note": null, "uncertainties": [] }
    ],
    "totals": { "calories": 330, "protein": 62, "carbs": 0, "fat": 7.2 },
    "quality": "medium",
    "warnings": []
  }
}
```

Clarification (`200`), when one critical ambiguity prevents a meaningful estimate:

```json
{ "version": 1, "status": "needs_clarification", "clarification": { "analysisId": "<request id>", "inputKind": "photo", "question": "Is the brown dish a lentil curry or a meat stew?" } }
```

Errors: `{ "version": 1, "status": "error", "error": { "code", "message", "retryable" } }` with these codes:

| Code | HTTP | Meaning |
| ---- | ---- | ------- |
| `AI_UNAVAILABLE` | 503 (with `retry-after` when overloaded or out of budget) | Provider failure, server at its concurrency limit, daily budget used up, or the budget store failing |
| `AI_TIMEOUT` | 504 | The deadline passed |
| `AI_RATE_LIMITED` | 429 (with `retry-after` when known) | A per-key or per-IP limit, or a provider rate limit that could not be honored in time |
| `INVALID_INPUT` | 400, 403, 405, 413, 415, 422 | Invalid body, missing or malformed rate-limit key, disallowed browser origin, wrong method or type, too large, or content that is not a meal |
| `INVALID_IMAGE` | 400, 422 | The image type, size, or contents are invalid, or the photo is too blurry, dark, or cropped to estimate |
| `INVALID_AI_RESPONSE` | 502 | The model output failed validation |
| `UNAUTHORIZED` | 401 | Reserved for a gateway or future real authentication; the service itself does not authenticate callers |
| `SERVER_ERROR` | 500 | Unexpected failure |

The app adds `OFFLINE` (the request could not reach the service) and `NOT_CONFIGURED`, and maps every code to a user-facing message. `GET /v1/health` returns only `{ "status": "ok" }`, with no model, key, limits, or configuration.

Limits: text 3–500 characters after normalization; an optional photo note up to 300 characters; photos JPEG, PNG, or WebP up to 1.1 MB decoded (request body up to 1.6 MB); up to 20 items; names up to 80 characters; amounts up to 100,000; up to 10,000 kcal and 1,000 g per macro per item; up to 8 warnings; clarification questions up to 200 characters.

### Security posture and deployment

**The service is not authenticated.** The `x-macrozone-rate-limit-key` header is a random UUID the app generates once and stores locally. It only lets the service apply per-installation rate limits. Anyone can generate a new one, so it is an abuse-control key, not an identity or a credential, and a missing or malformed key is an invalid request (`400`), not an authentication failure. The app contains no shared secret, because anything shipped in an app can be extracted.

**Where it is suitable today:** local development, internal testing, or production behind a protected gateway that authenticates callers or verifies the app (for example Play Integrity on Android and App Attest on iOS) and applies its own quotas. It is not secure as a directly exposed public endpoint. A public release should add real user authentication and/or platform attestation at a gateway in front of this service.

**Controls in the service:**

- **Server-wide concurrency limit** (`AI_MAX_CONCURRENT_REQUESTS`): requests that would call the provider take a slot; when all slots are busy the request is rejected immediately with `503` and `retry-after: 5`. There is no queue. A slot is held until the provider call has actually finished, even if the client has already received a timeout.
- **Server-wide daily request budget** (`AI_DAILY_REQUEST_BUDGET`, per UTC day): one unit is used by each valid request that reaches the provider, whatever key or IP it comes from, so forged or rotating rate-limit keys cannot get around it. When it is used up, or when the budget store fails, the service fails closed with `503` until the next UTC day. Invalid requests and requests rejected at the concurrency limit do not use the budget. Together with `AI_MAX_OUTPUT_TOKENS`, the retry limit, and the input limits, this bounds the daily provider cost.
- **Secondary limits:** sliding-window limits per client IP (per minute) and per rate-limit key (per minute and per day), checked before the body is parsed.
- **Trusted proxies** (`AI_TRUSTED_PROXIES`, empty by default): `x-forwarded-for` is ignored unless the direct peer's address is listed. When it is, the client IP is the nearest address in the header, reading from the right, that is not itself a trusted proxy; a malformed entry falls back to the peer address. Entries a client adds to the left of the chain are never used.
- **Other safeguards:** CORS origin allowlist (HTTPS origins only in production), a streaming body limit, header and request timeouts, a request deadline that cancels the provider call, and cancellation when the client disconnects.

**Storage of limits:** counters are kept in memory (`usageStore: memory` in the startup log). They reset when the process restarts and are not shared between instances. Running more than one instance, or restarting often, needs a shared external store (for example Redis or a database) for rate limits and the daily budget; that store is not implemented yet.

**Production mode:** with `NODE_ENV=production` the service refuses to start unless all of these are set explicitly:

- `AI_DEPLOYMENT=protected-gateway-single-instance`, which confirms that the service runs as one instance behind a protected gateway;
- `AI_MAX_CONCURRENT_REQUESTS`;
- `AI_DAILY_REQUEST_BUDGET`.

Development needs only `ANTHROPIC_API_KEY` and listens on `127.0.0.1` by default (set `HOST=0.0.0.0` to reach it from a phone on the local network).

### Secrets and configuration

The provider key exists only in the server's environment. It is never in the app, `app.json`, `EXPO_PUBLIC_*` variables, source, AsyncStorage, SQLite, logs, or committed example files. `server/.env*` is ignored by Git. Configuration is validated at startup; an invalid configuration stops the server and logs only the names of the invalid variables, never their values.

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `ANTHROPIC_API_KEY` | required | Provider key (server only) |
| `NODE_ENV` | development | `production` enables the required deployment checks above |
| `AI_DEPLOYMENT` | none (required in production) | Must be `protected-gateway-single-instance` |
| `AI_MODEL` | `claude-sonnet-5` | One of `claude-sonnet-5`, `claude-opus-5` |
| `AI_EFFORT` | `medium` | `low`, `medium`, `high`, `xhigh`, or `max` |
| `AI_MAX_OUTPUT_TOKENS` | `8000` | Output token limit per attempt (1,024–32,000) |
| `AI_MAX_CONCURRENT_REQUESTS` | `4` (required in production) | Provider calls in flight at once (1–256) |
| `AI_DAILY_REQUEST_BUDGET` | `200` (required in production) | Provider-bound requests per UTC day (1–1,000,000) |
| `PORT`, `HOST` | `8787`, `127.0.0.1` (`0.0.0.0` in production) | Listen address |
| `AI_REQUEST_TIMEOUT_MS` | `45000` | Deadline for a whole request, including retries |
| `AI_PROVIDER_TIMEOUT_MS` | `30000` | Timeout per provider attempt (must be lower than the request deadline) |
| `AI_PROVIDER_MAX_RETRIES` | `1` | Retries for transient provider failures (0–2) |
| `AI_RATE_LIMIT_PER_MINUTE`, `AI_RATE_LIMIT_PER_DAY` | `6`, `100` | Requests per rate-limit key |
| `AI_IP_RATE_LIMIT_PER_MINUTE` | `30` | Requests per client IP |
| `AI_ALLOWED_ORIGINS` | none | Comma-separated browser origins allowed by CORS (needed for the web app) |
| `AI_TRUSTED_PROXIES` | none | Comma-separated IP addresses of proxies whose `x-forwarded-for` is trusted |

Run locally with `npm run server:install`, then provide the variables through your shell or a secrets manager and run `npm run server:start`.

### Validation and prompt injection

- **Input:** POST and JSON only; strict text limits; the declared image type must match the file's magic bytes. Provider errors are mapped to the codes above; raw provider errors, prompts, and stack traces are never returned or logged.
- **Prompt injection:** the system prompt restricts the model to nutrition extraction and tells it to treat the description and the photo as untrusted data and ignore instructions inside them. The description is wrapped in delimiters after control characters and `<` / `>` are removed, so it cannot close them. Users cannot change the system prompt, schema, limits, model, or configuration. The model has no tools, and its output is only data: it never builds queries, runs SQL, or writes storage.
- **Output is never trusted:** generation is schema-constrained, and the server still validates every field independently (types, finite and non-negative numbers, amounts above zero after rounding, known units, limits, item count), cleans text, rounds values, recomputes totals, and flags items whose macros do not match their calories. The app validates the response again at its own boundary and rejects unsupported versions, malformed items, and totals that differ from its own recomputation.

### Plate photos, uncertainty, and clarification

- **Plated meals, not labels.** The photo flow is for a served meal. The system prompt tells the model to analyze only the food and drinks visible on the plate, bowl, or table setting; not to read labels, packaging, or menus; to return each visible component (protein, starch, vegetables, salad, sauces, dressings, toppings, bread, drinks) as its own item; and to estimate portions conservatively from visual cues.
- **Structured uncertainty.** Each item and the meal as a whole carry uncertainty flags from a fixed list: `portion_size`, `overlapping_foods`, `hidden_ingredients`, `cooking_method`, `added_fat_or_sauce`, and `photo_quality`. The server, not the model, turns them into user-facing warnings with fixed wording and lowers confidence: any flag caps an item or the meal at medium, and `photo_quality` forces low. The review shows the overall confidence, the warnings, and for each item "Less certain because of" the flagged reasons.
- **Outcomes.** The model must choose `estimate`, `no_food` (an empty plate or a non-food image, returned as `422 INVALID_INPUT`), `unusable_photo` (too blurry, dark, or cropped, returned as `422 INVALID_IMAGE`), or `needs_clarification` with one short question. It is told not to invent confident values to avoid asking.
- **Clarification.** When a question comes back, nothing is estimated or saved. The screen shows the question; for a photo you answer in the optional Details field, and for text you add the answer to the description, then tap Analyze Again. The note is normalized, limited to 300 characters, and wrapped as untrusted `<user_note>` data in the prompt.
- **Never exact.** Results are always labeled as estimates, the prompt forbids describing them as exact, and nothing is saved until you tap Add to Diary.

### Nutrition values

The app's Phase 7 math is authoritative. Item values are rounded with decimal-safe 2-decimal rounding, and totals are the sum of rounded items, re-rounded. While reviewing, changing an amount scales the nutrition from the current reference (the AI estimate or a linked food) without converting units; editing nutrition makes the edited values the new reference. Only the reviewed, app-calculated values are saved, within the manual entry limits.

### Local food matching

Matching runs in the app, separately from the provider, and is deterministic. An item is linked automatically only when exactly one library food has the same normalized name and the same serving unit. Otherwise up to three candidates (exact names and simple singular/plural matches) are shown as suggestions, and nothing is chosen for you. During review you can use a suggestion, choose any food from your library, or unlink to restore the AI estimate. Later changes to a food never change saved entries.

### Saving and snapshots

- Each reviewed item becomes one `meals` row, so Home, Diary, editing, copying, and sharing work unchanged. All entries of one estimate are written in a single transaction (SQLite) or a single write (web), with a shared group ID; if anything fails, nothing is saved. Repeated taps are ignored while saving.
- Provenance is minimal: input kind, meal title, item name, amount, unit, an optional link to the matched food, the group ID, and the time. No prompt, description, photo, raw AI output, model name, confidence, or note is stored. On web the same fields are stored inside the meal record under `macrozoneEntrySource`.
- Editing or deleting one AI entry affects only that entry. Changing its name or nutrition turns it into a manual entry. AI entries are not used for recent foods.

### Photos and temporary files

- The app requests camera permission only when you tap Take Photo; the photo library picker needs no permission on current Android and iOS versions. The picker is asked not to return EXIF data.
- A picked or captured photo is re-encoded by `expo-image-manipulator` into a new JPEG (at most 1280 px on the longest side, then smaller sizes and stronger compression until it is 1.1 MB or less).
- **MacroZone deletes only processed temporary files it creates.** A file is deleted only when both of these hold:
  - the photo adapter created it with the image manipulator and recorded it in its list of generated files;
  - its URI is a `file://` URI directly inside the app's own cache folder for processed images (`<cache>/ImageManipulator/`), with a generated UUID `.jpg` name and no `..`, query, or nested path.
- MacroZone never deletes the URI returned by the image picker or camera, media library originals, `content://` or other shared or provider URIs, arbitrary file URIs, or anything outside that folder. If ownership cannot be established (for example on web, or when the cache path cannot be read), nothing is deleted. Picker-managed temporary copies are left to the operating system's cache cleanup.
- Processed files are deleted when a larger intermediate attempt is discarded, when the photo is removed or replaced, after the meal is saved, and when you leave the screen. Cleanup can run more than once safely, and a failed deletion is ignored so it never interrupts the flow or navigation.

### Privacy: what leaves the device

- Nothing is sent until you tap Analyze.
- **Text:** the normalized description, a contract version, and the rate-limit key.
- **Photo:** the re-encoded JPEG, the optional Details note if you typed one, its media type, a contract version, and the rate-limit key. Before the first photo analysis the app asks for consent to send photos to the AI service; the acknowledgement is stored locally with a version and asked again if the disclosure changes.
- The service does not store descriptions, photos, prompts, or results. Its logs contain only a request ID, route, status, error code or limit reason, input kind, text length or image size, item count, attempts, the answering model, and duration. The AI provider processes the request under its own data policy.
- No analytics or tracking are added.

### Reliability

Analysis and saving are single-flight. Every analysis has a request number and its own cancellation; a response for an older request is ignored. Cancel stops the request and keeps your input; leaving the screen cancels any request. The app times out after 60 seconds; the server deadline is shorter. Offline, timeout, rate-limit, overload, invalid-response, and provider failures show a clear message with Try Again where it can help and Log Manually always. Failures keep the text or photo so you can retry.

## Barcode scanning and online food lookup

### Flow and architecture

```text
BarcodeScreen → useBarcodeScanner (expo-camera) ─┐
             → useBarcodeFlow → productLookupService → ProductCacheRepository (SQLite | AsyncStorage)
                               │                     → OnlineFoodProvider → Open Food Facts adapter ──HTTPS──▶ world.openfoodfacts.org
                               └→ barcodeLogService → BarcodeLogRepository (one SQLite transaction | compensated AsyncStorage write)
```

- The Add hub has a Barcode mode with Scan Barcode (Android and iOS) and Enter Barcode. The date and meal type from Home, reminders, or the hub travel through the whole flow, and future dates are blocked.
- Screens, components, and hooks never call Open Food Facts, SQLite, or AsyncStorage. The provider is behind the provider-neutral `OnlineFoodProvider` interface (lookup by barcode, found / not found / failed outcomes, availability, product page URL).
- Nothing is saved until you tap Add to Diary. A lookup never saves anything by itself.

### Scanner

- Uses `expo-camera` (`CameraView` with `onBarcodeScanned`). Camera permission is requested only when you start scanning. If access is denied, the screen explains it and offers Open Settings when the system will no longer ask. Typing the barcode is always available.
- Only retail symbologies are enabled: `ean13`, `ean8`, `upc_a`, and `itf14`. QR codes and other symbologies are ignored. UPC-E is not enabled, because its value needs an expansion step that Open Food Facts does not document for lookups.
- The first valid callback locks the scanner; repeated callbacks are ignored until you tap Scan Again. Invalid data (wrong length, bad check digit, text or links) is rejected with a message and never sent anywhere.
- The camera runs only while the scanner is open, the screen is focused, and the app is in the foreground; the torch turns off whenever it stops, and the camera view is unmounted when scanning ends or the screen closes.
- Web: `expo-camera` scans only QR codes in the browser, so the web app offers manual entry only.

### Barcode validation and normalization

- Accepted formats: EAN-8 (8 digits), UPC-A (12), EAN-13 (13), and GTIN-14 (14). Manual input may contain spaces or single hyphens between digit groups; anything else (letters, punctuation, control characters, links) is rejected, and input is limited to 32 characters.
- The GS1 mod-10 check digit is validated. Barcodes are always strings, never JavaScript numbers, so leading zeros are kept.
- Normalization follows the Open Food Facts rule exactly: after removing leading zeros, codes with 7 digits or fewer are padded to 8, and codes with 9–12 digits are padded to 13. The same product therefore has one key whether the scanner returns 12 or 13 digits. On iOS, `expo-camera` reports UPC-A as `ean13` with the leading zero removed (12 digits); on Android ML Kit reports `upc_a` with 12 digits. Both normalize to the same 13-digit code.

### Open Food Facts request

- **Endpoint:** `GET https://world.openfoodfacts.org/api/v3.6/product/{barcode}?product_type=food&fields=code,product_type,product_name,brands,quantity,serving_size,nutrition,selected_images,last_modified_t` — read-only, no account, no cookies (`credentials: omit`), no writes, no photo uploads.
- **Identification:** every request sends `User-Agent: MacroZone/<app version> (<contact>)`, as the Open Food Facts API policy requires. The app version comes from `app.json`. The contact comes from `EXPO_PUBLIC_OPEN_FOOD_FACTS_CONTACT` (an email address or HTTPS URL; placeholder domains such as example.com are rejected). **No contact is committed.** Without a valid contact, online lookup is disabled and the app says so (development builds also show how to set it); cached products, Create Food, and manual logging still work.
- **The contact is public:** like every `EXPO_PUBLIC_*` variable, it is compiled into the JavaScript bundle and anyone with the app can read it, and it is also sent to Open Food Facts in every request. Use a contact address or page intended to be public for the project or its support (for example a project support mailbox or an issues page), never a private personal email address. Set it in your local, untracked environment or your build service's environment, never in a committed file.
- **Environment:** `EXPO_PUBLIC_OPEN_FOOD_FACTS_ENV` is `production` or `staging`. When it is not set, development builds use the staging server (`world.openfoodfacts.net` with its documented public `off:off` login) and release builds use production. Automated tests never call either.
- **Web:** browsers do not allow setting `User-Agent`, so a compliant direct request is not possible. Online lookup is unavailable on the web, and no proxy is used (a shared proxy would put every user behind one IP address and its per-IP limit).
- **Rate limits:** Open Food Facts allows 15 product reads per minute per IP address. Requests go directly from each device, and the app additionally limits itself to 10 requests per minute. There is no search-as-you-type; one scan or submit makes one lookup unless you tap Try Again.
- **Errors and retries:** 404 means not found and is not retried. 429 and 503 are not retried; their `Retry-After` (seconds or HTTP date, default 60 seconds for 429) blocks further requests until it passes. A network failure, timeout (10 seconds per attempt, 15 seconds in total), or 500/502/504 is retried once after a 500–1,000 ms jittered delay. Other statuses are treated as unusable responses. Leaving the screen or tapping Cancel aborts the request.

### Response validation and nutrition mapping

- The envelope must have a known status, and the product code must normalize to the requested barcode. Non-food product types are treated as not found. Malformed JSON, oversized bodies, and unexpected shapes become a "could not read" error; unknown extra fields are ignored.
- Nutrition comes from the v3.5+ `nutrition` structure: the `aggregated_set` (per 100 g or 100 ml, as sold) and label `input_sets` with `per: serving` (manufacturer or packaging source, `per_quantity` with `per_unit` g or ml). Prepared-product sets are not used.
- Each nutrient is read separately: calories from `energy-kcal` (unit kcal), protein from `proteins`, carbs from `carbohydrates`, fat from `fat` (unit g). A value of zero is a real value; an absent key or value is missing; a value with `source: estimate`, a wrong unit, a negative number, or an unknown modifier is not used. Values with `<`, `<=`, `>`, `>=`, or `~` modifiers are used but marked approximate. The generic `energy` field is never used. When kcal is absent, `energy-kj` is converted once with `kilojoulesToKilocalories` (÷ 4.184) and marked as converted.
- **Bases offered:** per 100 g or per 100 ml when that set has at least one usable value, and per serving when the serving set is consistent with the per-100 values (within 12%, with minimums of 5 kcal and 1.5 g) and within MacroZone's limits. A per-100 set with more than 105 g of macros or 950 kcal is impossible and is not used. Calories that differ from 4 × protein + 4 × carbs + 9 × fat by more than 35% (minimum 40 kcal) show a warning. If no basis is usable, you enter the nutrition yourself per 100 g, per 100 ml, or per serving.
- **No guessing:** textual servings such as "1 package" are shown only as text; they are never parsed into amounts. Grams, milliliters, and servings are never converted into each other.
- **MacroZone calculates:** consumed values use the Phase 7 serving math and decimal-safe 2-decimal rounding, and every value is checked against the food and diary limits.

### Review, saving, and My Foods

- The review screen shows the product photo (when available), name, brand, barcode, package size, the Open Food Facts attribution with a link to the product page, data warnings, the basis, editable nutrition with missing values marked, the amount, what will be added, and the date and meal type.
- Saving creates one diary entry with an immutable `meal_entry_product_sources` snapshot (on the web, inside the meal record under `macrozoneEntrySource`): barcode, provider, provider product name, reviewed name, basis, reviewed base nutrition, amount, whether you edited the product, lookup time, provider modification time, and an optional link to your food. The raw response is never stored. Cache refreshes, changes to Open Food Facts, and edits or deletion of a linked food do not change it. Editing the entry's name or nutrition turns it into a manual entry, and Copy Day creates an independent snapshot. Barcode entries are not used for Recent foods.
- **Also save to My Foods** (off by default) saves the reviewed name, basis, and nutrition as a food, reusing an existing identical food instead of creating a duplicate, and links the barcode to it (`food_barcodes`). If the barcode is already linked, you choose Keep My Food, Update My Food, or Use My Food's Values (which copies the food's values into the review and keeps the food unchanged); updating asks for confirmation first, and cancelling saves nothing. A barcode is linked to at most one food, and a food is never overwritten automatically.

### All-or-nothing saving

Add to Diary saves the diary entry, its product snapshot, and any My Foods change together, or saves nothing.

- **Android and iOS (SQLite):** `BarcodeLogRepository.commit` runs one `BEGIN IMMEDIATE` transaction on the app's foreign-key-enabled connection, inside the shared local write queue. In order it checks whether this operation was already saved, finds or creates the food (reusing an identical one) or applies the confirmed update, creates the barcode link if needed, inserts the meal, and inserts the product snapshot. It commits only after every step succeeds; any failure, including a failed `COMMIT`, rolls everything back. There are no nested transactions.
- **Web (AsyncStorage):** there are no multi-key transactions, so the web repository compensates. Inside the same shared write queue used by every MacroZone write on the web, it reads the exact previous values of the affected keys (`food_library`, `food_barcode_links`, their unreadable-data backups, and the meals list), computes and validates the complete next state in memory, and writes only the keys that change in one `multiSet` (or one `setItem` per key when `multiSet` is unavailable). If any write fails, it restores every touched key to its previous value (removing keys that did not exist) and reads them back to verify. The meal and its product snapshot are one record in one key, so they are always written together.
- **Web guarantee and limits:** within one open tab, other MacroZone writes never interleave with the save, and after a failure the app returns to exactly the previous data. This is not crash-level atomicity: if the tab or browser closes in the middle of a save, or another tab writes at the same time, a partial change can remain. If restoring fails, the app says "MacroZone could not finish saving and could not fully undo the change" and asks you to check your diary and My Foods instead of claiming nothing was saved; retrying is safe (see below).
- **Why not one web aggregate:** keeping foods, links, and diary entries in one new versioned value would make the write a single `setItem`, but it would mean moving the existing `food_library` (Phase 7) and meals data into a new format. Rewriting unrelated legacy data carries more risk than the compensated write, so the existing keys are kept.
- **Retries and repeated taps:** every save has a stable operation ID, which becomes the diary entry's ID. The screen keeps the same ID while the reviewed values, destination, and food choice are unchanged, so tapping again after a failure retries the same operation. If that operation was already saved, the save returns the existing entry instead of adding another; if the ID was used with different values, nothing is saved. A retry never creates a second food, link, diary entry, or snapshot. After a successful save the ID is cleared, so logging the same product again later creates a new entry. Repeated taps while saving are ignored.
- If a linked food was deleted or the barcode was linked to another food since the review opened, nothing is saved and the review reloads the current link.

### Cache

- One entry per provider and normalized barcode, storing only the normalized product fields MacroZone uses.
- **Found products:** fresh for 7 days (returned without a network request), then refreshed on the next lookup. If the refresh fails, the saved product is shown with a warning that it could not be refreshed. After 180 days an entry expires and is offered only as an explicit "Use Saved Copy" choice after a failed lookup, then pruned.
- **Not found:** remembered for 24 hours. **Failures** (offline, timeout, rate limit, unavailable, unreadable response) are never cached.
- At most 500 entries; pruning removes expired entries, then keeps the most recently fetched (ties by provider and barcode). Pruning touches only the cache, never diary snapshots or foods.
- A write never replaces an entry fetched later than it, or an entry written by a newer app version. Unreadable SQLite rows are ignored and replaced only by a newer successful lookup. On the web, the cache is one versioned AsyncStorage value (`online_product_cache`, version 1); unreadable data is copied to `online_product_cache_unreadable_backup` before the first overwrite, and a newer version is refused. Barcode links on the web use `food_barcode_links` (version 1) with the same rules.

### Images, attribution, and licensing

- Product photos are shown only from HTTPS URLs on Open Food Facts image hosts, loaded by React Native's `Image` without credentials, and never saved by MacroZone. A photo that fails to load is hidden; it never blocks logging. Photos may not match the current package.
- The review screen, the Barcode hub panel, the barcode screen, and a Data sources card on the Nutrition Goals screen show "Data from Open Food Facts" with a link to openfoodfacts.org or the product page. Cached products keep the attribution.
- Open Food Facts data is available under the [Open Database License (ODbL 1.0)](https://opendatacommons.org/licenses/odbl/1-0/), and individual contents under the [Database Contents License (DbCL 1.0)](https://opendatacommons.org/licenses/dbcl/1-0/). Reuse requires attribution with a link, and derivative databases that are shared must use the same license. MacroZone only keeps a small per-device cache of looked-up products and does not redistribute the database.
- Product images are available under [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/) and are credited to Open Food Facts contributors where shown; images can contain third-party elements (such as logos) with their own rights.
- MacroZone is not affiliated with or endorsed by Open Food Facts. Open Food Facts does not guarantee the accuracy of its data, and MacroZone presents it as community data that must be reviewed, never as medical advice.

### What leaves the device

Only the normalized barcode, the requested field list, and the User-Agent (app name, version, and configured contact) are sent to Open Food Facts, and only when you look up a product. Nothing about your diary, foods, or account is sent.

## Meal reminders

### Architecture

```text
RemindersScreen → useReminderSettings → ReminderService → ReminderRepository (AsyncStorage)
                                                        → NotificationScheduler / NotificationPermissionService (expo-notifications)
Root layout     → useReminderLifecycle → notification taps, reconciliation
```

Screens and components never import `expo-notifications` or AsyncStorage. `getReminderPlatform.web.ts` reports reminders as unsupported, so the notification adapter is not part of the web bundle.

### Stored settings

- One versioned JSON value under the AsyncStorage key `meal_reminders` (`version: 1`) holds each reminder's ID (`reminder-breakfast`, …), meal type, enabled flag, hour, minute, and update time, plus device-only schedule records (OS notification ID, time, time zone, scheduled time). OS notification IDs are specific to this device and are not meant for syncing.
- Invalid JSON, malformed or duplicate entries, and missing reminders are replaced with safe defaults and reported on screen. Before the first overwrite, the original value is copied to `meal_reminders_unreadable_backup`.
- Settings saved by a newer app version are shown as read-only and never overwritten.

### Permissions and Android channel

- Permission is read without prompting. The system prompt appears only when you turn on a reminder and the system still allows asking. iOS provisional and ephemeral authorization count as allowed.
- If permission is denied, the reminder stays off, nothing is recorded as scheduled, and an Open Settings action is offered. MacroZone does not ask again automatically.
- Android reminders use a dedicated `meal-reminders` channel ("Meal reminders", default importance, default sound, no vibration). It is created before the permission prompt and before scheduling.

### Scheduling and recovery

- Each enabled reminder is its own daily notification at a local hour and minute. Its data includes `kind: 'macrozone.meal-reminder'`, a payload version, the reminder ID, meal type, and time.
- MacroZone cancels only notifications it recorded or that carry its reminder payload. It never cancels all scheduled notifications.
- **Turn on:** check or request permission, prepare the channel, schedule, then save. If saving fails, the new notification is cancelled.
- **Turn off:** save the off state first, then cancel. If cancellation fails, the reminder is shown as off with a warning, and reconciliation removes the notification later.
- **Change time:** schedule the replacement, save it, then cancel the previous notification. If scheduling or saving fails, the previous reminder stays active and any replacement is removed.
- **Reconciliation** runs when the app becomes ready, when it returns to the foreground (only after reminders were configured), and when the Reminders screen gains focus. It reschedules enabled reminders whose notification is missing, whose time differs, or whose time zone changed; cancels MacroZone reminder notifications for disabled reminders, duplicates, and unrecognized payload versions; drops stale records; and leaves other notifications alone. It never requests permission.

### Time zones and daylight saving time

- Reminder times are local wall-clock times, never stored as UTC timestamps.
- iOS repeats the reminder with a calendar trigger that follows the device's current local time.
- Android computes the next delivery in the device's local time after each delivery, so daylight saving changes are followed. When the device time zone changes, MacroZone reschedules the next time the app opens or returns to the foreground.
- On days when a local time does not exist (for example, during a spring-forward DST change), the platform decides whether the reminder is delivered after the gap or skipped that day.

### Notification taps

Tapping a valid reminder opens `/meal/new` with today's local date and the reminder's meal type. Payloads that are malformed, from an unknown version, or from other notifications are ignored. Each tap is handled once, including a tap that launched the app. Taps are processed only after onboarding is complete; a tap received during onboarding opens Add Meal once onboarding finishes in the same session.

## Nutrition goal calculations

Targets are estimates from general population formulas. They are not medical advice. The calculator is limited to adults (18–100 years).

- **BMR (Mifflin–St Jeor):** 10 × weight (kg) + 6.25 × height (cm) − 5 × age + s.
  - s = +5 for male, −161 for female, and −78 for "not specified". The last is the midpoint of the two, and less precise.
- **TDEE:** BMR × activity factor.
  - Sedentary 1.2, lightly active 1.375, moderately active 1.55, very active 1.725, extra active 1.9.
- **Calorie target:** TDEE ± weekly rate × 7,700 kcal ÷ 7, rounded to the nearest 10 kcal.
  - Rates: lose 0.25, 0.5, 0.75, or 1 kg per week (0.5, 1, 1.5, or 2 lb); gain 0.25 or 0.5 kg per week (0.5 or 1 lb).
  - If the result is below 1,200 kcal (female), 1,500 kcal (male), or 1,350 kcal (not specified), the target is raised to that minimum, and the review explains why.
- **Protein:** 2.0 g per kg (lose), 1.6 (maintain), or 1.8 (gain), capped at 35% of calories.
- **Fat:** 25% of calories, at least 0.5 g per kg, and at most 35% of calories.
- **Carbs:** the remaining calories ÷ 4, never negative. All grams are whole numbers.
- **Units:** stored in metric. Imperial input uses exact factors (1 in = 2.54 cm, 1 lb = 0.45359237 kg).
- **Input limits:**
  - Height: 120–230 cm (3 ft 11.3 in – 7 ft 6.5 in).
  - Weight: 35–300 kg (77.2–661.3 lb), one decimal.
- **Manual targets:**
  - Calories: 500–10,000 kcal. Protein, carbs, and fat: 0–1,000 g, up to one decimal.
  - Non-blocking warnings appear below 1,200 kcal, or when macro calories differ from the calorie target by more than 10%.
- **Onboarding rules:**
  - It opens automatically only when no goals are saved, onboarding was never completed or skipped, and no meals exist.
  - Existing users with meals keep the default goals (2,000 kcal / 150 g / 250 g / 65 g) until they set their own.

## Testing

Business logic is implemented as pure functions and unit-tested with Jest (`npm test`).

- **Tests stay local.** Test files live next to the code in `__tests__/` folders, with shared helpers in `src/testing/`. Both paths are in `.gitignore`, so tests are not committed. The Jest configuration (`package.json` and `jest.environment.js`) is committed, and `npm test` passes when no tests are present.
- **Database tests use real SQLite.** `jest.environment.js` exposes an in-memory database from Node's built-in `node:sqlite` (Node 22.5 or later), adapted to the same `SqlDatabase` interface the app uses. This lets repository, migration, and import tests run real SQL, including constraints and transaction rollbacks, without a device.
- **Date tests are deterministic.** `jest.environment.js` runs every test file in UTC, whatever the machine timezone. Tests can switch to other timezones through the environment's `__setTestTimeZone` hook, for example to cover UTC+14, UTC−10, and DST changes. Setting `process.env.TZ` inside a test has no effect, because Jest sandboxes `process.env`.

## Current limitations

- Only the current goals and body profile are stored; there is no goal or weight history yet (planned with progress tracking).
- Changing your weight does not recalculate goals automatically; use Recalculate on the Nutrition Goals screen.
- Serving amounts use each food's own unit; there is no conversion between units such as grams and cups.
- Barcode lookup uses Open Food Facts only, needs a configured contact to run, works on Android and iOS but not on the web, and depends on community data that can be missing or wrong. UPC-E barcodes are not scanned. There is no text search of the online database.
- Scanning, torch control, the per-request User-Agent header, and the rate-limit handling have been verified with automated tests only, not on devices.
- AI estimates need the separate AI service to be deployed and the app to be built with its URL. The service has no user authentication: it is suitable for development, internal testing, or a single instance behind a protected gateway, not as a directly exposed public endpoint. Its rate limits and daily budget are kept in memory, reset on restart, and are not shared between instances.
- AI portion and nutrition estimates, especially from photos, can be inaccurate. Unit changes during review are not converted. Local matching compares names only and does not understand synonyms.
- On web, deleting a food keeps its ID in AI entry snapshots (as for library entries), and the AI service must list the web origin in `AI_ALLOWED_ORIGINS`. The camera option is not offered on web; photos are chosen from files.
- Copying is available for whole past days to today; copying a single meal section or to another date is not in the UI yet.
- On web, the food library and meals are separate AsyncStorage values. Deleting a library item on web keeps its old ID inside logged meal snapshots (there are no foreign keys), which is harmless because logged meals never read it for nutrition.
- The legacy AsyncStorage copy of pre-SQLite meals is kept on the device indefinitely. Removing it will be a separate, explicitly confirmed step.
- Raw legacy records that could not be imported are preserved, but there is no screen to review or recover them yet.
- On web, meals are stored in AsyncStorage (browser storage), not SQLite. Web writes are serialized within one tab, but separate browser tabs are not coordinated.
- Keyboard handling uses React Native's built-in APIs rather than a dedicated keyboard library, so behavior can differ slightly between Android versions and keyboards.
- Android delivers reminders with inexact alarms, because MacroZone does not request the exact-alarm permission. In battery-saving (Doze) mode, a reminder can arrive a few minutes late.
- If notifications are blocked while reminders are on, Android keeps the scheduled notifications but does not show them, and iOS does not deliver them. Reminders resume once notifications are allowed again.
- Reminder notification text is fixed per meal type and cannot be edited yet.
- The theme preference is stored per device and is not synced.
- Android date and time dialogs and confirmation alerts are drawn by the system, so they follow the device's light or dark setting rather than an explicit in-app choice.
- If Home is left open on today past midnight, it moves to the new day the next time the screen gains focus.
- `npm audit` reports advisories in transitive Expo CLI and build-tooling dependencies. npm's only suggested fix is an Expo major-version upgrade, so these are tracked rather than force-fixed.

## Roadmap

Work proceeds one phase at a time:

0. **Repository cleanup and baseline:** tooling, scripts, dependency hygiene, documentation.
1. **Correct daily tracking:** domain types, local-date utilities, selected-day totals, date navigation, history grouped by date, unit tests.
2. **Safe meal management:** validated forms, meal types, edit, duplicate, and delete flows, confirmations, accessibility.
3. **Storage architecture:** SQLite repository layer, versioned schema migrations, safe one-time import from AsyncStorage.
4. **Personalized goals and onboarding:** BMR/TDEE-based estimates and editable goals.
5. **Home and diary UX:** design system, light/dark/system themes, safe areas, keyboard handling, a Home dashboard grouped by meal type, and the Diary.
6. **Reminders and settings:** configurable local meal reminders with permission handling, reconciliation, and notification-tap navigation.
7. **Fast logging:** food library with servings, recent foods, favorites, saved meals, recipes, a logging hub, and copying a day.
8. **AI-assisted logging:** estimates from a description or photo through a secure MacroZone AI service, always reviewed before saving.
9. **Barcode scanning and online food lookup:** Open Food Facts products with review before save, local caching, and My Foods linking.
10. **Progress tracking:** weight, body measurements, trends, charts.
11. **Accounts and optional cloud sync:** Supabase, with offline use preserved.
12. **Advanced features:** evaluated and delivered as separate projects (health platform integrations and so on).

Nutrition values and future goal calculations are estimates and are not medical advice.
