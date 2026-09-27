# MacroZone development and release

Commands, build profiles, the release checklist, rollback notes, current limitations and
the phase roadmap. See the [README](../README.md) to run the app, and
[ARCHITECTURE.md](ARCHITECTURE.md) for how it is built.

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
| `npm run typecheck:functions` | Type-check the Supabase Edge Function in `supabase/functions/` |
| `npm run server:install` | Install the AI service dependencies from its lockfile |
| `npm run server:start` | Start the AI service (requires the environment variables below) |
| `npm test`          | Run unit tests once                                      |
| `npm run test:watch`| Run unit tests in watch mode                             |
| `npm run check`     | Run lint, app and server typechecks, and tests           |
| `npm run doctor`    | Run Expo Doctor (checks config and dependency versions)  |
| `npm run check:secrets` | Scan every tracked text file for keys, tokens and private keys |
| `npm run check:tracked` | Fail if tests, `.env` files, build output or signing material are tracked |
| `npm run check:migrations` | Static review of the Supabase migrations (RLS, policies, grants, search_path) |
| `npm run check:bundle <dir>` | Scan an `expo export` output for secrets and server-only names |
| `npm run release:check` | Everything in `npm run check`, plus the three scans above and Expo Doctor |

When adding or updating Expo-related packages, use `npx expo install <package>` so that versions stay compatible with the installed SDK.

## Releasing MacroZone

### Environments

| Environment | How it runs | Supabase project | Open Food Facts |
| ----------- | ----------- | ---------------- | --------------- |
| Development | `npm start` with a development build or Expo Go | A local or disposable project | Staging by default |
| Preview | `eas build --profile preview` (internal distribution) | A disposable non-production project | Staging |
| Production | `eas build --profile production` | The production project | Production |

The profiles live in `eas.json`. Each one sets `EXPO_PUBLIC_OPEN_FOOD_FACTS_ENV`; every other public variable is
supplied per profile through EAS environment variables. `app.json` carries the identifiers used by both stores:

| Setting | Value |
| ------- | ----- |
| iOS bundle identifier | `com.macrozone.app` |
| Android package | `com.macrozone.app` |
| Version | `1.0.0` (`ios.buildNumber` `1`, `android.versionCode` `1`) |
| Runtime version | Follows the app version |

**Change both identifiers before the first store submission if you publish under a different domain**: they can never
be changed afterwards for an app that is already listed.

### Environment variables

Only the five public variables in `.env.example` exist, and all of them are compiled into the bundle. At startup a
development build prints a line for every optional feature that is misconfigured, and it refuses to treat any value
that looks like a secret (a JWT, `sb_secret_…`, `sbp_…`, `sk-…`, a private key block) as configuration. A missing or
invalid value never breaks the app: the feature says it is unavailable and everything else keeps working.

**No service-role key, database password, JWT signing secret or management token belongs in the app, `app.json`,
`eas.json` or any `EXPO_PUBLIC_*` variable.** The only place a service-role key is used is inside the `delete-account`
Edge Function, where Supabase injects it into the server environment.

### Database migrations

```bash
supabase link --project-ref <ref>
supabase db push                 # applies supabase/migrations in filename order
npm run check:migrations         # static review of RLS, policies, grants and search_path
```

Both migrations are safe to run on a fresh database and on one that already has the earlier migration: tables use
`create table if not exists`, functions use `create or replace`, and the removed deletion RPC is dropped with
`drop function if exists`.

### Edge Function

```bash
supabase functions deploy delete-account     # keep JWT verification on
supabase functions logs delete-account       # outcome lines only: no tokens, emails or ids
```

The function reads `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from the server environment that
Supabase provides. It accepts only `POST` with a JSON body of at most 4 KB, requires a valid access token, re-checks the
password with GoTrue, rate limits repeated attempts per caller, and ignores any user id in the request body.

### EAS builds

```bash
npm install --global eas-cli
eas login
eas init                       # writes the project id into app.json
eas build --profile preview --platform android
eas build --profile production --platform all
eas submit --profile production --platform all
```

### Deploying accounts and sync

Do this first in a disposable, non-production Supabase project.

1. **Create the project** and note its URL and publishable (anon) key. Nothing else from the dashboard goes into the app.
2. **Apply the migrations in order** with the Supabase CLI (`supabase link`, then `supabase db push`): `20260917000000_macrozone_account_sync.sql`, then `20260918000000_protected_account_deletion.sql`. The CLI runs them as the `postgres` role, which therefore owns every function they create.
3. **Check ownership and grants** in the SQL editor:
   ```sql
   select p.proname, pg_get_userbyid(p.proowner) as owner, p.prosecdef, p.proconfig
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('sync_push', 'sync_pull', 'delete_account_data');

   select has_function_privilege('anon', 'public.delete_account_data(uuid)', 'execute'),          -- false
          has_function_privilege('authenticated', 'public.delete_account_data(uuid)', 'execute'), -- false
          has_function_privilege('service_role', 'public.delete_account_data(uuid)', 'execute');  -- true
   ```
   Expect owner `postgres`, `prosecdef = true`, and `search_path=""` for all three, and `public.delete_my_account` to no longer exist.
4. **Deploy the Edge Function** with `supabase functions deploy delete-account`. Keep JWT verification on (the default). The function reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, which Supabase injects into every function's server environment; do not add them to the app, `app.json`, `.env*`, or any `EXPO_PUBLIC_*` variable.
5. **Configure Auth** under Authentication: enable email confirmation; set the minimum password length to at least 8 (MacroZone's own minimum) and enable leaked-password protection if your plan offers it; keep the default rate limits for sign-in and password grants.
6. **Add redirect URLs** under Authentication → URL Configuration: `macrozone://auth/callback` and `macrozone://auth/reset-password` for builds, the matching `exp://…/--/auth/callback` and `exp://…/--/auth/reset-password` forms if you test in Expo Go, and `https://<your web origin>/auth/callback` and `https://<your web origin>/auth/reset-password` for the web build. Set the Site URL to your web origin.
7. **Build the app** with only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set (in `.env.local` or the build service).
8. **Verify manually in the disposable project** before production: sign up, confirm the email, sign in on two devices, edit the same meal offline on both and resolve the conflict, sign out and back in, request and use a password reset link, reuse an expired link, back up guest data, then delete an account with each deletion choice. Also confirm that calling `rpc('delete_account_data', …)` with a signed-in user's token is refused, that the function refuses a wrong password, and that the function logs contain no emails, tokens, or passwords. Only then repeat steps 1–7 for production.

### Release checklist

1. `npm run release:check` (lint, all four typechecks, Jest, secret scan, tracked-file scan, migration review, Expo Doctor).
2. `npx expo export --platform android|ios|web` and `npm run check:bundle <output-dir>` for each one.
3. `git diff --check` and confirm a clean working tree.
4. Apply migrations and deploy the Edge Function to a disposable project, then run the manual checks below.
5. Bump `version`, `ios.buildNumber` and `android.versionCode` in `app.json`.
6. Build with the production profile, install it on a real device and repeat the manual checks against the production project.
7. Tag the release commit.

### Rollback

- **App:** the previous build stays available in the store console; halt the staged rollout or resubmit the previous
  build. Schema version 6 is additive, so an older build keeps working with a newer local database as long as its
  schema version is not higher than the build expects; a database created by a newer build is refused rather than
  downgraded.
- **Edge Function:** `supabase functions deploy delete-account` from the previous commit. While it is broken, account
  deletion fails closed and reports "not confirmed"; nothing is deleted.
- **Database:** the migrations only add objects, so a rollback means deploying the previous app build, not dropping
  tables. Never drop `sync_entities` or `sync_operations` to "reset" an account; use `delete_account_data`.
- **Sync:** if a release must be pulled, unsent local changes stay in each device's outbox and sync when a working
  build is installed.

### What is verified automatically, and what is not

- **Automated:** typechecks, lint, the full Jest suite (including the deletion barrier, account isolation, sync and
  Edge Function logic against fakes), the SQL contract in PGlite, Expo Doctor, all three exports, and the secret,
  tracked-file, migration and bundle scans.
- **Needs a disposable Supabase project:** sign-up and confirmation emails, password reset links, PKCE exchange, token
  refresh, real RLS enforcement, the deployed Edge Function, and account deletion end to end.
- **Needs a real device or emulator:** camera and barcode scanning, notifications and reminder delivery, SecureStore
  behavior, deep links from an email client, background and offline transitions, and performance on low-end hardware.

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
- Accounts and cloud backup need your own Supabase project. Without `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, MacroZone stays local-only and says so.
- The cloud SQL migrations in `supabase/migrations/` and the `delete-account` Edge Function have not been applied to or deployed in any project by this repository. Follow [Deploying accounts and sync](#deploying-accounts-and-sync).
- Exporting your data to a file is not implemented yet. When you delete an account you can copy its data into on-device (guest) mode instead.
- If the response to a successful account deletion is lost and the app retries, the server no longer recognizes the deleted session and the retry reports an expired session. The account is already gone; signing in again will fail with invalid credentials.
- Account sync covers meals (with their source snapshots), foods and their barcode links, saved meals, recipes, and the nutrition plan. Theme preference, reminders, the online product cache, legacy recovery records, and AI preferences stay on the device.
- On web, one browser tab writes at a time through a serial queue and compensating writes, but separate tabs are not coordinated: two tabs writing at the same moment can still interleave, because browser storage offers no cross-tab transaction. Use one tab at a time for the same account.
- Sync has been verified with automated tests, a fake cloud that mirrors the SQL contract, and the SQL itself in PGlite. The `delete-account` Edge Function's logic has been tested with GoTrue and PostgREST replaced by fakes. None of it has been run against a live Supabase project, in the Supabase Edge runtime, or on devices.
- The bundle identifiers (`com.macrozone.app`) are placeholders chosen for this repository; change them before the first store submission if you publish under a different domain.
- There is no crash or error reporting service. `reportError` logs to the console in development and forwards to a sink that nothing registers by default, so production builds stay silent until a sink is added.
- No analytics are collected, so there are no usage metrics to fall back on when diagnosing a report from a user.
- `PRIVACY.md` is a working document with placeholders, not a published privacy policy.
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
10. **Accounts and optional cloud sync:** optional accounts, secure cloud backup, and offline-first synchronization with Supabase, with local-only use preserved.
11. **Progress tracking:** weight, body measurements, trends, charts.
12. **Advanced features:** evaluated and delivered as separate projects (health platform integrations and so on).

See [PRIVACY.md](../PRIVACY.md) for what is stored on the device, what is synced, what leaves the device and what account
deletion removes.

Nutrition values and future goal calculations are estimates and are not medical advice.

