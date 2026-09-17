import React from 'react';
import {Platform, ScrollView, View, type ScrollViewProps, type ViewProps} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type SafeAreaScreenProps = ViewProps & {
  topPadding?: number;
};

function useScreenTopPadding(topPadding: number) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android' ? insets.top : 0;

  return {paddingTop: topPadding + topInset};
}

// Use for full screens under App's native SafeAreaView, which handles iOS insets.
export function SafeAreaScreen({style, topPadding = 0, ...props}: SafeAreaScreenProps) {
  const topStyle = useScreenTopPadding(topPadding);
  return <View {...props} style={[style, topStyle]} />;
}

export function SafeAreaScrollScreen({style, ...props}: ScrollViewProps) {
  const topStyle = useScreenTopPadding(0);
  return <ScrollView {...props} style={[style, topStyle]} />;
}
