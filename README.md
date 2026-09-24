# Wallet Tracker

Wallet Tracker is a React Native mobile application for real-time crypto wallet monitoring across multiple networks.

Rather than acting only as a portfolio dashboard, Wallet Tracker is built around an **alert-first wallet intelligence** experience — helping users follow wallet activity, token movements, portfolio changes, DeFi positions, and important on-chain events from one mobile interface.

This repository contains the **React Native mobile application**. The backend is maintained in a separate repository.

## Features

- Track multiple wallet addresses
- Ethereum and Base support
- Real-time wallet activity monitoring
- Wallet portfolio summaries
- Token holdings
- Suspicious token separation
- Low-value token grouping
- DeFi / protocol positions
- Paginated wallet transaction history
- Global activity feed across followed wallets
- Notification history with read / unread state
- Per-wallet alert configuration
- Network filtering
- External explorer links
- Copyable wallet and counterparty addresses
- Android and iOS native support

## Tech Stack

- React Native
- TypeScript
- React Navigation
- React Native Vector Icons
- Firebase Cloud Messaging
- REST API integration with a Node.js backend

## Project Structure

```txt
src/
  api/              API clients
  auth/             Authentication logic
  components/       Shared UI components
  hooks/            Reusable hooks
  navigation/       App navigation
  screens/          Main app screens
  theme/            Shared styling
  utils/            Formatting and presentation helpers
```

## Backend

The mobile app works with a separate Node.js backend responsible for:

- Authentication
- Wallet management
- Holdings aggregation
- Portfolio summaries
- DeFi positions
- Wallet event history
- Alchemy webhook ingestion
- Notification generation
- Firebase push delivery
- Notification history and read state

## Getting Started

### Install dependencies

```bash
npm install
```

### Start Metro

```bash
npx react-native start
```

## Android

Start the emulator:

```bash
~/Library/Android/sdk/emulator/emulator -avd Pixel_8
```

Run the app:

```bash
npx react-native run-android
```

Android Debug uses:

```txt
http://10.0.2.2:3000
```

for the local backend by default.

## iOS

The iOS app uses:

```txt
com.ulasyesilyurt.wallettracker
```

Install CocoaPods dependencies:

```bash
bundle install
cd ios
bundle exec pod install
cd ..
```

Start the simulator:

```bash
xcrun simctl boot "iPhone 17 Pro"
```

Open the workspace:

```bash
open ios/WalletTrackerApp.xcworkspace
```

Then run the app from Xcode with `Cmd + R`.

iOS Debug uses:

```txt
http://localhost:3000
```

for the local backend by default.

## API Configuration

The app reads `API_BASE_URL` from native build configuration.

Release builds must use a real HTTPS backend and must not point to:

- localhost
- emulator-only hosts
- temporary development tunnels

## Push Notifications

Wallet Tracker uses Firebase Cloud Messaging for push delivery.

Notification flow:

```txt
Blockchain activity
        ↓
Alchemy Webhook
        ↓
Wallet Tracker Backend
        ↓
Firebase Cloud Messaging
        ↓
Android / APNs
        ↓
User Device
```

### iOS Push

The Firebase iOS configuration file is expected at:

```txt
ios/WalletTrackerApp/GoogleService-Info.plist
```

This file is excluded from Git.

Real iOS push delivery requires:

- Apple Developer Program membership
- Push Notifications capability
- APNs authentication key or certificate
- APNs configuration in Firebase
- A signed physical-device build

## Android Release

Android release requires:

- Production HTTPS backend
- Android upload keystore
- Google Play Console setup
- Release API configuration

Build the release AAB with:

```bash
cd android
./gradlew bundleRelease -PAPI_BASE_URL=https://api.example.com
```

Generated bundle:

```txt
android/app/build/outputs/bundle/release/app-release.aab
```

## iOS Release

Before TestFlight:

- Select an Apple Developer Team
- Configure signing
- Configure APNs
- Set the production API URL
- Add the final app icon
- Verify version and build numbers
- Create a signed archive

The bundle identifier is:

```txt
com.ulasyesilyurt.wallettracker
```

## CocoaPods

The lockfile is committed:

```txt
ios/Podfile.lock
```

Generated files are not committed:

```txt
ios/Pods/
ios/WalletTrackerApp.xcworkspace/
```

## Continuous Integration

GitHub Actions runs lightweight mobile checks such as:

```bash
npm ci
npx tsc --noEmit
```

Native release builds still require platform-specific signing and configuration.

## Current Status

Wallet Tracker is currently being prepared for its first internal test release.

Current target:

- Android → Google Play Internal Testing
- iOS → TestFlight after Android validation

Current work is focused on release readiness rather than adding new features.

Remaining release work includes:

- Production backend deployment
- Production API configuration
- Android upload signing
- Google Play Internal Testing
- Apple Developer signing
- APNs configuration
- Final app icon
- Store assets
- Signed release build validation

## Roadmap

Potential future work includes:

- Additional blockchain networks
- Whale wallet alerts
- Large transaction alerts
- New token entry alerts
- Stablecoin movement alerts
- NFT alerts
- More advanced notification preferences

These are not part of the current release scope.

## License

This project is currently private / experimental.
