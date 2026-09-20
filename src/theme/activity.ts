import { walletDetailColors } from './walletDetail';

export const activityColors = walletDetailColors;

export function getActivityLayout(width: number) {
  const narrow = width < 375;
  return {
    narrow,
    gutter: narrow ? 16 : 20,
    titleSize: narrow ? 27 : 30,
    stateSize: narrow ? 12.5 : 13,
    headerBottom: narrow ? 10 : 12,
    filterHeight: narrow ? 40 : 42,
    filterRadius: narrow ? 13 : 14,
    filterItemRadius: narrow ? 10 : 11,
    filterLabelSize: narrow ? 12 : 12.5,
    filterCountSize: narrow ? 10.5 : 11,
    filterBottom: narrow ? 10 : 12,
    rowHeight: narrow ? 78 : 84,
    rowPaddingVertical: narrow ? 10 : 11,
    rowGap: narrow ? 12 : 13,
    tileSize: narrow ? 32 : 34,
    tileRadius: narrow ? 10 : 11,
    glyphSize: narrow ? 13 : 14,
    titleRowSize: narrow ? 14 : 14.5,
    amountSize: narrow ? 14.5 : 15,
    factSize: narrow ? 12 : 12.5,
    addressSize: narrow ? 11 : 11.5,
    usdSize: narrow ? 10.5 : 11,
    attributionTop: narrow ? 6 : 7,
    attributionGap: narrow ? 7 : 8,
    walletNameSize: narrow ? 11.5 : 12,
    timestampSize: narrow ? 10.5 : 11,
    coverageRadius: narrow ? 20 : 22,
    coveragePadding: narrow ? 16 : 18,
    coverageTile: narrow ? 38 : 40,
    coverageTitle: narrow ? 20 : 21,
  };
}
