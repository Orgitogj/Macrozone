# MacroZone

MacroZone is a mobile meal and macronutrient tracker built with Expo and React Native. It aims to become an offline-first nutrition and fitness tracking app built around one core workflow:

```text
Select a date → log food → view daily macros → track progress
```

The app is currently an early MVP. All data stays on the device.

## Current features

- **Home:** today's date, calorie/protein/carb/fat totals shown against fixed goals, and a list of the five most recent meals.
- **Add Meal:** log a meal with a name, calories, and optional protein, carbs, and fat.
- **All Meals:** a list of every logged meal, with a "Clear All" action.
- **Delete a meal:** long-press a meal and confirm.
- **Copy / Share summary:** copy a macro summary to the clipboard, or share it through the system share sheet.
- **Local persistence:** meals are stored on the device with AsyncStorage.
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
| `npm run check`     | Run lint and typecheck together                          |
| `npm run doctor`    | Run Expo Doctor (checks config and dependency versions)  |

When adding or updating Expo-related packages, use `npx expo install <package>` so that versions stay compatible with the installed SDK.

## Project structure

```text
src/
  app/                      Expo Router routes
    _layout.tsx             Root stack
    (tabs)/
      _layout.tsx           Bottom tab navigator
      index.tsx             Home
      add-meal.tsx          Add Meal form
      meals.tsx             All Meals list
  components/               UI components (macro cards, meal rows, buttons, reminder toggle)
  storage/Meals.ts          AsyncStorage access for meals
  styles/global.ts          Shared colors and base styles
  utils/notifications.ts    Reminder scheduling helpers
assets/images/              App icon, adaptive icons, splash image, favicon
```

Import paths use the `@/` alias, which maps to `src/` (see `tsconfig.json`). For example, `import { getMeals } from '@/storage/Meals'`. Use `./` only for files in the same folder.

## Current limitations

- **Totals cover all meals, not one day.** Home, Copy Summary, and Share Summary add up every meal ever logged, even though they are labelled as daily.
- There is no date selection and no meal types (breakfast, lunch, and so on).
- Nutrition goals are hard-coded (2,000 kcal / 150 g protein / 250 g carbs / 65 g fat).
- There is no editing. Meals can only be deleted, and only by long-pressing.
- "Clear All" deletes all history immediately, with no confirmation.
- Form validation is minimal: non-numeric or negative values are not rejected.
- Storage has no schema versioning, no runtime validation, and no protection against concurrent writes. Meal IDs come from `Date.now()`.
- Reminders cannot be reached in the UI, and they cancel *all* scheduled notifications rather than only MacroZone's own.
- The app uses a dark-only theme with some hard-coded colors, and fixed top padding instead of safe areas.
- There are no automated tests yet.
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
