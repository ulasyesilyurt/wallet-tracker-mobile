import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  getFloatingTabBarBottom,
  getFloatingTabIndicatorOffset,
  getFloatingTabBarLayout,
  getFloatingTabBarPalette,
  getFloatingTabWidth,
} from '../navigation/floatingTabBarLayout';

export type FloatingTabDefinition<T extends string = string> = {
  id: T;
  label: string;
  iconName: string;
};

type FloatingTabBarProps<T extends string> = {
  tabs: readonly FloatingTabDefinition<T>[];
  activeTab: T;
  badgeTab: T;
  unreadCount: number;
  onSelect: (tab: T) => void;
};

const ACTIVE_COLOR = '#F4F6F8';
const INACTIVE_COLOR = '#7E8896';
const BADGE_COLOR = '#F5555D';
const BAR_TINT = '#14171C';

function useReduceMotionEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (mounted) setEnabled(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setEnabled,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}

export function FloatingTabBar<T extends string>({
  tabs,
  activeTab,
  badgeTab,
  unreadCount,
  onSelect,
}: FloatingTabBarProps<T>) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotionEnabled();
  const layout = getFloatingTabBarLayout(width);
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const palette = getFloatingTabBarPalette(platform);
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const previousTabWidthRef = useRef(0);
  const activeIndex = Math.max(
    0,
    tabs.findIndex(tab => tab.id === activeTab),
  );
  const tabWidth = getFloatingTabWidth(containerWidth, tabs.length);
  const barBottom = getFloatingTabBarBottom(width, insets.bottom, platform);

  useEffect(() => {
    if (tabWidth === 0) return;

    const target = getFloatingTabIndicatorOffset(
      activeIndex,
      containerWidth,
      tabs.length,
    );
    const widthChanged = previousTabWidthRef.current !== tabWidth;
    const isFirstMeasurement = previousTabWidthRef.current === 0;
    previousTabWidthRef.current = tabWidth;
    indicatorX.stopAnimation();

    if (reduceMotion || widthChanged || isFirstMeasurement) {
      indicatorX.setValue(target);
      return;
    }

    const animation = Animated.spring(indicatorX, {
      toValue: target,
      damping: 30,
      stiffness: 320,
      mass: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [activeIndex, containerWidth, indicatorX, reduceMotion, tabWidth, tabs.length]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const barStyle = useMemo(
    () => ({
      left: layout.sideInset,
      right: layout.sideInset,
      bottom: barBottom,
      height: layout.height,
      borderRadius: layout.radius,
      backgroundColor: palette.backgroundColor,
      borderColor: palette.borderColor,
    }),
    [barBottom, layout, palette],
  );

  return (
    <View
      accessibilityRole="tablist"
      onLayout={handleLayout}
      style={[styles.bar, barStyle]}
      testID="floating-tab-bar"
    >
      {tabWidth > 0 ? (
        <Animated.View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: tabWidth,
              height: layout.indicatorHeight,
              borderRadius: layout.indicatorRadius,
              backgroundColor: palette.indicatorColor,
              transform: [{ translateX: indicatorX }],
            },
          ]}
          testID="floating-tab-indicator"
        />
      ) : null}

      <View
        pointerEvents="box-none"
        style={[styles.items, { height: layout.indicatorHeight }]}
      >
        {tabs.map(tab => (
          <FloatingTabItem
            key={tab.id}
            tab={tab}
            focused={tab.id === activeTab}
            badgeCount={tab.id === badgeTab ? unreadCount : 0}
            iconSize={layout.iconSize}
            itemGap={layout.itemGap}
            labelSize={layout.labelSize}
            onSelect={onSelect}
          />
        ))}
      </View>
    </View>
  );
}

type FloatingTabItemProps<T extends string> = {
  tab: FloatingTabDefinition<T>;
  focused: boolean;
  badgeCount: number;
  iconSize: number;
  itemGap: number;
  labelSize: number;
  onSelect: (tab: T) => void;
};

const FloatingTabItem = memo(function FloatingTabItem<T extends string>({
  tab,
  focused,
  badgeCount,
  iconSize,
  itemGap,
  labelSize,
  onSelect,
}: FloatingTabItemProps<T>) {
  const handlePress = useCallback(() => {
    if (!focused) onSelect(tab.id);
  }, [focused, onSelect, tab.id]);
  const accessibilityLabel =
    badgeCount > 0
      ? `${tab.label}, ${badgeCount} unread`
      : tab.label;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.item,
        { gap: itemGap },
        pressed && styles.itemPressed,
      ]}
    >
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{ width: iconSize, height: iconSize }}
      >
        <Ionicons
          name={tab.iconName}
          size={iconSize}
          color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
        {badgeCount > 0 ? (
          <FloatingAlertBadge count={badgeCount} iconSize={iconSize} />
        ) : null}
      </View>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[
          styles.label,
          {
            fontSize: labelSize,
            color: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
          },
          focused ? styles.labelActive : styles.labelInactive,
        ]}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}) as <T extends string>(props: FloatingTabItemProps<T>) => React.ReactElement;

function FloatingAlertBadge({
  count,
  iconSize,
}: {
  count: number;
  iconSize: number;
}) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.badge, { left: iconSize / 2 + 4 }]}
      testID="floating-alert-badge"
    >
      <Text allowFontScaling={false} numberOfLines={1} style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    zIndex: 10,
    overflow: 'hidden',
    paddingHorizontal: 4,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0,
    elevation: 0,
  },
  indicator: { position: 'absolute', top: 5, left: 4 },
  items: {
    position: 'absolute',
    top: 5,
    right: 4,
    left: 4,
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPressed: { opacity: 0.62 },
  label: { letterSpacing: 0.105 },
  labelActive: { fontWeight: '700' },
  labelInactive: { fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: BAR_TINT,
    backgroundColor: BADGE_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    lineHeight: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
