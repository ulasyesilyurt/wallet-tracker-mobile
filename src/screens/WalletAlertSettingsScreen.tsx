import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SafeAreaScreen} from '../components/SafeAreaScreen';
import {
  getWalletAlertSettings,
  updateWalletAlertSettings,
} from '../api/walletAlertSettings';
import { colors as appColors } from '../theme/colors';
import {walletDetailColors} from '../theme/walletDetail';
import {WalletSectionHeader} from '../components/WalletDetailUI';
import {
  FormActionBar,
  FormField,
  PushedScreenHeader,
  WalletSubjectLine,
} from '../components/WalletManagementUI';
import {ListSectionHeader, SettingRow} from '../components/SettingsUI';
import type { Wallet } from '../types/wallet';
import { shortenAddress } from '../utils/format';
import {
  getWalletFormScrollBottomPadding,
  getWalletManagementBottomInset,
  getWalletManagementLayout,
  walletManagementColors,
} from '../theme/walletManagement';

type WalletAlertSettingsScreenProps = {
  wallet: Wallet;
  onBack: () => void;
  embedded?: boolean;
  bottomPadding?: number;
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
  embedded = false,
  bottomPadding = 16,
}: WalletAlertSettingsScreenProps) {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const managementLayout = getWalletManagementLayout(width);
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const managementBottomInset = getWalletManagementBottomInset(
    platform,
    insets.bottom,
  );
  const colors = embedded ? walletDetailColors : appColors;
  const styles = embedded ? embeddedStyles : defaultStyles;
  const ScreenContainer = embedded ? View : SafeAreaScreen;
  const switchTrackColor = embedded ? {false: 'rgba(255,255,255,0.10)', true: colors.positive}
    : {false: colors.border, true: colors.accent};
  const enabledThumbColor = embedded ? colors.background : colors.primaryCtaFill;
  const disabledThumbColor = embedded ? colors.textTertiary : colors.textSecondary;
  const [minimumAlertUsd, setMinimumAlertUsd] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifyFungibleTransfers, setNotifyFungibleTransfers] = useState(false);
  const [notifyIncomingTransfers, setNotifyIncomingTransfers] = useState(false);
  const [notifyOutgoingTransfers, setNotifyOutgoingTransfers] = useState(false);
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
      setNotifyFungibleTransfers(settings.notifyFungibleTransfers);
      setNotifyIncomingTransfers(settings.notifyIncomingTransfers);
      setNotifyOutgoingTransfers(settings.notifyOutgoingTransfers);
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

    if (notifyFungibleTransfers && validation.error !== null) {
      setMinimumAmountError(validation.error);
      setSuccessMessage(null);
      return;
    }

    const minimumAlertUsdValue = validation.value ?? 0;

    setSaving(true);
    setMinimumAmountError(null);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const settings = await updateWalletAlertSettings(wallet.id, {
        minimumAlertUsd: minimumAlertUsdValue,
        notificationsEnabled,
        notifyFungibleTransfers,
        notifyIncomingTransfers,
        notifyOutgoingTransfers,
        notifyNftTransfers,
      });

      setMinimumAlertUsd(String(settings.minimumAlertUsd));
      setNotificationsEnabled(settings.notificationsEnabled);
      setNotifyFungibleTransfers(settings.notifyFungibleTransfers);
      setNotifyIncomingTransfers(settings.notifyIncomingTransfers);
      setNotifyOutgoingTransfers(settings.notifyOutgoingTransfers);
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
  const alertControlsDisabled = saving || !notificationsEnabled;
  const fungibleControlsDisabled =
    alertControlsDisabled || !notifyFungibleTransfers;

  if (!embedded) {
    return (
      <SafeAreaScreen style={standaloneStyles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={standaloneStyles.keyboardAvoider}
        >
          {loading ? (
            <View
              style={[
                standaloneStyles.stateFrame,
                {paddingHorizontal: managementLayout.gutter},
              ]}
            >
              <PushedScreenHeader
                title="Alert settings"
                onBack={onBack}
              />
              <View style={standaloneStyles.centerState}>
                <ActivityIndicator size="large" color={walletManagementColors.accent} />
                <Text style={standaloneStyles.stateText}>
                  Loading alert settings...
                </Text>
              </View>
            </View>
          ) : loadError ? (
            <View
              style={[
                standaloneStyles.stateFrame,
                {paddingHorizontal: managementLayout.gutter},
              ]}
            >
              <PushedScreenHeader title="Alert settings" onBack={onBack} />
              <View style={standaloneStyles.centerState}>
                <Text style={standaloneStyles.errorTitle}>
                  Could not load alert settings
                </Text>
                <Text style={standaloneStyles.stateErrorText}>{loadError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={loadSettings}
                  style={standaloneStyles.retryButton}
                >
                  <Text style={standaloneStyles.retryText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <ScrollView
                contentContainerStyle={{
                  paddingHorizontal: managementLayout.gutter,
                  paddingBottom: getWalletFormScrollBottomPadding(
                    width,
                    platform,
                    insets.bottom,
                  ),
                }}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                scrollIndicatorInsets={{bottom: managementBottomInset}}
                showsVerticalScrollIndicator={false}
              >
                <PushedScreenHeader
                  title="Alert settings"
                  onBack={onBack}
                  backDisabled={saving}
                />
                <WalletSubjectLine
                  label={wallet.label || 'Unnamed wallet'}
                  address={wallet.address}
                />

                <View style={{marginTop: managementLayout.sectionGap}}>
                  <ListSectionHeader first title="Event types" />
                  <View style={standaloneStyles.rows}>
                    <SettingRow
                      type="switch"
                      label="Notify token/native transfers"
                      disabled={alertControlsDisabled}
                      switchValue={notifyFungibleTransfers}
                      onPress={() => {
                        if (alertControlsDisabled) return;
                        setNotifyFungibleTransfers(!notifyFungibleTransfers);
                        setMinimumAmountError(null);
                        clearSaveFeedback();
                      }}
                    />
                    <SettingRow
                      type="switch"
                      label="Incoming transfers"
                      disabled={fungibleControlsDisabled}
                      switchValue={notifyIncomingTransfers}
                      onPress={() => {
                        if (fungibleControlsDisabled) return;
                        setNotifyIncomingTransfers(!notifyIncomingTransfers);
                        clearSaveFeedback();
                      }}
                    />
                    <SettingRow
                      type="switch"
                      label="Outgoing transfers"
                      disabled={fungibleControlsDisabled}
                      switchValue={notifyOutgoingTransfers}
                      onPress={() => {
                        if (fungibleControlsDisabled) return;
                        setNotifyOutgoingTransfers(!notifyOutgoingTransfers);
                        clearSaveFeedback();
                      }}
                    />
                    <SettingRow
                      type="switch"
                      label="Notify NFT transfers"
                      disabled={alertControlsDisabled}
                      switchValue={notifyNftTransfers}
                      onPress={() => {
                        if (alertControlsDisabled) return;
                        setNotifyNftTransfers(!notifyNftTransfers);
                        clearSaveFeedback();
                      }}
                    />
                  </View>
                </View>

                <View style={{marginTop: managementLayout.sectionGap}}>
                  <ListSectionHeader
                    first
                    title="Thresholds"
                    meta="Applies to this wallet"
                  />
                  <FormField
                    autoCorrect={false}
                    editable={!fungibleControlsDisabled}
                    keyboardType="decimal-pad"
                    label="Minimum USD amount"
                    message={minimumAmountError}
                    onChangeText={value => {
                      setMinimumAlertUsd(value);
                      setMinimumAmountError(null);
                      clearSaveFeedback();
                    }}
                    placeholder="0.00"
                    state={
                      minimumAmountError
                        ? 'error'
                        : fungibleControlsDisabled
                        ? 'readOnly'
                        : 'rest'
                    }
                    value={minimumAlertUsd}
                  />
                </View>

                <View style={{marginTop: managementLayout.sectionGap}}>
                  <ListSectionHeader first title="Delivery" />
                  <View style={standaloneStyles.rows}>
                    <SettingRow
                      type="switch"
                      label="Notifications enabled"
                      disabled={saving}
                      switchValue={notificationsEnabled}
                      onPress={() => {
                        if (saving) return;
                        setNotificationsEnabled(!notificationsEnabled);
                        clearSaveFeedback();
                      }}
                    />
                  </View>
                </View>

                {successMessage ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={standaloneStyles.successText}
                  >
                    {successMessage}
                  </Text>
                ) : null}
              </ScrollView>

              <FormActionBar
                label="Save alert settings"
                onPress={handleSave}
                busy={saving}
                disabled={false}
                bottomInset={managementBottomInset}
                error={saveError}
              />
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaScreen>
    );
  }

  return (
    <ScreenContainer {...(embedded ? {style: styles.screen} : {style: styles.screen, topPadding: 20})}>
      {embedded ? <WalletSectionHeader label="Alert settings" /> : (
        <>
          <View style={styles.headerRow}>
            <Pressable
              onPress={onBack}
              style={styles.headerButton}
              hitSlop={6}
              disabled={saving}
            >
              <Text style={styles.headerButtonText}>Back</Text>
            </Pressable>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Alert settings</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

        </>
      )}

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
            contentContainerStyle={[styles.scrollContent, embedded && {paddingBottom: bottomPadding}]}
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
                  hitSlop={embedded ? {top: 7, bottom: 7, left: 0, right: 0} : undefined}
                  value={notificationsEnabled}
                  onValueChange={value => {
                    setNotificationsEnabled(value);
                    clearSaveFeedback();
                  }}
                  disabled={saving}
                  trackColor={switchTrackColor}
                  thumbColor={
                    notificationsEnabled
                      ? enabledThumbColor
                      : disabledThumbColor
                  }
                />
              </View>
            </View>

            <View
              style={[
                styles.section,
                !notificationsEnabled ? styles.sectionDisabled : null,
              ]}
            >
              <Text style={styles.sectionLabel}>Token &amp; native alerts</Text>
              <View style={styles.switchRow}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowTitle}>
                    Notify token/native transfers
                  </Text>
                  <Text style={styles.rowDescription}>
                    Include fungible token and native asset transfers.
                  </Text>
                </View>
                <Switch
                  hitSlop={embedded ? {top: 7, bottom: 7, left: 0, right: 0} : undefined}
                  value={notifyFungibleTransfers}
                  onValueChange={value => {
                    setNotifyFungibleTransfers(value);
                    setMinimumAmountError(null);
                    clearSaveFeedback();
                  }}
                  disabled={alertControlsDisabled}
                  trackColor={switchTrackColor}
                  thumbColor={
                    notifyFungibleTransfers
                      ? enabledThumbColor
                      : disabledThumbColor
                  }
                />
              </View>

              <View
                style={[
                  styles.fungibleDetailControls,
                  notificationsEnabled && !notifyFungibleTransfers
                    ? styles.controlsDisabled
                    : null,
                ]}
              >
                <View style={styles.switchRow}>
                  <Text style={styles.rowTitle}>Incoming transfers</Text>
                  <Switch
                  hitSlop={embedded ? {top: 7, bottom: 7, left: 0, right: 0} : undefined}
                    value={notifyIncomingTransfers}
                    onValueChange={value => {
                      setNotifyIncomingTransfers(value);
                      clearSaveFeedback();
                    }}
                    disabled={fungibleControlsDisabled}
                    trackColor={switchTrackColor}
                    thumbColor={
                      notifyIncomingTransfers
                        ? enabledThumbColor
                        : disabledThumbColor
                    }
                  />
                </View>

                <View style={styles.controlDivider} />

                <View style={styles.switchRow}>
                  <Text style={styles.rowTitle}>Outgoing transfers</Text>
                  <Switch
                  hitSlop={embedded ? {top: 7, bottom: 7, left: 0, right: 0} : undefined}
                    value={notifyOutgoingTransfers}
                    onValueChange={value => {
                      setNotifyOutgoingTransfers(value);
                      clearSaveFeedback();
                    }}
                    disabled={fungibleControlsDisabled}
                    trackColor={switchTrackColor}
                    thumbColor={
                      notifyOutgoingTransfers
                        ? enabledThumbColor
                        : disabledThumbColor
                    }
                  />
                </View>

                <View style={styles.controlDivider} />

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
                  editable={!fungibleControlsDisabled}
                  style={[
                    styles.input,
                    minimumAmountError ? styles.inputError : null,
                  ]}
                />
                {minimumAmountError ? (
                  <Text style={styles.fieldErrorText}>
                    {minimumAmountError}
                  </Text>
                ) : (
                  <Text style={styles.helperText}>
                    Only send token/native push alerts above this USD value. Use
                    0 to receive every priced token/native alert.
                  </Text>
                )}
              </View>
            </View>

            <View
              style={[
                styles.section,
                !notificationsEnabled ? styles.sectionDisabled : null,
              ]}
            >
              <Text style={styles.sectionLabel}>NFT alerts</Text>
              <View style={styles.switchRow}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowTitle}>Notify NFT transfers</Text>
                  <Text style={styles.rowDescription}>
                    NFT alerts do not use the USD threshold.
                  </Text>
                </View>
                <Switch
                  hitSlop={embedded ? {top: 7, bottom: 7, left: 0, right: 0} : undefined}
                  value={notifyNftTransfers}
                  onValueChange={value => {
                    setNotifyNftTransfers(value);
                    clearSaveFeedback();
                  }}
                  disabled={alertControlsDisabled}
                  trackColor={switchTrackColor}
                  thumbColor={
                    notifyNftTransfers
                      ? enabledThumbColor
                      : disabledThumbColor
                  }
                />
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, embedded && {paddingBottom: bottomPadding}]}>
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
    </ScreenContainer>
  );
}

const createStyles = (colors: Record<keyof typeof appColors, string>) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 20,
  },
  headerRow: {
    paddingHorizontal: 18,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionDisabled: {
    opacity: 0.5,
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
  fungibleDetailControls: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  controlsDisabled: {
    opacity: 0.5,
  },
  controlDivider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: colors.border,
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

const defaultStyles = createStyles(appColors);
const embeddedBaseStyles = createStyles(walletDetailColors);
const embeddedStyles = {
  ...embeddedBaseStyles,
  screen: {...embeddedBaseStyles.screen, paddingTop: 0},
  scrollContent: {...embeddedBaseStyles.scrollContent, paddingHorizontal: 0},
  section: {...embeddedBaseStyles.section, padding: 14, borderRadius: 18},
  switchRow: {...embeddedBaseStyles.switchRow, minHeight: 44},
  retryButton: {...embeddedBaseStyles.retryButton, minHeight: 44, justifyContent: 'center' as const},
  sectionLabel: {...embeddedBaseStyles.sectionLabel, textTransform: 'none' as const, letterSpacing: 0, fontSize: 13.5},
  footer: {...embeddedBaseStyles.footer, paddingHorizontal: 0, paddingBottom: 16},
  saveButton: {...embeddedBaseStyles.saveButton, minHeight: 50, borderRadius: 16},
};

const standaloneStyles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: walletManagementColors.background},
  keyboardAvoider: {flex: 1},
  stateFrame: {flex: 1},
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 72,
  },
  stateText: {
    marginTop: 12,
    fontSize: 13,
    color: walletManagementColors.textSecondary,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: walletManagementColors.textPrimary,
    textAlign: 'center',
  },
  stateErrorText: {
    marginTop: 8,
    fontSize: 12.5,
    lineHeight: 18,
    color: walletManagementColors.negative,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 44,
    minHeight: 44,
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 11,
    backgroundColor: walletManagementColors.neutralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: walletManagementColors.textPrimary,
  },
  rows: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: walletManagementColors.divider,
  },
  successText: {
    marginTop: 18,
    fontSize: 12.5,
    fontWeight: '600',
    color: walletManagementColors.positive,
  },
});
