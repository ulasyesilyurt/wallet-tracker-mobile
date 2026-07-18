import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getWalletAlertSettings,
  updateWalletAlertSettings,
} from '../api/walletAlertSettings';
import { colors } from '../theme/colors';
import type { Wallet } from '../types/wallet';
import { shortenAddress } from '../utils/format';

type WalletAlertSettingsScreenProps = {
  wallet: Wallet;
  onBack: () => void;
};

type MinimumAmountValidation =
  | { error: string; value: null }
  | { error: null; value: number };

const USD_AMOUNT_PATTERN = /^(?:\d+(?:[.,]\d{0,2})?|[.,]\d{1,2})$/;

function validateMinimumAmount(value: string): MinimumAmountValidation {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return { error: 'Minimum USD amount is required', value: null };
  }

  const numericValue = Number(normalized.replace(',', '.'));

  if (!Number.isFinite(numericValue)) {
    return { error: 'Enter a numeric USD amount', value: null };
  }

  if (numericValue < 0) {
    return { error: 'Minimum USD amount must be 0 or higher', value: null };
  }

  if (!USD_AMOUNT_PATTERN.test(normalized)) {
    return { error: 'Use up to 2 decimal places', value: null };
  }

  return { error: null, value: numericValue };
}

export function WalletAlertSettingsScreen({
  wallet,
  onBack,
}: WalletAlertSettingsScreenProps) {
  const [minimumAlertUsd, setMinimumAlertUsd] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifyNftTransfers, setNotifyNftTransfers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [minimumAmountError, setMinimumAmountError] = useState<string | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const latestLoadIdRef = useRef(0);

  const loadSettings = useCallback(async () => {
    const requestId = latestLoadIdRef.current + 1;
    latestLoadIdRef.current = requestId;
    setLoading(true);
    setLoadError(null);

    try {
      const settings = await getWalletAlertSettings(wallet.id);

      if (latestLoadIdRef.current !== requestId) {
        return;
      }

      setMinimumAlertUsd(String(settings.minimumAlertUsd));
      setNotificationsEnabled(settings.notificationsEnabled);
      setNotifyNftTransfers(settings.notifyNftTransfers);
      setMinimumAmountError(null);
      setSaveError(null);
      setSuccessMessage(null);
    } catch (error) {
      if (latestLoadIdRef.current !== requestId) {
        return;
      }

      setLoadError(
        error instanceof Error
          ? error.message
          : 'Could not load alert settings',
      );
    } finally {
      if (latestLoadIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [wallet.id]);

  useEffect(() => {
    loadSettings();

    return () => {
      latestLoadIdRef.current += 1;
    };
  }, [loadSettings]);

  function clearSaveFeedback() {
    setSaveError(null);
    setSuccessMessage(null);
  }

  async function handleSave() {
    if (saving) {
      return;
    }

    const validation = validateMinimumAmount(minimumAlertUsd);

    if (validation.error !== null) {
      setMinimumAmountError(validation.error);
      setSuccessMessage(null);
      return;
    }

    setSaving(true);
    setMinimumAmountError(null);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const settings = await updateWalletAlertSettings(wallet.id, {
        minimumAlertUsd: validation.value,
        notificationsEnabled,
        notifyNftTransfers,
      });

      setMinimumAlertUsd(String(settings.minimumAlertUsd));
      setNotificationsEnabled(settings.notificationsEnabled);
      setNotifyNftTransfers(settings.notifyNftTransfers);
      setSuccessMessage('Alert settings saved');
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Could not save alert settings',
      );
    } finally {
      setSaving(false);
    }
  }

  const subtitle = `${wallet.label || 'Unnamed wallet'} · ${shortenAddress(
    wallet.address,
  )}`;

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={onBack}
          style={styles.headerButton}
          disabled={saving}
        >
          <Text style={styles.headerButtonText}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Alert settings</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.stateText}>Loading alert settings...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Could not load alert settings</Text>
          <Text style={styles.stateErrorText}>{loadError}</Text>
          <Pressable style={styles.retryButton} onPress={loadSettings}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notifications</Text>
              <View style={styles.switchRow}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowTitle}>Notifications enabled</Text>
                  <Text style={styles.rowDescription}>
                    Turn wallet alerts on or off.
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={value => {
                    setNotificationsEnabled(value);
                    clearSaveFeedback();
                  }}
                  disabled={saving}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={
                    notificationsEnabled
                      ? colors.primaryCtaFill
                      : colors.textSecondary
                  }
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Token &amp; native alerts</Text>
              <Text style={styles.inputLabel}>Minimum USD amount</Text>
              <TextInput
                value={minimumAlertUsd}
                onChangeText={value => {
                  setMinimumAlertUsd(value);
                  setMinimumAmountError(null);
                  clearSaveFeedback();
                }}
                keyboardType="decimal-pad"
                autoCorrect={false}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                editable={!saving}
                style={[
                  styles.input,
                  minimumAmountError ? styles.inputError : null,
                ]}
              />
              {minimumAmountError ? (
                <Text style={styles.fieldErrorText}>{minimumAmountError}</Text>
              ) : (
                <Text style={styles.helperText}>
                  Only send token/native push alerts above this USD value. Use 0
                  to receive every priced token/native alert.
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>NFT alerts</Text>
              <View style={styles.switchRow}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowTitle}>Notify NFT transfers</Text>
                  <Text style={styles.rowDescription}>
                    NFT alerts do not use the USD threshold.
                  </Text>
                </View>
                <Switch
                  value={notifyNftTransfers}
                  onValueChange={value => {
                    setNotifyNftTransfers(value);
                    clearSaveFeedback();
                  }}
                  disabled={saving}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={
                    notifyNftTransfers
                      ? colors.primaryCtaFill
                      : colors.textSecondary
                  }
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {saveError ? (
              <Text style={styles.saveErrorText}>{saveError}</Text>
            ) : null}
            {successMessage ? (
              <Text style={styles.successText}>{successMessage}</Text>
            ) : null}
            <Pressable
              style={[
                styles.saveButton,
                saving ? styles.saveButtonDisabled : null,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.primaryCtaText} />
              ) : (
                <Text style={styles.saveButtonText}>Save alert settings</Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 20,
  },
  headerRow: {
    paddingHorizontal: 18,
  },
  headerButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  header: {
    marginTop: 18,
    marginBottom: 18,
    paddingHorizontal: 18,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  sectionLabel: {
    marginBottom: 12,
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  rowTextBlock: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  rowDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.negative,
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textSecondary,
  },
  fieldErrorText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.negative,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 80,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateErrorText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: colors.negative,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  saveButton: {
    backgroundColor: colors.primaryCtaFill,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.primaryCtaText,
    fontSize: 16,
    fontWeight: '700',
  },
  saveErrorText: {
    marginBottom: 10,
    fontSize: 13,
    color: colors.negative,
  },
  successText: {
    marginBottom: 10,
    fontSize: 13,
    color: colors.positive,
  },
});
