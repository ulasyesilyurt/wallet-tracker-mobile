#!/bin/sh
set -eu

firebase_plist="$SRCROOT/WalletTrackerApp/GoogleService-Info.plist"

if [ "$CONFIGURATION" = "Release" ]; then
  case "${PRODUCT_BUNDLE_IDENTIFIER:-}" in
    ""|org.reactjs.native.example.*|com.example.*|org.example.*)
      echo "error: Set the WalletTrackerApp Release PRODUCT_BUNDLE_IDENTIFIER to the registered iOS bundle ID." >&2
      exit 1
      ;;
  esac

  if [ -z "${DEVELOPMENT_TEAM:-}" ]; then
    echo "error: Select an Apple Developer team for the WalletTrackerApp Release target." >&2
    exit 1
  fi
fi

if [ ! -f "$firebase_plist" ]; then
  echo "error: Supply ios/WalletTrackerApp/GoogleService-Info.plist from the matching Firebase iOS app before building." >&2
  exit 1
fi

if ! plutil -lint -s "$firebase_plist"; then
  echo "error: GoogleService-Info.plist is not a valid property list." >&2
  exit 1
fi

firebase_bundle_id=$(/usr/libexec/PlistBuddy -c 'Print :BUNDLE_ID' "$firebase_plist" 2>/dev/null || true)
if [ -z "$firebase_bundle_id" ] || [ "$firebase_bundle_id" != "${PRODUCT_BUNDLE_IDENTIFIER:-}" ]; then
  echo "error: GoogleService-Info.plist BUNDLE_ID must match the app target's PRODUCT_BUNDLE_IDENTIFIER." >&2
  exit 1
fi
