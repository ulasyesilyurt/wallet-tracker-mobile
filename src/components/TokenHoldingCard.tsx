import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {TokenHolding} from '../api/holdings';
import {colors} from '../theme/colors';
import {getTokenIconTheme} from '../utils/avatar';
import {formatTokenAmount, formatUsd} from '../utils/format';

type TokenHoldingCardProps = {
  holding: TokenHolding;
  subdued?: boolean;
};

function getHoldingName(holding: TokenHolding) {
  if (holding.name) {
    return holding.name;
  }

  if (holding.tokenAddress) {
    return holding.tokenAddress;
  }

  return 'Native asset';
}

export function TokenHoldingCard({holding, subdued = false}: TokenHoldingCardProps) {
  const balanceUsdText = formatUsd(holding.balanceUsd, '');
  const balanceText = formatTokenAmount(holding.balance);
  const tokenSymbol = holding.symbol || 'Unknown';
  const tokenName = getHoldingName(holding);
  const iconTheme = getTokenIconTheme(holding.symbol, holding.name);
  const priceStateLabel = balanceUsdText ? 'USD value' : 'Unpriced';

  return (
    <View style={[styles.card, subdued ? styles.cardSubdued : null]}>
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            subdued ? styles.iconWrapSubdued : null,
            {backgroundColor: subdued ? colors.card : iconTheme.backgroundColor},
          ]}>
          <Text style={[styles.iconText, subdued ? styles.iconTextSubdued : null, {color: subdued ? colors.textSecondary : iconTheme.textColor}]}>
            {iconTheme.label}
          </Text>
        </View>

        <View style={styles.identityBlock}>
          <Text style={[styles.symbol, subdued ? styles.symbolSubdued : null]} numberOfLines={1}>
            {tokenSymbol}
          </Text>
          <Text style={[styles.name, subdued ? styles.nameSubdued : null]} numberOfLines={1}>
            {tokenName}
          </Text>
        </View>

        <View style={styles.valueBlock}>
          <Text style={[styles.balanceUsd, subdued ? styles.balanceUsdSubdued : null, !balanceUsdText ? styles.balanceUsdMissing : null]}>
            {balanceUsdText ?? 'Unavailable'}
          </Text>
          <Text style={[styles.balance, subdued ? styles.balanceSubdued : null]}>{balanceText} {tokenSymbol}</Text>
          <Text style={[styles.valueMeta, subdued ? styles.valueMetaSubdued : null]}>{priceStateLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardSubdued: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    opacity: 0.72,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSubdued: {
    backgroundColor: colors.card,
  },
  iconText: {
    fontWeight: '800',
    fontSize: 14,
  },
  iconTextSubdued: {
    color: colors.textSecondary,
  },
  identityBlock: {
    flex: 1,
    paddingRight: 8,
  },
  symbol: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  symbolSubdued: {
    color: colors.textSecondary,
  },
  name: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textSecondary,
  },
  nameSubdued: {
    color: colors.textTertiary,
  },
  valueBlock: {
    alignItems: 'flex-end',
    minWidth: 92,
  },
  balanceUsd: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  balanceUsdSubdued: {
    color: colors.textSecondary,
  },
  balanceUsdMissing: {
    color: colors.textSecondary,
  },
  balance: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  balanceSubdued: {
    color: colors.textSecondary,
  },
  valueMeta: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textTertiary,
  },
  valueMetaSubdued: {
    color: colors.textSecondary,
  },
});
