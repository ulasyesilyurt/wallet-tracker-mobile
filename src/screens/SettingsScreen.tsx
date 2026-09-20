import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { getWallets } from '../api/wallets';
import { ListSectionHeader, SettingRow } from '../components/SettingsUI';
import { SafeAreaScreen } from '../components/SafeAreaScreen';
import { appInfo } from '../config/app';
import { getSettingsLayout, settingsColors as colors } from '../theme/settings';
import { useTabBarInset } from '../navigation/TabBarInsetContext';

type SettingsScreenProps = {
  onOpenNotificationHistory: () => void;
  onManageWallets: () => void;
  onAddWallet: () => void;
  onLogout: () => void;
};

// Capability audit for the current build. Unsupported settings remain absent;
// this screen does not create preferences or destinations to match the maximal
// design inventory.
const capabilities = {
  notificationHistory: true,
  alertRules: false,
  pushNotificationPreference: false,
  quietHours: false,
  minimumAlertValue: false,
  manageWallets: true,
  mutedWallets: false,
  addWallet: true,
  currency: false,
  appLock: false,
  haptics: false,
  clearCachedBalances: false,
  diagnostics: false,
  help: false,
  terms: false,
  privacy: false,
  removeAllWallets: false,
  logout: true,
} as const;

export function SettingsScreen({
  onOpenNotificationHistory,
  onManageWallets,
  onAddWallet,
  onLogout,
}: SettingsScreenProps) {
  const { width } = useWindowDimensions();
  const layout = getSettingsLayout(width);
  const tabBarInset = useTabBarInset();
  const [walletCount, setWalletCount] = useState<number | null>(null);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [walletsError, setWalletsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWalletCount() {
      setWalletsLoading(true);
      setWalletsError(false);

      try {
        const wallets = await getWallets();
        if (!cancelled) {
          setWalletCount(wallets.length);
        }
      } catch {
        if (!cancelled) {
          setWalletsError(true);
        }
      } finally {
        if (!cancelled) {
          setWalletsLoading(false);
        }
      }
    }

    loadWalletCount();

    return () => {
      cancelled = true;
    };
  }, []);

  const state = walletsLoading
    ? { label: 'Syncing…', dotStyle: styles.syncingDot }
    : walletsError
    ? { label: 'Offline', dotStyle: styles.offlineDot }
    : walletCount != null && walletCount > 0
    ? {
        label:
          'Monitoring ' +
          walletCount +
          ' ' +
          (walletCount === 1 ? 'wallet' : 'wallets'),
        dotStyle: styles.monitoringDot,
      }
    : null;
  const walletCountLabel =
    walletCount != null && walletCount > 0 ? String(walletCount) : null;
  const walletSectionMeta =
    walletCount != null && walletCount > 0
      ? String(walletCount) + ' watched'
      : null;

  return (
    <SafeAreaScreen
      style={[styles.screen, { paddingHorizontal: layout.gutter }]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: layout.headerPaddingTop,
            paddingBottom: layout.headerPaddingBottom,
          },
        ]}
      >
        <Text
          maxFontSizeMultiplier={1.2}
          style={[styles.title, { fontSize: layout.titleSize }]}
        >
          Settings
        </Text>
        {state ? (
          <View style={styles.systemState}>
            <View style={[styles.systemDot, state.dotStyle]} />
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={[styles.systemText, { fontSize: layout.stateSize }]}
            >
              {state.label}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(10, tabBarInset) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarInset }}
      >
        {capabilities.notificationHistory ? (
          <SettingsSection title="Alerts" first>
            <SettingRow
              type="navigation"
              label="Notification history"
              onPress={onOpenNotificationHistory}
            />
          </SettingsSection>
        ) : null}

        {capabilities.manageWallets || capabilities.addWallet ? (
          <SettingsSection title="Wallets" meta={walletSectionMeta}>
            {capabilities.manageWallets ? (
              <SettingRow
                type="navigation"
                label="Manage wallets"
                value={walletCountLabel}
                valueMonospace
                onPress={onManageWallets}
              />
            ) : null}
            {capabilities.addWallet ? (
              <SettingRow
                type="navigation"
                label="Add wallet"
                onPress={onAddWallet}
              />
            ) : null}
          </SettingsSection>
        ) : null}

        {capabilities.logout ? (
          <SettingsSection title="App">
            <SettingRow type="action" label="Log out" onPress={onLogout} />
          </SettingsSection>
        ) : null}

        <Text
          maxFontSizeMultiplier={1.4}
          style={[styles.version, { marginTop: layout.versionMarginTop }]}
        >
          {'Wallet Tracker ' + appInfo.version}
        </Text>
      </ScrollView>
    </SafeAreaScreen>
  );
}

function SettingsSection({
  title,
  meta,
  first = false,
  children,
}: {
  title: string;
  meta?: string | null;
  first?: boolean;
  children: React.ReactNode;
}) {
  if (React.Children.count(children) === 0) {
    return null;
  }

  return (
    <View>
      <ListSectionHeader title={title} meta={meta} first={first} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexShrink: 0 },
  title: {
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.75,
    lineHeight: 32,
  },
  systemState: {
    minHeight: 20,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  systemDot: { width: 6, height: 6, borderRadius: 3 },
  monitoringDot: { backgroundColor: colors.positive },
  syncingDot: { backgroundColor: colors.warning },
  offlineDot: { backgroundColor: colors.textTertiary },
  systemText: { color: colors.textSecondary, fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 10 },
  version: {
    paddingBottom: 10,
    color: colors.textTertiary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 11,
    fontWeight: '400',
    textAlign: 'center',
  },
});
