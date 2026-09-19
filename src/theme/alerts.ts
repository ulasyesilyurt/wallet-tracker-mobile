import { walletDetailColors } from './walletDetail';

export const alertsColors = walletDetailColors;

export function getAlertsLayout(width: number) {
  const narrow = width < 375;
  return {
    narrow,
    gutter: narrow ? 16 : 20,
    titleSize: narrow ? 27 : 30,
    summarySize: narrow ? 12.5 : 13,
    headerBottom: narrow ? 10 : 12,
    rowHeight: narrow ? 84 : 88,
    rowRadius: narrow ? 16 : 18,
    rowPadding: narrow ? 13 : 14,
    rowGap: narrow ? 12 : 13,
    tileSize: narrow ? 34 : 36,
    tileRadius: narrow ? 11 : 12,
  };
}
