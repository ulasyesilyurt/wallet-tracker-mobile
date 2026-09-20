export const FLOATING_TAB_BAR_MIN_BOTTOM = 12;
export const FLOATING_TAB_BAR_BREATH = 8;

export type FloatingTabBarPlatform = 'android' | 'ios';

export type FloatingTabBarLayout = {
  narrow: boolean;
  sideInset: number;
  gap: number;
  height: number;
  radius: number;
  indicatorHeight: number;
  indicatorRadius: number;
  iconSize: number;
  itemGap: number;
  labelSize: number;
};

export function getFloatingTabBarLayout(width: number): FloatingTabBarLayout {
  const narrow = width < 380;

  return {
    narrow,
    sideInset: narrow ? 12 : 16,
    gap: narrow ? 4 : 6,
    height: narrow ? 62 : 64,
    radius: narrow ? 31 : 32,
    indicatorHeight: narrow ? 52 : 54,
    indicatorRadius: narrow ? 26 : 27,
    iconSize: narrow ? 18 : 20,
    itemGap: narrow ? 3 : 4,
    labelSize: narrow ? 10 : 10.5,
  };
}

export function getFloatingTabBarBottom(
  width: number,
  bottomInset: number,
  platform: FloatingTabBarPlatform,
) {
  const { gap } = getFloatingTabBarLayout(width);
  const physicalBottom = Math.max(
    bottomInset + gap,
    FLOATING_TAB_BAR_MIN_BOTTOM,
  );

  // App.tsx uses React Native's SafeAreaView, which already removes the iOS
  // bottom inset from this navigator's layout area. Convert the physical
  // screen offset back into that safe-area-relative coordinate space.
  return platform === 'ios'
    ? Math.max(0, physicalBottom - bottomInset)
    : physicalBottom;
}

export function getFloatingTabBarContentInset(
  width: number,
  bottomInset: number,
  platform: FloatingTabBarPlatform,
) {
  const layout = getFloatingTabBarLayout(width);
  return (
    layout.height +
    getFloatingTabBarBottom(width, bottomInset, platform) +
    FLOATING_TAB_BAR_BREATH
  );
}

export function getFloatingTabWidth(containerWidth: number, tabCount: number) {
  if (containerWidth <= 8 || tabCount <= 0) return 0;
  return (containerWidth - 8) / tabCount;
}

export function getFloatingTabIndicatorOffset(
  activeIndex: number,
  containerWidth: number,
  tabCount: number,
) {
  return Math.max(0, activeIndex) * getFloatingTabWidth(containerWidth, tabCount);
}

export function getFloatingTabBarPalette(platform: FloatingTabBarPlatform) {
  return platform === 'android'
    ? {
        tier: 'android-solid' as const,
        backgroundColor: '#14171C',
        borderColor: 'rgba(255,255,255,0.09)',
        indicatorColor: 'rgba(255,255,255,0.08)',
      }
    : {
        tier: 'ios-opaque-fallback' as const,
        backgroundColor: 'rgba(18,21,26,0.94)',
        borderColor: 'rgba(255,255,255,0.10)',
        indicatorColor: 'rgba(255,255,255,0.07)',
      };
}
