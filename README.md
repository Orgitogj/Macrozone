# MacroZone

MacroZone is a mobile meal and macronutrient tracker built with Expo and React Native. It aims to become an offline-first nutrition and fitness tracking app built around one core workflow:

```text
Select a date → log food → view daily macros → track progress
```

The app is currently an early MVP. All data stays on the device.

## Current features

- **Home (daily view):** move to the previous or next day, or jump back to today. Future dates are not selectable. Calorie, protein, carb, and fat totals for the selected day are shown against fixed goals, followed by that day's meals.
- **Add Meal:** log a meal with a name, calories, and optional protein, carbs, and fat. The meal is assigned to today's local date, and Home then opens on that day.
- **All Meals (history):** every logged meal, grouped by local date (newest first) with daily calorie totals, in a virtualized list. Includes a "Clear All" action.
- **Delete a meal:** long-press a meal and confirm. The delete action is also available to screen readers.
- **Copy / Share summary:** copy or share a plain-text summary of the selected day, including consumed, goal, and remaining or exceeded values for each macro.
- **Local persistence:** meals are stored on the device with AsyncStorage. Data saved by earlier versions keeps loading.
- **Meal reminders (not reachable in the UI yet):** code exists for daily lunch and dinner notifications, but no screen renders it.

## Technology stack

| Area          | Technology                                                        |
| ------------- | ----------------------------------------------------------------- |
| Framework     | [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/), React Native 0.81, React 19.1 |
| Navigation    | Expo Router 6 (file-based routing, typed routes)                  |
| Language      | TypeScript 5.9 (`strict`)                                         |
| Persistence   | `@react-native-async-storage/async-storage`                       |
| Device APIs   | `expo-notifications`, `expo-haptics`, `expo-clipboard`            |
| Tooling       | ESLint 9 (`eslint-config-expo`), Expo Doctor, React Compiler (experimental) |
| Testing       | Jest 29 with `jest-expo`                                          |

The New Architecture is enabled (`newArchEnabled: true`).

## Local setup

Prerequisites:

- Node.js LTS and npm
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
    _layout.tsx               Root stack
    (tabs)/                   Home, Add Meal, All Meals tabs
  features/
    meals/
      components/             Presentational meal UI (macro grid, meal rows, history list, copy/share)
      hooks/useMeals.ts       Load on focus, delete, clear, loading/error state
      screens/                HomeScreen, MealHistoryScreen
      storage/mealStorage.ts  AsyncStorage access and legacy-data handling
      utils/                  Pure logic: totals, date filtering/grouping, summaries, record normalization
      types.ts, constants.ts
      index.ts                Public API of the feature
    nutrition-goals/          Goal types, default goals, remaining/exceeded calculations
  components/
    ui/                       Shared UI: DateNavigator, IconButton, TextButton, loading/empty/error states
    ReminderToggle.tsx        Not yet rendered (reminders phase)
  hooks/                      Cross-feature hooks: useSelectedDate, useTodayDateKey
  types/nutrition.ts          Shared nutrition types (MacroTotals)
  utils/                      Pure shared utilities: local dates, number formatting, confirmation dialog
  styles/global.ts            Shared colors and base styles
jest.environment.js           Jest environment that pins and switches timezones
assets/images/                App icon, adaptive icons, splash image, favicon
```

Import paths use the `@/` alias, which maps to `src/` (see `tsconfig.json`). For example, `import { HomeScreen } from '@/features/meals'`. Use `./` only for files in the same folder. Route files and other features import a feature through its `index.ts`.

## Dates and data compatibility

- **Local calendar days.** Every meal belongs to a local calendar day, stored as a `YYYY-MM-DD` key (`LocalDateKey`) that is computed from the device's local time. Days are never derived from the UTC ISO string, which would put late-evening or early-morning meals on the wrong day.
- **Selected day in the URL.** Home keeps the selected day in its `date` route parameter (`/?date=2026-09-13`). Missing, invalid, or future values fall back to today.
- **Older saved meals keep working.** Meals saved before this version have no `date` or `mealType`. When they are read, `date` is derived from `createdAt` in the device's current timezone, `mealType` is inferred from the local time of day, and missing numbers become 0. Nothing is rewritten.
- **New meals** store `date` and `mealType` explicitly.
- **Unreadable data is never overwritten.** Stored records that cannot be interpreted are hidden but preserved when meals are added or deleted. If the stored data is corrupted, the app shows an error instead of replacing it.

## Testing

Business logic is implemented as pure functions and unit-tested with Jest (`npm test`).

- **Tests stay local.** Test files live next to the code in `__tests__/` folders, with shared helpers in `src/testing/`. Both paths are in `.gitignore`, so tests are not committed. The Jest configuration (`package.json` and `jest.environment.js`) is committed, and `npm test` passes when no tests are present.
- **Date tests are deterministic.** `jest.environment.js` runs every test file in UTC, whatever the machine timezone. Tests can switch to other timezones through the environment's `__setTestTimeZone` hook, for example to cover UTC+14, UTC−10, and DST changes. Setting `process.env.TZ` inside a test has no effect, because Jest sandboxes `process.env`.

## Current limitations

- Meals can only be logged for today. There is no date, time, or meal-type field in the Add Meal form yet.
- Meal types are stored (inferred from the time of day) but not yet shown or editable.
- Nutrition goals are fixed defaults (2,000 kcal / 150 g protein / 250 g carbs / 65 g fat).
- There is no editing. Meals can only be deleted, and only by long-pressing (or through the screen-reader action).
- "Clear All" deletes all history immediately, with no confirmation.
- Form validation is minimal: non-numeric or negative values are not rejected.
- Storage has no schema versioning and no protection against concurrent writes. Meal IDs come from `Date.now()`. Older meals' dates are derived when they are read, so they can shift if the device timezone changes, until the storage migration saves them.
- Reminders cannot be reached in the UI, and they cancel *all* scheduled notifications rather than only MacroZone's own.
- The app uses a dark-only theme and fixed top padding instead of safe areas.
- If Home is left open on today past midnight, it moves to the new day the next time the screen gains focus.
- `npm audit` reports advisories in transitive Expo CLI and build-tooling dependencies. npm's only suggested fix is an Expo major-version upgrade, so these are tracked rather than force-fixed.

## Roadmap

Work proceeds one phase at a time:

0. **Repository cleanup and baseline:** tooling, scripts, dependency hygiene, documentation.
1. **Correct daily tracking:** domain types, local-date utilities, selected-day totals, date navigation, history grouped by date, unit tests.
2. **Safe meal management:** validated forms, meal types, edit, duplicate, and delete flows, confirmations, accessibility.
3. **Storage architecture:** repository layer, schema versioning, migrations, evaluation of SQLite.
4. **Personalized goals and onboarding:** BMR/TDEE-based estimates and editable goals.
5. **Home and diary UX:** design system, light/dark themes, safe areas, a diary grouped by meal type.
6. **Reminders and settings:** configurable, platform-correct notifications.
7. **Fast logging:** favorites, recent foods, saved meals, recipes, servings.
8. **Progress tracking:** weight, body measurements, trends, charts.
9. **Accounts and optional cloud sync:** Supabase, with offline use preserved.
10. **Advanced features:** evaluated and delivered as separate projects (food database, barcode scanning, health platform integrations, and so on).

Nutrition values and future goal calculations are estimates and are not medical advice.
