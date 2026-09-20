# MacroZone privacy notes

This is a working document for the MacroZone app, written to prepare a store listing. It is not legal advice and it is
not a finished privacy policy. Before publishing, the publisher must add their own identity, contact address, legal
basis, retention periods and a review by someone qualified to give that advice.

Placeholders that the publisher must fill in before submission are marked `TODO`.

- **Who publishes the app:** TODO (name and contact address of the publisher).
- **Privacy contact:** TODO (an address a user can write to).
- **Where cloud data is stored:** the Supabase project and region chosen by the publisher. TODO (name the region).

## What MacroZone stores on the device

Everything below stays on the device unless the person creates an account and MacroZone syncs it.

| Data | Where it is stored |
| ---- | ------------------ |
| Meals, foods, saved meals, recipes, barcode links | SQLite on Android and iOS (`macrozone.db`, or `macrozone-account-<key>.db` for a signed-in account); browser storage on web |
| Nutrition goals and the body details used to calculate them (units, sex used by the formula, age, height, weight, activity level, goal) | Same database as above |
| What a logged meal was added from (library item, AI estimate, or barcode product), including the product barcode | Same database as above |
| Reminder settings, theme preference, AI preferences, the Open Food Facts product cache | Device storage (AsyncStorage); never synced |
| Sign-in session, when signed in | Encrypted device storage (`expo-secure-store`) on Android and iOS; browser storage on web |

MacroZone does not collect analytics, advertising identifiers or crash telemetry. There is no third-party analytics
SDK in the app, and no nutrition, health or identity data is sent anywhere for measurement.

## What leaves the device

| Trigger | What is sent | To whom |
| ------- | ------------ | ------- |
| The person taps Analyze on an AI estimate | The meal description or the photo they chose | The MacroZone AI service operated by the publisher, which forwards it to the configured model provider |
| The person scans or types a barcode | The barcode number and a `User-Agent` containing the app version and the configured public contact | Open Food Facts |
| The person creates an account or signs in | Email address and password | Supabase Auth (the publisher's project) |
| The person is signed in and syncing | Meals, foods, saved meals, recipes, barcode links and nutrition goals | The publisher's Supabase project |
| The person deletes their account | The access token and the password, for a server-side re-check | The publisher's Supabase project |

Without an account, none of the sync traffic happens. AI and barcode lookup only run when the person starts them, and
both can be left unconfigured, in which case the app says the feature is unavailable.

## Accounts, sync and deletion

- An account is optional. MacroZone is fully usable without one.
- Each account's data is kept in its own local database, separate from the data logged without an account.
- Row-level security in the cloud restricts every row to the account that owns it.
- **Deleting an account** removes the cloud copy of that account: meals, foods, saved meals, recipes, nutrition goals,
  sync bookkeeping and the account record itself. Before it deletes anything, MacroZone offers to copy the data into
  the on-device (guest) data, and it checks that the copy is complete. The account's local database is removed at the
  end, because it can no longer be opened once the account is gone. Data logged before signing in is never deleted.
- Exporting data to a file is not implemented yet.

## Permissions

| Permission | Why | When it is requested |
| ---------- | --- | -------------------- |
| Camera | Scanning a food barcode, and taking a meal photo for an AI estimate | Only when the person opens the scanner or chooses to take a photo |
| Photo library | Choosing an existing meal photo for an AI estimate | Only when the person chooses a photo |
| Notifications | Local meal reminders | Only when the person turns a reminder on |

MacroZone never records audio, and it does not use location.

## Data sources and attribution

- Product data comes from **Open Food Facts** and is shown with attribution in the app. Open Food Facts data is
  published under the Open Database License (ODbL); product images are under Creative Commons licences. The app links
  to the product page so the person can check the source. Contributors keep their rights.
- AI estimates are produced by the model provider configured for the publisher's AI service. They are estimates and are
  labelled as such throughout the app.
- Nutrition targets are estimates from general population formulas, not medical advice.

## Children

MacroZone is not designed for children, and the publisher should state an age limit in the store listing. TODO.

## Changes

TODO: state how people will be told about changes to this document.
