import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { walletsColors as colors, getWalletsLayout } from '../theme/wallets';
import { formatUsd } from '../utils/format';

export function WalletsPortfolioCard({
  width,
  value,
  loading,
}: {
  width: number;
  value: number | null;
  loading: boolean;
}) {
  const layout = getWalletsLayout(width);
  return (
    <View style={[styles.card, { borderRadius: layout.portfolioRadius }]}>
      <Text maxFontSizeMultiplier={1.2} style={styles.label}>
        Portfolio total
      </Text>
      {loading && value == null ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Loading portfolio total"
          style={styles.valueSkeleton}
        />
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          maxFontSizeMultiplier={1.2}
          style={[styles.value, { fontSize: layout.totalSize }]}
        >
          {formatUsd(value, 'Balance unavailable')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.summaryBorder,
    padding: 16,
  },
  label: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
  value: {
    marginTop: 7,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1.33,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  valueSkeleton: {
    marginTop: 7,
    width: 168,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.neutralTint,
  },
});
