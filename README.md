# Wallet Tracker App

Wallet Tracker App is a React Native mobile application for tracking crypto wallets across multiple networks.
It is designed to help users follow wallet balances, token holdings, DeFi positions, transaction history, and wallet activity from a clean mobile interface.

This repository contains the **mobile frontend** of the project.

## Features

* Track multiple wallet addresses
* Multi-chain wallet support

  * Ethereum
  * Base
* Wallet detail screen with portfolio overview
* Token holdings list
* DeFi / protocol positions screen
* Transaction history by wallet
* Global activity feed across followed wallets
* Network filtering

  * All Networks
  * Ethereum
  * Base
* Suspicious token separation
* Low-value token grouping
* Notification history screen
* Compact mobile-first dark UI
* External explorer links for transactions
* Copyable wallet / counterparty addresses

## Tech Stack

* React Native
* TypeScript
* React Navigation
* React Native Vector Icons
* Clipboard support
* REST API integration with a Node.js backend

## Project Structure

```txt
src/
  api/              API clients
  components/       Shared UI components
  navigation/       App navigation
  screens/          Main app screens
  utils/            Formatting and chain helpers
```

Important screens:

```txt
src/screens/WalletsScreen.tsx
src/screens/WalletDetailScreen.tsx
src/screens/TokensScreen.tsx
src/screens/PositionsScreen.tsx
src/screens/EventsScreen.tsx
src/screens/ActivityScreen.tsx
src/screens/NotificationHistoryScreen.tsx
src/screens/SettingsScreen.tsx
```

## Backend

This frontend is designed to work with a separate backend service.

The backend is responsible for:

* Wallet management
* Holdings aggregation
* Portfolio summary
* DeFi positions
* Wallet events
* Webhook processing
* Notification delivery history

Make sure the backend server is running before using the app.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start Metro

```bash
npm start
```

### 3. Run on Android

In a second terminal:

```bash
npm run android
```

### 4. Run on iOS

Install CocoaPods dependencies first:

```bash
cd ios
pod install
cd ..
```

Then run:

```bash
npm run ios
```

## Environment / API Configuration

The app reads `API_BASE_URL` from its native build configuration. Supply the
backend origin (or an origin already ending in `/api/v1`); the app normalizes
trailing slashes and uses `/api/v1` exactly once. No `.env` file or JS source
edit is needed. The shared API client is the only place requests are built.

### Local Android emulator

Android Debug defaults to `http://10.0.2.2:3000`, which reaches a backend on
the host computer from the standard Android emulator. Start the backend on port
3000, then run `npm run android`. For a different development server, override
the build value, for example:

```bash
cd android
./gradlew :app:installDebug -PAPI_BASE_URL=http://10.0.2.2:3001
```

### Local iOS simulator

iOS Debug defaults to `http://localhost:3000`. Start the backend on the Mac,
then run `npm run ios` or launch the Debug scheme in Xcode. To use another
development URL, set the target's `API_BASE_URL` Debug build setting in Xcode,
or pass it to `xcodebuild` on the command line.

### Android release / Internal or Closed Testing

Android Release requires a dedicated private upload key and a deployed HTTPS
backend. The checked-in `debug.keystore` is used for Debug only and is rejected
for Release. Release fails if any upload signing value is missing, the keystore
file is absent, or the debug keystore is supplied.

Generate a new upload key locally only when you are ready to manage and back it
up. This command prompts for passwords; replace the identity and alias
placeholders, and do not put real passwords on the command line:

```bash
keytool -genkeypair -v \
  -keystore android/app/upload-keystore.jks \
  -alias YOUR_UPLOAD_ALIAS \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=YOUR_NAME, OU=YOUR_TEAM, O=YOUR_ORG, L=YOUR_CITY, ST=YOUR_STATE, C=YOUR_COUNTRY_CODE"
```

`android/app/upload-keystore.jks` is gitignored. Alternatively, keep the key
outside the repository and use its absolute path. In your personal
`~/.gradle/gradle.properties` (never the repository's `android/gradle.properties`),
set these values, replacing every placeholder:

```properties
MYAPP_UPLOAD_STORE_FILE=upload-keystore.jks
MYAPP_UPLOAD_KEY_ALIAS=YOUR_UPLOAD_ALIAS
MYAPP_UPLOAD_STORE_PASSWORD=YOUR_STORE_PASSWORD
MYAPP_UPLOAD_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

The relative store path above resolves from `android/app`. The same four names
can instead be provided as environment variables or CI secrets; Gradle project
properties take precedence. Keep the properties file private and back up the
key and passwords securely outside Git. Do not use the debug key as an upload
key.

From `android/`, build the AAB for Play Internal/Closed Testing with the real
deployed API URL (the URL below is only a placeholder):

```bash
./gradlew bundleRelease -PAPI_BASE_URL=https://api.example.com
```

The resulting bundle is `android/app/build/outputs/bundle/release/app-release.aab`.
`API_BASE_URL` may also come from the environment. Release fails if it is
missing, malformed, non-HTTPS, or points at a local/emulator or temporary
tunnel host; cleartext traffic is disabled.

With Google Play App Signing, this local private **upload key** signs the AAB
you submit. Google Play manages the separate **app signing key** used for
distributed installs. Preserve the upload key and its passwords in a secure
backup; do not commit, email, or upload the private key itself. Enroll/configure
Play App Signing and register the upload certificate in Play Console before
submitting a test bundle.

### iOS release / archive

Set the app target's `API_BASE_URL` Release build setting in Xcode to the real
deployed HTTPS origin, or pass it to an archive command (after `pod install`):

```bash
cd ios
xcodebuild -workspace WalletTrackerApp.xcworkspace -scheme WalletTrackerApp \
  -configuration Release -sdk iphoneos \
  -archivePath build/WalletTrackerApp.xcarchive \
  API_BASE_URL=https://api.example.com archive
```

The iOS Release build setting is intentionally empty in source control. The
archive's bundle phase validates it and fails if it is missing or unsafe.
`https://api.example.com` is a placeholder, not a production endpoint. Both
Android and iOS release builds must point to the deployed HTTPS backend;
there is no localhost, emulator, or ngrok fallback.

## Main Screens

### Wallets

Shows followed wallets and their portfolio summary.

### Wallet Detail

Displays the selected wallet’s overview, network filter, and tabs for:

* Tokens
* History
* Positions

### Tokens

Shows direct wallet holdings, grouped into:

* Main tokens
* Low-value tokens
* Suspicious tokens

Suspicious tokens are separated from the main portfolio view to reduce noise and avoid misleading balances.

### Positions

Shows DeFi, staking, lending, and protocol-related positions when available.

### History

Shows wallet-specific transaction history with date separators and event cards.

### Activity

Shows recent activity across followed wallets.

### Notification History

Shows wallet alerts that were sent to the user’s device.

## Development Notes

This app is currently focused on:

* Clean mobile UX
* Multi-chain wallet tracking
* Fast portfolio display
* Graceful degraded states
* Suspicious token handling
* Live wallet activity support through the backend

Some data can appear as partial or temporarily unavailable depending on provider availability, rate limits, or network response times.

## Scripts

```bash
npm start
```

Starts Metro.

```bash
npm run android
```

Builds and runs the Android app.

```bash
npm run ios
```

Builds and runs the iOS app.

```bash
npx tsc --noEmit
```

Runs TypeScript checks.

## Continuous Integration

GitHub Actions runs lightweight mobile checks on every push and pull request:

```bash
npm ci
npx tsc --noEmit
npx eslint src/auth
```

The workflow does not build the Android or iOS applications and does not require
secrets.

Full-repository lint is not yet a CI gate because `npm run lint` has pre-existing
errors unrelated to the auth storage work. These currently include an unused
React import in `PushRegistrationManager.tsx` and hook dependency findings in
`EventsScreen.tsx`, `FollowingScreen.tsx`, `PositionsScreen.tsx`,
`TokensScreen.tsx`, and `WalletDetailScreen.tsx`.

The existing Jest smoke test is also not run in CI yet. Its current configuration
cannot transform the ESM build imported by React Native Firebase Messaging, so
the suite fails during module loading before any test executes.

## Android Crash Reporting

Firebase Crashlytics is enabled on Android release builds for closed-beta crash
diagnostics. Debug collection remains disabled, and iOS Crashlytics is not
configured or autolinked yet. Firebase Analytics is not included.

Crash reports must never include auth tokens, FCM tokens, email addresses,
wallet addresses, or transaction hashes. Do not pass these values to
Crashlytics logs, custom keys, user IDs, or recorded errors. This initial setup
does not add any custom Crashlytics logs, keys, or user identifiers.

To verify Crashlytics without leaving a test control in the app:

1. Make temporary, uncommitted local changes only: set
   `crashlytics_debug_enabled` to `true` in `firebase.json`, import
   `getCrashlytics` and `crash` from `@react-native-firebase/crashlytics`, and
   call `crash(getCrashlytics())` from a temporary test action.
2. Build and open the Android app, invoke the temporary test action, and confirm
   that the app terminates.
3. Remove the temporary crash code, restore
   `crashlytics_debug_enabled` to `false`, rebuild, and reopen the app so the
   queued report can be uploaded.
4. Confirm the test issue appears in Firebase Console under Crashlytics. Initial
   reports can take several minutes to appear.
5. Before committing, verify `git diff` contains no test crash code and
   `firebase.json` still has debug collection disabled.

## Status

This project is under active development.

Current focus areas include:

* Improving wallet activity reliability
* Better cached portfolio experience
* More efficient token metadata handling
* Additional network support
* Push notification improvements

## License

This project is currently private / experimental.
Add a license before publishing for production or open-source use.
