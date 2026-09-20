import { activityColors } from './activity';

export const eventDetailColors = {
  ...activityColors,
  sheet: '#0B0D10',
  scrim: 'rgba(4,5,7,0.62)',
  sheetEdge: 'rgba(255,255,255,0.07)',
  handle: 'rgba(255,255,255,0.18)',
};

export function getEventDetailLayout(width: number) {
  const narrow = width < 375;

  return {
    narrow,
    gutter: narrow ? 16 : 20,
    sheetRadius: narrow ? 24 : 26,
    handleZoneHeight: narrow ? 18 : 20,
    handleWidth: narrow ? 34 : 36,
    tileSize: narrow ? 34 : 36,
    tileRadius: narrow ? 11 : 12,
    tileGlyphSize: narrow ? 14 : 15,
    headerGap: narrow ? 12 : 13,
    titleSize: narrow ? 18 : 19,
    timestampSize: narrow ? 11 : 11.5,
    timestampTop: narrow ? 3 : 4,
    bodyTop: narrow ? 12 : 14,
    valueRowMinHeight: narrow ? 50 : 52,
    valueLabelSize: narrow ? 12.5 : 13,
    valueSize: narrow ? 20 : 22,
    legPaddingVertical: narrow ? 8 : 9,
    legLabelWidth: narrow ? 54 : 58,
    legLabelSize: narrow ? 11.5 : 12,
    legAmountSize: narrow ? 15 : 15.5,
    legAssetSize: narrow ? 11.5 : 12,
    legUsdSize: narrow ? 11 : 11.5,
    metaRowMinHeight: narrow ? 42 : 44,
    metaLabelSize: narrow ? 12.5 : 13,
    metaValueSize: narrow ? 12.5 : 13,
    metaMonoSize: narrow ? 11.5 : 12,
    metaGap: narrow ? 8 : 9,
    linkRowMinHeight: narrow ? 46 : 48,
    linkLabelSize: narrow ? 13.5 : 14,
    linkGlyphSize: narrow ? 13.5 : 14,
    bottomPadding: narrow ? 12 : 14,
  };
}
