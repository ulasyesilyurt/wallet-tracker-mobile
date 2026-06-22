import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {getWalletPerformance, type PortfolioPerformance} from '../api/performance';
import {TokensScreen} from './TokensScreen';
import {EventsScreen} from './EventsScreen';
import {PositionsScreen} from './PositionsScreen';
import type {Wallet} from '../types/wallet';
import {getWalletPortfolioSummary, type WalletPortfolioSummary} from '../api/portfolioSummary';
import {colors} from '../theme/colors';
import {formatUsd, shortenAddress} from '../utils/format';
import {formatChainDisplayName, formatWalletChainsLabel, getWalletEnabledChains} from '../utils/chains';
import {
  getPerformanceUnavailableReason,
  getValidatedPerformance,
  logPortfolioBalanceDecision,
} from '../utils/performance';

export type DetailTab = 'tokens' | 'history' | 'positions';
type NetworkFilterOption = {
  value: string | null;
  label: string;
};

type WalletDetailScreenProps = {
  wallet: Wallet;
  initialTab?: DetailTab;
  onBack: () => void;
  onEdit: () => void;
};

export function WalletDetailScreen({wallet, initialTab, onBack, onEdit}: WalletDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab ?? 'history');
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [networkMenuOpen, setNetworkMenuOpen] = useState(false);
  const [portfolioSummary, setPortfolioSummary] =
    useState<WalletPortfolioSummary | null>(null);
  const [walletPerformance, setWalletPerformance] = useState<PortfolioPerformance | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const nextTab = initialTab ?? 'history';

    if (initialTab === 'history') {
      console.log('[notifications] WalletDetailScreen auto-opening History tab', {
        walletId: wallet.id,
      });
    }

    setActiveTab(nextTab);
  }, [initialTab, wallet.id]);

  useEffect(() => {
    setSelectedNetwork(null);
    setNetworkMenuOpen(false);
  }, [wallet.id]);

  useEffect(() => {
    let cancelled = false;
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setPortfolioSummary(null);
    setWalletPerformance(null);

    async function loadPortfolioSummary() {
      setPortfolioLoading(true);

      try {
        const [summaryResult, performanceResult] = await Promise.allSettled([
          getWalletPortfolioSummary(wallet.id),
          getWalletPerformance(wallet.id),
        ]);

        if (cancelled || latestRequestIdRef.current !== requestId) {
          return;
        }

        if (summaryResult.status === 'fulfilled') {
          const nextSummary = summaryResult.value;
          setPortfolioSummary(nextSummary);
        } else {
          console.log('[portfolio] failed to load wallet portfolio summary', {
            walletId: wallet.id,
            error: summaryResult.reason,
          });
        }

        if (performanceResult.status === 'fulfilled') {
          setWalletPerformance(performanceResult.value);
        } else {
          console.log('[portfolio] failed to load wallet performance', {
            walletId: wallet.id,
            error: performanceResult.reason,
          });
        }
      } catch (error) {
        console.log('[portfolio] unexpected wallet portfolio load error', {
          walletId: wallet.id,
          error,
        });
      } finally {
        if (!cancelled && latestRequestIdRef.current === requestId) {
          setPortfolioLoading(false);
        }
      }
    }

    void loadPortfolioSummary();

    return () => {
      cancelled = true;
    };
  }, [wallet.id]);

  const holdingsValue = portfolioSummary?.holdingsTotalUsd ?? 0;
  const positionsValue = portfolioSummary?.positionsTotalUsd ?? 0;
  const liveTotalValue = portfolioSummary?.totalPortfolioUsd ?? null;
  const allocationTotal = holdingsValue + positionsValue;
  const holdingsFlex = allocationTotal > 0 ? holdingsValue / allocationTotal : 0.5;
  const positionsFlex = allocationTotal > 0 ? positionsValue / allocationTotal : 0.5;
  const validatedPerformance = getValidatedPerformance(
    liveTotalValue,
    walletPerformance,
  );
  const performanceUnavailableText = getPerformanceUnavailableReason(walletPerformance);
  const hasPerformanceHistory =
    validatedPerformance?.change != null &&
    validatedPerformance.changePercent != null;
  const chainLabel = formatWalletChainsLabel(wallet.chainId, wallet.enabledChains);
  const networkOptions = getWalletEnabledChains(wallet.chainId, wallet.enabledChains).map((chainId) => ({
    value: chainId,
    label: formatChainDisplayName(chainId),
  }));
  const allNetworkOptions: NetworkFilterOption[] = [
    {value: null, label: 'All Networks'},
    ...networkOptions,
  ];
  const selectedNetworkLabel = allNetworkOptions.find((option) => option.value === selectedNetwork)?.label ?? 'All Networks';
  const holdingsStatusText =
    portfolioSummary?.holdingsTotalUsd == null ? 'Unavailable' : null;
  const positionsStatusText =
    portfolioSummary?.positionsTotalUsd == null ? 'Unavailable' : null;

  useEffect(() => {
    logPortfolioBalanceDecision({
      walletId: wallet.id,
      walletLabel: wallet.label,
      liveSummary: portfolioSummary,
      performance: walletPerformance,
      displayedBalance: liveTotalValue,
      reason:
        liveTotalValue != null
          ? 'live_summary_total'
          : portfolioLoading
            ? 'live_summary_loading'
            : 'live_summary_unavailable',
    });
  }, [
    liveTotalValue,
    portfolioLoading,
    portfolioSummary,
    wallet.id,
    wallet.label,
    walletPerformance,
  ]);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>‹</Text>
        </Pressable>

        <Pressable style={styles.headerButtonAccent} onPress={onEdit}>
          <Text style={styles.headerButtonAccentText}>✎</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.identityRow}>
          <View style={styles.identityTextBlock}>
            <Text style={styles.title}>{wallet.label || 'Unnamed wallet'}</Text>
            <Text style={styles.addressLine}>
              {shortenAddress(wallet.address)} • {chainLabel}
            </Text>
          </View>
        </View>

        <View style={styles.portfolioInlineBlock}>
          {portfolioLoading ? (
            <View style={styles.portfolioLoadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.portfolioLoadingText}>Loading portfolio totals...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.summaryTotalValue}>
                {formatUsd(liveTotalValue, 'Balance unavailable')}
              </Text>
              {hasPerformanceHistory ? (
                <Text
                  style={[
                    styles.performanceText,
                    validatedPerformance.change >= 0
                      ? styles.performancePositive
                      : styles.performanceNegative,
                  ]}>
                  {validatedPerformance.change >= 0 ? '+' : ''}
                  {formatUsd(validatedPerformance.change, '')} ·{' '}
                  {validatedPerformance.changePercent >= 0 ? '+' : ''}
                  {validatedPerformance.changePercent.toFixed(2)}%
                </Text>
              ) : (
                <Text style={styles.performanceCollecting}>{performanceUnavailableText}</Text>
              )}
              <View style={styles.allocationBar}>
                <View style={[styles.allocationFillHoldings, {flex: holdingsFlex}]} />
                <View style={[styles.allocationFillPositions, {flex: positionsFlex}]} />
              </View>
              <View style={styles.allocationLegendRow}>
                <View style={styles.allocationLegendItem}>
                  <View style={styles.allocationDotHoldings} />
                  <View>
                    <Text style={styles.allocationLabel}>Holdings</Text>
                    <Text style={styles.allocationValue}>
                      {formatUsd(portfolioSummary?.holdingsTotalUsd, 'Unavailable')}
                    </Text>
                    {holdingsStatusText ? (
                      <Text style={styles.allocationHint}>{holdingsStatusText}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.allocationLegendItem}>
                  <View style={styles.allocationDotPositions} />
                  <View>
                    <Text style={styles.allocationLabel}>Positions</Text>
                    <Text style={styles.allocationValue}>
                      {formatUsd(portfolioSummary?.positionsTotalUsd, 'Unavailable')}
                    </Text>
                    {positionsStatusText ? (
                      <Text style={styles.allocationHint}>{positionsStatusText}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.networkFilterWrap}>
        <Text style={styles.networkFilterLabel}>Network</Text>
        <View style={styles.networkDropdownContainer}>
          <Pressable
            style={styles.networkDropdownButton}
            onPress={() => setNetworkMenuOpen((current) => !current)}>
            <Text style={styles.networkDropdownButtonText}>{selectedNetworkLabel}</Text>
            <Text style={styles.networkDropdownChevron}>{networkMenuOpen ? '▴' : '▾'}</Text>
          </Pressable>
          {networkMenuOpen ? (
            <View style={styles.networkDropdownMenu}>
              {allNetworkOptions.map((option) => {
                const selected = option.value === selectedNetwork;

                return (
                  <Pressable
                    key={option.value ?? 'all-networks'}
                    style={[styles.networkDropdownItem, selected ? styles.networkDropdownItemActive : null]}
                    onPress={() => {
                      setSelectedNetwork(option.value);
                      setNetworkMenuOpen(false);
                    }}>
                    <Text style={[styles.networkDropdownItemText, selected ? styles.networkDropdownItemTextActive : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tabButton, activeTab === 'tokens' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tokens')}>
          <Text style={[styles.tabText, activeTab === 'tokens' && styles.tabTextActive]}>Tokens</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'positions' && styles.tabButtonActive]}
          onPress={() => setActiveTab('positions')}>
          <Text style={[styles.tabText, activeTab === 'positions' && styles.tabTextActive]}>Positions</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {activeTab === 'tokens' ? <TokensScreen walletId={wallet.id} selectedChainId={selectedNetwork} /> : null}
        {activeTab === 'history' ? <EventsScreen walletId={wallet.id} selectedChainId={selectedNetwork} /> : null}
        {activeTab === 'positions' ? <PositionsScreen walletId={wallet.id} selectedChainId={selectedNetwork} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButton: {
    width: 38,
    height: 38,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 20,
  },
  headerButtonAccent: {
    width: 38,
    height: 38,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonAccentText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 22,
    backgroundColor: colors.card,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroGlow: {
    position: 'absolute',
    top: -24,
    right: -18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.elevated,
    opacity: 0.65,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identityTextBlock: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  addressLine: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  portfolioInlineBlock: {
    marginTop: 10,
  },
  portfolioLoadingRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryTotalValue: {
    marginTop: 2,
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  allocationBar: {
    marginTop: 8,
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  allocationFillHoldings: {
    backgroundColor: colors.primaryCtaFill,
  },
  allocationFillPositions: {
    backgroundColor: colors.accent,
  },
  allocationLegendRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 16,
  },
  performanceText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  performancePositive: {
    color: colors.positive,
  },
  performanceNegative: {
    color: colors.negative,
  },
  performanceCollecting: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  allocationLegendItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  allocationDotHoldings: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryCtaFill,
  },
  allocationDotPositions: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  allocationLabel: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  allocationValue: {
    marginTop: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  allocationHint: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 12,
    color: colors.textSecondary,
  },
  networkFilterWrap: {
    marginBottom: 10,
    zIndex: 20,
  },
  networkFilterLabel: {
    marginBottom: 7,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  networkDropdownContainer: {
    position: 'relative',
  },
  networkDropdownButton: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  networkDropdownButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  networkDropdownChevron: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  networkDropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  networkDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  networkDropdownItemActive: {
    backgroundColor: colors.elevated,
  },
  networkDropdownItemText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  networkDropdownItemTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    borderRadius: 18,
    padding: 4,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.card,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
});
