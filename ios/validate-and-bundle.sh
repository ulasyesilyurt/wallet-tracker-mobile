#!/bin/sh
set -e

"$NODE_BINARY" "$SRCROOT/../scripts/check-api-url.js" "$CONFIGURATION"
"$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"
