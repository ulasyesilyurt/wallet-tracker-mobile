import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAuth} from '../auth/AuthContext';
import {appInfo} from '../config/app';
import {colors} from '../theme/colors';

type SettingsScreenProps = {
  onOpenNotificationHistory: () => void;
  onLogout: () => void;
};

export function SettingsScreen({onOpenNotificationHistory, onLogout}: SettingsScreenProps) {
  const {user} = useAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Account, alerts, and app details</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.accountRow}>
          <View style={styles.accountBadge}>
            <Text style={styles.accountBadgeText}>@</Text>
          </View>
          <View style={styles.accountTextBlock}>
            <Text style={styles.accountValue}>{user?.email ?? 'Signed out'}</Text>
            <Text style={styles.accountHint}>Authenticated session</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Notifications</Text>
        <Pressable style={styles.rowButton} onPress={onOpenNotificationHistory}>
          <View style={styles.rowLeading}>
            <View style={styles.rowIcon}>
              <Text style={styles.rowIconText}>◷</Text>
            </View>
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowTitle}>Notification history</Text>
              <Text style={styles.rowSubtitle}>Review recent wallet alerts</Text>
            </View>
          </View>
          <Text style={styles.rowChevron}>›</Text>
        </Pressable>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>App</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Name</Text>
          <Text style={styles.metaValue}>{appInfo.name}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Version</Text>
          <Text style={styles.metaValue}>{appInfo.version}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Environment</Text>
          <Text style={styles.metaValue}>{appInfo.environment}</Text>
        </View>
      </View>

      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
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
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textTertiary,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  accountRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  accountTextBlock: {
    flex: 1,
  },
  accountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  accountHint: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  rowButton: {
    marginTop: 12,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  rowTextBlock: {
    flex: 1,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textSecondary,
  },
  rowChevron: {
    fontSize: 20,
    lineHeight: 20,
    color: colors.textTertiary,
  },
  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  metaDivider: {
    marginTop: 12,
    height: 1,
    backgroundColor: colors.border,
  },
  logoutButton: {
    marginTop: 2,
    backgroundColor: colors.primaryCtaFill,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: colors.primaryCtaText,
    fontWeight: '800',
    fontSize: 15,
  },
});
