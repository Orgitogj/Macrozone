# MacroZone

MacroZone is an offline-first meal and macronutrient tracker for Android, iOS and the web, built with Expo and React
Native. Everything works on the device; an account, AI estimates and barcode lookup are optional extras.

```text
Select a date → log food → view daily macros → track progress
```

## How it works

- **Everything is local first.** Meals, foods and goals are saved on the device (SQLite on Android and iOS, browser
  storage on the web) and read straight from there, so the app works fully offline and never waits for a network call.
- **Three tabs.** Home is the selected day, Add is where food gets logged, and Diary is the full history.
- **One logging hub.** Every way of adding food — recent, favorites, your foods, saved meals, recipes, a barcode, an AI
  estimate, or manual entry — opens from the Add screen with the date and meal type already set.
- **Nothing is saved without review.** Barcode products and AI estimates are always shown for checking and editing
  first, and what you log is stored as a snapshot, so later edits to a food never change meals you already logged.
- **Optional account.** Signing in copies your data to your own cloud project and keeps devices in sync in the
  background. Without an account, nothing leaves the device.

## Features

**Daily tracking**
- Calorie and macro progress for the selected day, with meals grouped into breakfast, lunch, dinner and snacks.
- Move between days, jump back to today, clear a day, or copy a past day to today.
- Copy or share a plain-text summary of any day.

**Logging food**
- Manual entry with name, meal type, date, optional time, calories and macros.
- A food library with servings, favorites and search, plus saved meals and recipes you can reuse.
- Recent foods, one-tap amounts (½×, 1×, 2×), and duplicating or editing anything you saved.
- **Barcode scanning** (Android and iOS): scan or type a barcode, look the product up on Open Food Facts, review the
  nutrition, then add it. Missing values are never guessed, and products are cached for offline reuse.
- **AI estimates:** describe a meal or use a photo, then review every item, amount and macro before saving. Estimates
  are always labelled as estimates.

**Goals and reminders**
- Personalized calorie and macro targets calculated from your details, or set manually, with the formulas explained.
- Daily meal reminders per meal type (Android and iOS), which open the Add screen for that meal when tapped.

**Accounts and sync** (optional)
- Email sign-up and sign-in, email confirmation and password reset.
- Background sync with offline queueing; data logged before signing in can be copied into the account.
- When two devices change the same item, both versions are shown in plain language and you choose which to keep.
- Account deletion removes the cloud copy and can copy your data back to the device first.

**Throughout**
- Light, dark and system themes, safe-area and keyboard handling, tablet and web layouts.
- Screen-reader labels everywhere, status never shown by color alone, and text that scales with the system font size.
- Confirmation before anything destructive, and clear loading, empty, offline and error states.

## Run it locally

You need Node.js 22.18 or later, and either the [Expo Go](https://expo.dev/go) app on a phone or an Android emulator or
iOS simulator.

```bash
git clone https://github.com/Orgitogj/Macrozone.git
cd Macrozone
npm ci
npm start
```

Then press `a` for Android, `i` for iOS or `w` for web in the Expo CLI, or scan the QR code with Expo Go.

Notifications, the camera and barcode scanning are most reliable in a
[development build](https://docs.expo.dev/develop/development-builds/introduction/) rather than Expo Go.

### Optional services

Copy `.env.example` to `.env.local` and fill in only what you want to use:

| Variable | Enables |
| -------- | ------- |
| `EXPO_PUBLIC_AI_ENDPOINT_URL` | AI meal estimates, through your own [AI service](server/) |
| `EXPO_PUBLIC_OPEN_FOOD_FACTS_CONTACT` | Barcode product lookup (a public contact is required by Open Food Facts) |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Accounts, cloud backup and sync |

Every `EXPO_PUBLIC_*` value is compiled into the app and readable by anyone who has it, so no secret belongs there.
Leave a variable out and the app simply says that feature is unavailable; everything else keeps working.

## More

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how it is built: layers, storage, schema and each feature internally.
- [docs/RELEASE.md](docs/RELEASE.md) — commands, build profiles, release checklist, limitations and roadmap.
- [PRIVACY.md](PRIVACY.md) — what is stored, what is synced and what deletion removes.

Nutrition values and goal calculations are estimates, not medical advice.
