import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';
import { FloatingTabBar } from '../src/components/FloatingTabBar';
import { APP_TABS } from '../src/navigation/appTabs';
import {
  getFloatingTabBarBottom,
  getFloatingTabBarContentInset,
  getFloatingTabBarLayout,
  getFloatingTabBarPalette,
  getFloatingTabIndicatorOffset,
  getFloatingTabWidth,
} from '../src/navigation/floatingTabBarLayout';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));

async function renderBar({
  activeTab = 'wallets',
  unreadCount = 0,
  onSelect = jest.fn(),
}: {
  activeTab?: 'wallets' | 'activity' | 'alerts' | 'settings';
  unreadCount?: number;
  onSelect?: jest.Mock;
} = {}) {
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <FloatingTabBar
        tabs={APP_TABS}
        activeTab={activeTab}
        badgeTab="alerts"
        unreadCount={unreadCount}
        onSelect={onSelect}
      />,
    );
    await Promise.resolve();
  });
  return { renderer: renderer!, onSelect };
}

describe('FloatingTabBar', () => {
  it('preserves the existing route order and exposes four tab stops', async () => {
    expect(APP_TABS.map(tab => tab.id)).toEqual([
      'wallets',
      'activity',
      'alerts',
      'settings',
    ]);
    const { renderer } = await renderBar();
    const tabLabels = Array.from(
      new Set(
        renderer.root
          .findAllByProps({ accessibilityRole: 'tab' })
          .map(tab => tab.props.accessibilityLabel),
      ),
    );

    expect(tabLabels).toEqual([
      'Wallets',
      'Activity',
      'Alerts',
      'Settings',
    ]);
    act(() => renderer.unmount());
  });

  it('marks the active tab and selects only an inactive tab', async () => {
    const onSelect = jest.fn();
    const { renderer } = await renderBar({ onSelect });
    const wallets = renderer.root.findByProps({ accessibilityLabel: 'Wallets' });
    const activity = renderer.root.findByProps({ accessibilityLabel: 'Activity' });

    expect(wallets.props.accessibilityState).toEqual({ selected: true });
    expect(activity.props.accessibilityState).toEqual({ selected: false });
    act(() => wallets.props.onPress());
    expect(onSelect).not.toHaveBeenCalled();
    act(() => activity.props.onPress());
    expect(onSelect).toHaveBeenCalledWith('activity');
    act(() => renderer.unmount());
  });

  it('renders the current Alerts unread count and omits a zero badge', async () => {
    const withUnread = await renderBar({ unreadCount: 12 });
    expect(
      withUnread.renderer.root.findByProps({
        accessibilityLabel: 'Alerts, 12 unread',
      }),
    ).toBeTruthy();
    expect(
      withUnread.renderer.root.findByProps({
        testID: 'floating-alert-badge',
      }),
    ).toBeTruthy();
    expect(
      withUnread.renderer.root
        .findByProps({ testID: 'floating-alert-badge' })
        .findByType(Text).props.children,
    ).toBe(12);
    act(() => withUnread.renderer.unmount());

    const withoutUnread = await renderBar({ unreadCount: 0 });
    expect(
      withoutUnread.renderer.root.findByProps({ accessibilityLabel: 'Alerts' }),
    ).toBeTruthy();
    expect(
      withoutUnread.renderer.root.findAllByProps({
        testID: 'floating-alert-badge',
      }),
    ).toHaveLength(0);
    act(() => withoutUnread.renderer.unmount());
  });

  it('keeps the real unread value in accessibility while preserving the 99+ cap', async () => {
    const { renderer } = await renderBar({ unreadCount: 104 });

    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Alerts, 104 unread',
      }),
    ).toBeTruthy();
    expect(
      renderer.root
        .findByProps({ testID: 'floating-alert-badge' })
        .findByType(Text).props.children,
    ).toBe('99+');
    act(() => renderer.unmount());
  });

  it('measures the active indicator instead of hardcoding tab width', async () => {
    const { renderer } = await renderBar({ activeTab: 'alerts' });
    act(() =>
      renderer.root.findByProps({ testID: 'floating-tab-bar' }).props.onLayout({
        nativeEvent: { layout: { width: 358, height: 64, x: 0, y: 0 } },
      }),
    );
    const indicatorStyle = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'floating-tab-indicator' }).props
        .style,
    );

    expect(indicatorStyle.width).toBe(87.5);
    expect(getFloatingTabWidth(358, 4)).toBe(87.5);
    expect(getFloatingTabIndicatorOffset(2, 358, 4)).toBe(175);
    act(() => renderer.unmount());
  });

  it('jumps to the selected tab when reduced motion is enabled', async () => {
    const reduceMotion = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    const spring = jest.spyOn(Animated, 'spring');
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <FloatingTabBar
          tabs={APP_TABS}
          activeTab="wallets"
          badgeTab="alerts"
          unreadCount={0}
          onSelect={jest.fn()}
        />,
      );
      await Promise.resolve();
    });
    act(() =>
      renderer!.root.findByProps({ testID: 'floating-tab-bar' }).props.onLayout({
        nativeEvent: { layout: { width: 358, height: 64, x: 0, y: 0 } },
      }),
    );
    await act(async () => {
      renderer!.update(
        <FloatingTabBar
          tabs={APP_TABS}
          activeTab="activity"
          badgeTab="alerts"
          unreadCount={0}
          onSelect={jest.fn()}
        />,
      );
      await Promise.resolve();
    });

    expect(spring).not.toHaveBeenCalled();
    act(() => renderer!.unmount());
    reduceMotion.mockRestore();
    spring.mockRestore();
  });

  it('uses the locked baseline and 360pt geometry', () => {
    expect(getFloatingTabBarLayout(390)).toMatchObject({
      narrow: false,
      sideInset: 16,
      gap: 6,
      height: 64,
      radius: 32,
      indicatorHeight: 54,
      indicatorRadius: 27,
      iconSize: 20,
      itemGap: 4,
      labelSize: 10.5,
    });
    expect(getFloatingTabBarLayout(360)).toMatchObject({
      narrow: true,
      sideInset: 12,
      gap: 4,
      height: 62,
      radius: 31,
      indicatorHeight: 52,
      indicatorRadius: 26,
      iconSize: 18,
      itemGap: 3,
      labelSize: 10,
    });
  });

  it('calculates one safe-area-aware bottom clearance without double counting iOS', () => {
    expect(getFloatingTabBarBottom(390, 24, 'android')).toBe(30);
    expect(getFloatingTabBarContentInset(390, 24, 'android')).toBe(102);
    expect(getFloatingTabBarBottom(390, 34, 'ios')).toBe(6);
    expect(getFloatingTabBarContentInset(390, 34, 'ios')).toBe(78);
    expect(getFloatingTabBarBottom(360, 34, 'ios')).toBe(4);
    expect(getFloatingTabBarContentInset(360, 34, 'ios')).toBe(74);
  });

  it('uses solid Android and the no-blur iOS fallback palettes', () => {
    expect(getFloatingTabBarPalette('android')).toEqual({
      tier: 'android-solid',
      backgroundColor: '#14171C',
      borderColor: 'rgba(255,255,255,0.09)',
      indicatorColor: 'rgba(255,255,255,0.08)',
    });
    expect(getFloatingTabBarPalette('ios')).toEqual({
      tier: 'ios-opaque-fallback',
      backgroundColor: 'rgba(18,21,26,0.94)',
      borderColor: 'rgba(255,255,255,0.10)',
      indicatorColor: 'rgba(255,255,255,0.07)',
    });
  });
});
