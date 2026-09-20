import { walletDetailColors } from './walletDetail';

export const settingsColors = walletDetailColors;

export function getSettingsLayout(width: number) {
  const narrow = width < 375;

  return {
    narrow,
    gutter: narrow ? 16 : 20,
    headerPaddingTop: 4,
    headerPaddingBottom: narrow ? 12 : 14,
    titleSize: narrow ? 27 : 30,
    stateSize: narrow ? 12.5 : 13,
    sectionTitleSize: narrow ? 13 : 13.5,
    sectionMetaSize: narrow ? 12 : 12.5,
    rowMinHeight: narrow ? 50 : 52,
    rowLabelSize: narrow ? 14.5 : 15,
    rowValueSize: narrow ? 12.5 : 13,
    rowMonoSize: narrow ? 12 : 12.5,
    chevronSize: narrow ? 18 : 19,
    versionMarginTop: narrow ? 20 : 22,
  };
}
