// Scoped to Wallet Detail; the rest of the app keeps its existing theme.
export const walletDetailColors = {
  background: '#08090B',
  card: '#101216',
  elevated: '#171A1F',
  selected: '#1E232B',
  border: 'rgba(255,255,255,0.07)',
  summaryBorder: 'rgba(255,255,255,0.08)',
  iconBorder: 'rgba(255,255,255,0.09)',
  tabBorder: 'rgba(255,255,255,0.06)',
  divider: 'rgba(255,255,255,0.055)',
  textPrimary: '#F4F6F8',
  textDim: '#C9CFD7',
  textSecondary: '#99A1AC',
  textTertiary: '#7E8896',
  tabInactive: '#7B8593',
  positive: '#35C88E',
  negative: '#F5555D',
  warning: '#F0A63C',
  accent: '#4F7DF3',
  accentText: '#6C97FF',
  link: '#7FA3FF',
  holdings: '#E6E9ED',
  primaryCtaFill: '#F4F6F8',
  primaryCtaText: '#08090B',
  chip: 'rgba(255,255,255,0.05)',
  neutralTint: 'rgba(255,255,255,0.06)',
} as const;

export function getWalletDetailLayout(width: number) {
  const narrow = width < 375;
  return {
    narrow,
    gutter: narrow ? 16 : 20,
    headerHeight: narrow ? 48 : 52,
    headerGap: narrow ? 10 : 11,
    listTop: narrow ? 4 : 6,
    summaryPadding: narrow ? 15 : 16,
    summaryRadius: narrow ? 20 : 22,
    balanceSize: narrow ? 36 : 40,
  };
}
