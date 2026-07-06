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

The app expects a backend API URL to be configured in the frontend API layer.

Check the API files under:

```txt
src/api/
```

Update the backend base URL according to your local development setup.

Example local backend:

```txt
http://localhost:3000
```

For Android emulator, you may need to use:

```txt
http://10.0.2.2:3000
```

instead of `localhost`.

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
