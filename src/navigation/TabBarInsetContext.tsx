import React, { createContext, useContext, useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFloatingTabBarContentInset } from './floatingTabBarLayout';

const TabBarInsetContext = createContext(0);

export function TabBarInsetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const value = useMemo(
    () =>
      getFloatingTabBarContentInset(
        width,
        insets.bottom,
        Platform.OS === 'ios' ? 'ios' : 'android',
      ),
    [insets.bottom, width],
  );

  return (
    <TabBarInsetContext.Provider value={value}>
      {children}
    </TabBarInsetContext.Provider>
  );
}

export function useTabBarInset() {
  return useContext(TabBarInsetContext);
}
