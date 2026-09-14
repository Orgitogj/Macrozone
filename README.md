# MacroZone

MacroZone is a mobile meal and macronutrient tracker built with Expo and React Native. It aims to become an offline-first nutrition and fitness tracking app built around one core workflow:

```text
Select a date → log food → view daily macros → track progress
```

The app is currently an early MVP. All data stays on the device.

## Current features

- **Home (daily view):** move to the previous or next day, or jump back to today. Future dates are not selectable. Calorie, protein, carb, and fat totals for the selected day are shown against fixed goals, followed by that day's meals ordered by time eaten. "Clear Day" deletes the selected day's meals after confirmation.
- **Add Meal:** log a meal with a name, meal type (breakfast, lunch, dinner, snack), date (today or earlier), an optional time, calories, and optional protein, carbs, and fat.
  - The date is chosen with a native date picker (future dates are blocked) or with the previous/next-day and Today controls. The optional time uses a native time picker and can be cleared.
  - On Android the pickers open as system dialogs. On iOS they open in a bottom sheet with Cancel and Done. On web they use the browser's date and time inputs. Saving is disabled while a picker is open.
  - Fields are validated inline. Decimals accept `.` or `,`, negative values are rejected, and limits are 10,000 kcal and 1,000 g per macro.
  - While saving, the button shows progress and ignores repeated taps. If saving fails, the form keeps what you entered.
  - After saving, Home opens on the meal's date without adding duplicate navigation history.
- **Meal details:** tap a meal to edit any field (including moving it to another meal type or date), duplicate it into a new meal dated today, or delete it.
- **Deleting:** every meal row has a visible delete button. Long-pressing a row and the screen-reader "Delete" action are shortcuts. Every deletion asks for confirmation.
- **All Meals (history):** every logged meal, grouped by local date (newest first) with daily calorie totals, in a virtualized list. "Delete All" removes the entire history after a separate confirmation.
- **Copy / Share summary:** copy or share a plain-text summary of the selected day, including consumed, goal, and remaining or exceeded values for each macro.
- **Local persistence:** on Android and iOS, meals are stored in an on-device SQLite database. On first launch after updating, meals saved by earlier versions are copied from AsyncStorage automatically. On web, meals stay in AsyncStorage (browser storage). Everything works offline.
- **Meal reminders (not reachable in the UI yet):** code exists for daily lunch and dinner notifications, but no screen renders it.

## Technology stack

| Area          | Technology                                                        |
| ------------- | ----------------------------------------------------------------- |
| Framework     | [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/), React Native 0.81, React 19.1 |
| Navigation    | Expo Router 6 (file-based routing, typed routes)                  |
| Language      | TypeScript 5.9 (`strict`)                                         |
| Persistence   | `expo-sqlite` (Android, iOS); `@react-native-async-storage/async-storage` (web meals, legacy data, small preferences) |
| Device APIs   | `expo-notifications`, `expo-haptics`, `expo-clipboard`, `expo-crypto` |
| Pickers       | `@react-native-community/datetimepicker` (Android and iOS; web uses HTML inputs) |
| Tooling       | ESLint 9 (`eslint-config-expo`), Expo Doctor, React Compiler (experimental) |
| Testing       | Jest 29 with `jest-expo`                                          |

The New Architecture is enabled (`newArchEnabled: true`).

## Local setup

Prerequisites:

- Node.js 22.5 or later (local database tests use Node's built-in `node:sqlite`) and npm
- The [Expo Go](https://expo.dev/go) app on a device, or an Android emulator / iOS simulator

```bash
git clone https://github.com/Orgitogj/Macrozone.git
cd Macrozone
npm ci
npm start
```

In the Expo CLI, press `a` for Android, `i` for iOS, or `w` for web, or scan the QR code with Expo Go.

> Note: Expo Go on Android does not support remote push notifications on SDK 53+. MacroZone only uses local scheduled reminders, but the reminders phase will check notification behavior in a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

## Available commands

| Command             | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `npm start`         | Start the Expo development server                        |
| `npm run android`   | Start and open on Android                                |
| `npm run ios`       | Start and open on iOS                                    |
| `npm run web`       | Start and open in a browser                              |
| `npm run lint`      | Run ESLint through `expo lint`                           |
| `npm run typecheck` | Run the TypeScript compiler without emitting files       |
| `npm test`          | Run unit tests once                                      |
| `npm run test:watch`| Run unit tests in watch mode                             |
| `npm run check`     | Run lint, typecheck, and tests                           |
| `npm run doctor`    | Run Expo Doctor (checks config and dependency versions)  |

When adding or updating Expo-related packages, use `npx expo install <package>` so that versions stay compatible with the installed SDK.

## Project structure

```text
src/
  app/                        Expo Router routes (thin: they render feature screens)
    _layout.tsx               Root stack (tabs plus meal detail screens)
    (tabs)/                   Home, Add Meal, All Meals tabs
    meal/[id].tsx             Edit meal
    meal/new.tsx              Duplicate meal (?duplicateOf=<id>)
  features/
    meals/
      components/             Presentational meal UI (form, macro grid, meal rows, history list, copy/share)
      hooks/                  useMeals, useMeal, useMealForm, useMealNavigation
      screens/                Home, MealHistory, CreateMeal, EditMeal
      services/mealActions.ts Use cases: load, save, submit form, confirm-and-delete meal/day/all
      repositories/           MealRepository interface, SQLite and AsyncStorage implementations,
                              row mapping, legacy AsyncStorage import, getMealRepository(.web).ts
      utils/                  Pure logic: totals, date filtering/grouping, summaries, record normalization
      validation/mealForm.ts  Form values, validation rules and messages
      types.ts, constants.ts
      index.ts                Public API of the feature
    nutrition-goals/          Goal types, default goals, remaining/exceeded calculations
  components/
    layout/FormScreen.tsx     Scrollable, keyboard-aware form screen
    ui/                       Shared UI: AppButton, AppTextInput, FormField, SegmentedControl, DateNavigator,
                              DateTimePickerField (.tsx native, .web.tsx web), IconButton, TextButton,
                              loading/empty/error states
    ReminderToggle.tsx        Not yet rendered (reminders phase)
  hooks/                      Cross-feature hooks: useSelectedDate, useTodayDateKey
  storage/database/           SQLite access: SqlDatabase interface, open/prepare, ordered schema migrations
  types/nutrition.ts          Shared nutrition types (MacroTotals)
  utils/                      Pure shared utilities: dates, times, date/time input conversion, number input, formatting, ids,
                              single-flight guard, serial queue, checksum, route params, confirmation dialog
  styles/global.ts            Shared colors and base styles
jest.environment.js           Jest environment: pins/switches timezones, provides in-memory SQLite for tests
assets/images/                App icon, adaptive icons, splash image, favicon
```

Import paths use the `@/` alias, which maps to `src/` (see `tsconfig.json`). For example, `import { HomeScreen } from '@/features/meals'`. Use `./` only for files in the same folder. Route files and other features import a feature through its `index.ts`.

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

Screens, hooks, and components never touch a database. They use use cases in `features/meals/services`, which depend only on the `MealRepository` interface:

```text
Screens → hooks/services → MealRepository → SQLite (Android, iOS) | AsyncStorage (web)
```

`getMealRepository()` is split into `getMealRepository.ts` (SQLite) and `getMealRepository.web.ts` (AsyncStorage), so web bundles never include SQLite. `expo-sqlite` web support is still in alpha and needs special hosting headers.

### SQLite schema (`macrozone.db`, schema version 1)

| Table | Purpose | Key columns and constraints |
| ----- | ------- | --------------------------- |
| `meals` | Logged meals | `id TEXT PRIMARY KEY`, `name`, `calories`/`protein`/`carbs`/`fat REAL` (must be numeric), `meal_type` (breakfast, lunch, dinner, snack), `local_date` (`YYYY-MM-DD`), `local_time` (`HH:MM` or null), `created_at`, `updated_at`, `extra_json` (valid JSON or null) |
| `app_metadata` | App-level markers such as the legacy-import record | `key TEXT PRIMARY KEY`, `value` (valid JSON), `updated_at` |
| `legacy_meal_records` | Raw legacy records that could not be imported as meals, kept for recovery | `source_index`, `raw_json`, `reason` (`unreadable`, `duplicate_id`, `conflict`, `unparseable_source`), `imported_at` |

Indexes: `(local_date, local_time, created_at)`, `(local_date, meal_type)`, and `(created_at)`.

### Schema migrations

- Schema versions are tracked with `PRAGMA user_version`. Migrations are an ordered, consecutively numbered list in `src/storage/database/schemaMigrations.ts`.
- Each migration runs in an exclusive transaction together with its version bump. A failed migration rolls back completely and leaves the previous version in place.
- A database created by a newer app version is refused rather than modified.
- Future data (goals, favorites, measurements, reminders) will be added as new numbered migrations in the phases that introduce those features.

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
- **Exclusive transactions.** Multi-statement work (updates, delete-all, migrations, import) runs in exclusive transactions.
- **One setup per launch.** Database setup is cached, so concurrent screens trigger a single migration and import. A failed setup is retried on the next call.
- **Delete All** removes all rows from `meals` only. Migration-recovery records in `legacy_meal_records` and the legacy AsyncStorage backup are kept; no ordinary meal deletion (single meal, Clear Day, or Delete All) removes them.
- **Reverting to an older build.** An app version from before this change would read the untouched AsyncStorage snapshot, which does not include meals added afterwards.

## Testing

Business logic is implemented as pure functions and unit-tested with Jest (`npm test`).

- **Tests stay local.** Test files live next to the code in `__tests__/` folders, with shared helpers in `src/testing/`. Both paths are in `.gitignore`, so tests are not committed. The Jest configuration (`package.json` and `jest.environment.js`) is committed, and `npm test` passes when no tests are present.
- **Database tests use real SQLite.** `jest.environment.js` exposes an in-memory database from Node's built-in `node:sqlite` (Node 22.5 or later), adapted to the same `SqlDatabase` interface the app uses. This lets repository, migration, and import tests run real SQL, including constraints and transaction rollbacks, without a device.
- **Date tests are deterministic.** `jest.environment.js` runs every test file in UTC, whatever the machine timezone. Tests can switch to other timezones through the environment's `__setTestTimeZone` hook, for example to cover UTC+14, UTC−10, and DST changes. Setting `process.env.TZ` inside a test has no effect, because Jest sandboxes `process.env`.

## Current limitations

- Nutrition goals are fixed defaults (2,000 kcal / 150 g protein / 250 g carbs / 65 g fat).
- There are no serving sizes yet (planned together with recipes).
- The legacy AsyncStorage copy of pre-SQLite meals is kept on the device indefinitely. Removing it will be a separate, explicitly confirmed step.
- Raw legacy records that could not be imported are preserved, but there is no screen to review or recover them yet.
- On web, meals are stored in AsyncStorage (browser storage), not SQLite. Web writes are serialized within one tab, but separate browser tabs are not coordinated.
- On Android, the form scrolls, but the keyboard is not otherwise avoided (edge-to-edge keyboard handling is planned with the UX phase).
- Reminders cannot be reached in the UI, and they cancel *all* scheduled notifications rather than only MacroZone's own.
- The app uses a dark-only theme and fixed top padding instead of safe areas.
- If Home is left open on today past midnight, it moves to the new day the next time the screen gains focus.
- `npm audit` reports advisories in transitive Expo CLI and build-tooling dependencies. npm's only suggested fix is an Expo major-version upgrade, so these are tracked rather than force-fixed.

## Roadmap

Work proceeds one phase at a time:

0. **Repository cleanup and baseline:** tooling, scripts, dependency hygiene, documentation.
1. **Correct daily tracking:** domain types, local-date utilities, selected-day totals, date navigation, history grouped by date, unit tests.
2. **Safe meal management:** validated forms, meal types, edit, duplicate, and delete flows, confirmations, accessibility.
3. **Storage architecture:** SQLite repository layer, versioned schema migrations, safe one-time import from AsyncStorage.
4. **Personalized goals and onboarding:** BMR/TDEE-based estimates and editable goals.
5. **Home and diary UX:** design system, light/dark themes, safe areas, a diary grouped by meal type.
6. **Reminders and settings:** configurable, platform-correct notifications.
7. **Fast logging:** favorites, recent foods, saved meals, recipes, servings.
8. **Progress tracking:** weight, body measurements, trends, charts.
9. **Accounts and optional cloud sync:** Supabase, with offline use preserved.
10. **Advanced features:** evaluated and delivered as separate projects (food database, barcode scanning, health platform integrations, and so on).

Nutrition values and future goal calculations are estimates and are not medical advice.
