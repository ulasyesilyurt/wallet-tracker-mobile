import React, {useEffect, useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import type {TokenHolding} from '../api/holdings';
import {walletDetailColors as colors} from '../theme/walletDetail';
import {getTokenIconTheme} from '../utils/avatar';
import {formatTokenAmount, formatUsd} from '../utils/format';
import {NetworkBadge} from './WalletDetailUI';

type TokenHoldingCardProps = {
  holding: TokenHolding;
  subdued?: boolean;
  narrow?: boolean;
};

export function TokenHoldingCard({holding, subdued = false, narrow = false}: TokenHoldingCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {setImageFailed(false);}, [holding.logoUrl]);
  const balanceUsdText = formatUsd(holding.balanceUsd, '');
  const tokenSymbol = holding.symbol || 'Unknown';
  const tokenName = holding.name || holding.symbol || holding.tokenAddress || 'Native asset';
  const iconTheme = getTokenIconTheme(holding.symbol, holding.name);
  const imageUrl = holding.logoUrl && /^https?:\/\//i.test(holding.logoUrl) ? holding.logoUrl : null;
  const nativeChainAsset = !holding.tokenAddress;
  const tint = nativeChainAsset ? holding.chainId === 'base-mainnet'
    ? {backgroundColor: 'rgba(47,107,255,0.16)', borderColor: 'rgba(47,107,255,0.28)'}
    : {backgroundColor: 'rgba(108,124,232,0.16)', borderColor: 'rgba(108,124,232,0.28)'} : null;

  return (
    <View style={[styles.card, narrow && styles.cardNarrow]}>
      <View style={[styles.avatar, narrow && styles.avatarNarrow, tint]}>
        {imageUrl && !imageFailed ? (
          <Image source={{uri: imageUrl}} onError={() => setImageFailed(true)} style={styles.logo} />
        ) : (
          <Text maxFontSizeMultiplier={1.2} style={[styles.monogram,
            iconTheme.label.length > 1 && styles.monogramSmall,
            {color: subdued ? colors.textTertiary : nativeChainAsset ? '#9AA8F5' : colors.textPrimary}]}>{iconTheme.label}</Text>
        )}
      </View>
      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.2}
            style={[styles.name, narrow && styles.nameNarrow, subdued && styles.subdued]}>{tokenName}</Text>
          {holding.isSuspicious ? (
            <View style={styles.suspiciousBadge}><Text maxFontSizeMultiplier={1.2} style={styles.suspiciousText}>SUSPICIOUS</Text></View>
          ) : <NetworkBadge chainId={holding.chainId} narrow={narrow} />}
        </View>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.quantity, narrow && styles.quantityNarrow]}>
          {formatTokenAmount(holding.balance)} {tokenSymbol}
        </Text>
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.value, narrow && styles.valueNarrow,
        (!balanceUsdText || subdued) && styles.subdued]}>{balanceUsdText || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {height: 60, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 13},
  cardNarrow: {paddingHorizontal: 13, paddingVertical: 11, borderRadius: 16, gap: 12},
  avatar: {width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)',
    backgroundColor: colors.neutralTint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  avatarNarrow: {width: 34, height: 34, borderRadius: 18},
  logo: {width: '100%', height: '100%'},
  monogram: {fontSize: 13, fontWeight: '700'}, monogramSmall: {fontSize: 10.5},
  identity: {flex: 1, minWidth: 0},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: 7},
  name: {fontSize: 15, fontWeight: '700', letterSpacing: -0.15, color: colors.textPrimary, flexShrink: 1},
  nameNarrow: {fontSize: 14.5},
  quantity: {marginTop: 3, fontSize: 11, color: colors.textTertiary, fontVariant: ['tabular-nums']},
  quantityNarrow: {fontSize: 10.5},
  value: {fontSize: 16, lineHeight: 16, fontWeight: '800', letterSpacing: -0.32, color: colors.textPrimary,
    fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 0},
  valueNarrow: {fontSize: 15.5}, subdued: {color: colors.textTertiary},
  suspiciousBadge: {height: 19, paddingHorizontal: 7, borderRadius: 6, backgroundColor: 'rgba(245,85,93,0.10)',
    borderWidth: 1, borderColor: 'rgba(245,85,93,0.26)', justifyContent: 'center', flexShrink: 0},
  suspiciousText: {fontSize: 9, fontWeight: '600', letterSpacing: 0.54, color: colors.negative},
});
