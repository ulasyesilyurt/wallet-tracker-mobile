import {walletDetailColors} from './walletDetail';

export const walletManagementColors = walletDetailColors;

export function getWalletManagementLayout(width: number) {
  const narrow = width < 380;

  return {
    narrow,
    gutter: narrow ? 16 : 20,
    titleSize: narrow ? 26 : 28,
    bodySize: narrow ? 12.5 : 13,
    fieldLabelSize: narrow ? 11.5 : 12,
    fieldHeight: narrow ? 50 : 52,
    addressSize: narrow ? 14 : 14.5,
    inputSize: narrow ? 15 : 15.5,
    fieldGap: narrow ? 18 : 20,
    sectionGap: narrow ? 22 : 26,
    sectionTitleSize: narrow ? 13 : 13.5,
    segmentHeight: narrow ? 46 : 48,
    segmentRadius: narrow ? 11 : 12,
    segmentInnerRadius: narrow ? 8 : 9,
    segmentNameSize: narrow ? 13 : 13.5,
    rowHeight: narrow ? 54 : 56,
    actionPaddingHorizontal: narrow ? 16 : 20,
    actionPaddingVertical: narrow ? 12 : 14,
    buttonHeight: narrow ? 50 : 52,
  };
}

export function getWalletManagementBottomInset(
  platform: 'android' | 'ios',
  safeAreaBottom: number,
) {
  // App.tsx already wraps iOS in React Native's SafeAreaView. Android needs
  // the explicit safe-area-context inset because its root is edge-to-edge.
  return platform === 'ios' ? 0 : safeAreaBottom;
}

export function getWalletFormScrollBottomPadding(
  width: number,
  platform: 'android' | 'ios',
  safeAreaBottom: number,
) {
  const layout = getWalletManagementLayout(width);
  return (
    layout.actionPaddingVertical +
    layout.buttonHeight +
    getWalletManagementBottomInset(platform, safeAreaBottom) +
    8
  );
}

