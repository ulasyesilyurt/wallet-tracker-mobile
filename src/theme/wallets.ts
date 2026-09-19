import { walletDetailColors } from './walletDetail';

export const walletsColors = walletDetailColors;

export function getWalletsLayout(width: number) {
  const narrow = width < 375;
  return {
    narrow,
    gutter: narrow ? 16 : 20,
    titleSize: narrow ? 27 : 30,
    stateSize: narrow ? 12.5 : 13,
    headerBottom: narrow ? 10 : 12,
    portfolioRadius: narrow ? 20 : 22,
    totalSize: narrow ? 36 : 38,
    rowHeight: narrow ? 66 : 70,
    rowRadius: narrow ? 18 : 20,
    rowPadding: narrow ? 14 : 16,
    rowGap: narrow ? 12 : 14,
    avatarSize: narrow ? 40 : 42,
  };
}
