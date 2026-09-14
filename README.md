# MacroZone

MacroZone is a mobile meal and macronutrient tracker built with Expo and React Native. It aims to become an offline-first nutrition and fitness tracking app built around one core workflow:

```text
Select a date → log food → view daily macros → track progress
```

The app is currently an early MVP. All data stays on the device.

## Current features

- **Onboarding (new users):** on first launch, choose to calculate personalized targets, enter targets manually, or skip for now.
  - The calculator asks for units, the sex used by the formula (female, male, or not specified), age, height, weight, activity level, and a goal (lose, maintain, or gain) with a weekly rate.
  - Before saving, it shows BMR, TDEE, the calorie target, macros, and an explanation of the formulas.
  - Everything is presented as an estimate, not medical advice.
- **Navigation:** three tabs (Home, Add, Diary). The tab bar hides while the keyboard is open.
- **Nutrition Goals, reminders, and appearance:** open from the options button in the Home header to review targets and saved details, recalculate them, edit them manually, open meal reminders, or choose the theme.
- **Home (daily dashboard):** move to the previous or next day, or jump back to today. Future dates are not selectable.
  - A calorie card shows calories eaten against the estimated target, with a progress bar and one status: "left", "Target reached", or "over". Protein, carbs, and fat follow as compact progress cards. Every card has a text equivalent for screen readers, and status is never shown by color alone.
  - Meals are grouped into Breakfast, Lunch, Dinner, and Snacks, each with its calorie subtotal and an "Add" button that opens the meal form preset to that meal type and the selected date. Empty sections show a short hint instead of a large empty state.
  - "Clear Day" deletes the selected day's meals after confirmation.
  - Users who already have meals but have not set goals see a dismissible "Personalize your goals" suggestion.
  - Copy and Share are secondary actions at the bottom of the day.
  - If refreshing fails after data has loaded, the data stays visible with a warning and a "Try again" button.
- **Themes:** System (default), Light, or Dark, chosen on the Nutrition Goals screen and remembered on the device. System follows the device setting and falls back to dark when the device does not report one. The status bar, navigation bars, tab bar, iOS picker sheet, web inputs, and the root background follow the active theme.
- **Add Meal:** log a meal with a name, meal type (breakfast, lunch, dinner, snack), date (today or earlier), an optional time, calories, and optional protein, carbs, and fat.
  - The date is chosen with a native date picker (future dates are blocked) or with the previous/next-day and Today controls. The optional time uses a native time picker and can be cleared.
  - On Android the pickers open as system dialogs. On iOS they open in a bottom sheet with Cancel and Done. On web they use the browser's date and time inputs. Saving is disabled while a picker is open.
  - Fields are validated inline. Decimals accept `.` or `,`, negative values are rejected, and limits are 10,000 kcal and 1,000 g per macro.
  - While saving, the button shows progress and ignores repeated taps. If saving fails, the form keeps what you entered.
  - After saving, Home opens on the meal's date without adding duplicate navigation history.
- **Meal details:** tap a meal to edit any field (including moving it to another meal type or date), duplicate it into a new meal dated today, or delete it.
- **Deleting:** every meal row has a visible delete button. Long-pressing a row and the screen-reader "Delete" action are shortcuts. Every deletion asks for confirmation.
- **Diary (history):** every logged meal, grouped by local date (newest first) with daily calorie totals and meal counts, in a virtualized list. Each day has its own "Clear Day" action. "Delete all history" is a low-emphasis action at the end of the list and asks for a separate confirmation.
- **Copy / Share summary:** copy or share a plain-text summary of the selected day, including consumed, goal, and remaining or exceeded values for each macro.
- **Local persistence:** on Android and iOS, meals are stored in an on-device SQLite database. On first launch after updating, meals saved by earlier versions are copied from AsyncStorage automatically. On web, meals stay in AsyncStorage (browser storage). Everything works offline.
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
| `npm test`          | Run unit tests once                                      |
| `npm run test:watch`| Run unit tests in watch mode                             |
| `npm run check`     | Run lint, typecheck, and tests                           |
| `npm run doctor`    | Run Expo Doctor (checks config and dependency versions)  |

When adding or updating Expo-related packages, use `npx expo install <package>` so that versions stay compatible with the installed SDK.

## Project structure

```text
src/
  app/                        Expo Router routes (thin: they render feature screens)
    _layout.tsx               Root stack inside the theme provider (tabs plus detail screens)
    (tabs)/                   Home (index.tsx), Add (add.tsx), Diary (diary.tsx)
    meal/[id].tsx             Edit meal
    meal/new.tsx              New meal preset from Home (?date=&mealType=) or a duplicate (?duplicateOf=<id>)
    onboarding.tsx            First-run goal setup (shown only while the onboarding gate requires it)
    goals/                    Nutrition Goals overview, calculator (calculate.tsx), manual editor (edit.tsx)
  features/
    meals/
      components/             Presentational meal UI (form, calorie and macro cards, meal-type sections,
                              meal rows, history list, copy/share actions)
      hooks/                  useMeals, useMeal, useMealForm, useMealNavigation
      screens/                Home, MealHistory (Diary), CreateMeal, EditMeal
      services/mealActions.ts Use cases: load, save, submit form, confirm-and-delete meal/day/all
      repositories/           MealRepository interface, SQLite and AsyncStorage implementations,
                              row mapping, legacy AsyncStorage import, getMealRepository(.web).ts
      utils/                  Pure logic: totals, date filtering/grouping, meal-type sections, new-meal route
                              params, summaries, record normalization
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
  theme/                      Design system: semantic light/dark palettes, spacing, radii, typography,
                              sizes, theme preference (resolution, storage), AppThemeProvider and hooks
  components/
    layout/                   Screen (safe areas, max width) and ScrollScreen (scrolling, keyboard-aware)
    ui/                       Shared UI: AppText, AppCard, AppButton, TextButton, IconButton, AppTextInput,
                              FormField, SegmentedControl, ChoiceList, DateNavigator, DateTimePickerField
                              (.tsx native, .web.tsx web), ProgressBar, ScreenHeader, SectionHeader,
                              KeyValueRow, NoticeCard, StepHeader, AppSwitch, loading/empty/error states
  hooks/                      Cross-feature hooks: useSelectedDate, useTodayDateKey
  storage/database/           SQLite access: SqlDatabase interface, open/prepare, ordered schema migrations
  types/nutrition.ts          Shared nutrition types (MacroTotals)
  utils/                      Pure shared utilities: dates, times, date/time input conversion, number input, formatting, ids,
                              single-flight guard, serial queue, checksum, route params, async loading state,
                              device time zone, confirmation dialog
jest.environment.js           Jest environment: pins/switches timezones, provides in-memory SQLite for tests
assets/images/                App icon, adaptive icons, splash image, favicon
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

Screens, hooks, and components never touch a database. They use use cases in `features/meals/services`, which depend only on the `MealRepository` interface:

```text
Screens → hooks/services → MealRepository → SQLite (Android, iOS) | AsyncStorage (web)
```

`getMealRepository()` is split into `getMealRepository.ts` (SQLite) and `getMealRepository.web.ts` (AsyncStorage), so web bundles never include SQLite. `expo-sqlite` web support is still in alpha and needs special hosting headers.

### SQLite schema (`macrozone.db`, schema version 2)

| Table | Purpose | Key columns and constraints |
| ----- | ------- | --------------------------- |
| `meals` | Logged meals | `id TEXT PRIMARY KEY`, `name`, `calories`/`protein`/`carbs`/`fat REAL` (must be numeric), `meal_type` (breakfast, lunch, dinner, snack), `local_date` (`YYYY-MM-DD`), `local_time` (`HH:MM` or null), `created_at`, `updated_at`, `extra_json` (valid JSON or null) |
| `app_metadata` | App-level markers such as the legacy-import record | `key TEXT PRIMARY KEY`, `value` (valid JSON), `updated_at` |
| `legacy_meal_records` | Raw legacy records that could not be imported as meals, kept for recovery | `source_index`, `raw_json`, `reason` (`unreadable`, `duplicate_id`, `conflict`, `unparseable_source`), `imported_at` |

| `user_profile` (v2) | The one saved body profile used for goal calculation | `id` (always 1), `unit_system`, `sex` (female, male, unspecified), `age_years`, `height_cm`, `weight_kg`, `activity_level`, `weight_goal`, `weekly_rate_kg`, `updated_at` |
| `nutrition_goals` (v2) | The current daily targets | `id` (always 1), `calories`/`protein`/`carbs`/`fat` (non-negative), `source` (calculated or manual), `updated_at` |

Indexes: `(local_date, local_time, created_at)`, `(local_date, meal_type)`, and `(created_at)`.

Onboarding status (`completed` or `skipped`) is stored in `app_metadata` under the key `onboarding`. Saving goals writes the profile (when calculated), goals, and status in one exclusive transaction. On web, the whole plan is one JSON value under the AsyncStorage key `nutrition_plan`.

### Schema migrations

- Schema versions are tracked with `PRAGMA user_version`. Migrations are an ordered, consecutively numbered list in `src/storage/database/schemaMigrations.ts`.
- Each migration runs in an exclusive transaction together with its version bump. A failed migration rolls back completely and leaves the previous version in place.
- A database created by a newer app version is refused rather than modified.
- Version 2 adds `user_profile` and `nutrition_goals` without changing existing tables.
- Future data (favorites, measurements) will be added as new numbered migrations in the phases that introduce those features. Meal reminders are device settings and are stored in AsyncStorage, not SQLite.

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
- There are no serving sizes yet (planned together with recipes).
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
7. **Fast logging:** favorites, recent foods, saved meals, recipes, servings.
8. **Progress tracking:** weight, body measurements, trends, charts.
9. **Accounts and optional cloud sync:** Supabase, with offline use preserved.
10. **Advanced features:** evaluated and delivered as separate projects (food database, barcode scanning, health platform integrations, and so on).

Nutrition values and future goal calculations are estimates and are not medical advice.
