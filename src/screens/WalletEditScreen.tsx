import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {deleteWallet, updateWallet} from '../api/wallets';
import {colors} from '../theme/colors';
import type {Wallet, WalletTrackType} from '../types/wallet';
import {shortenAddress} from '../utils/format';
import {formatWalletChainsLabel} from '../utils/chains';

type WalletEditScreenProps = {
  wallet: Wallet;
  onBack: () => void;
  onSaved: (wallet: Wallet) => void;
  onDeleted: (walletId: string) => void;
};

type TrackTypeOption = {
  key: WalletTrackType;
  title: string;
};

const TRACK_TYPE_OPTIONS: TrackTypeOption[] = [
  {key: 'token_transfer', title: 'Token transfers'},
  {key: 'nft_transfer', title: 'NFT transfers'},
  {key: 'native_transfer', title: 'Native transfers'},
];

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function WalletEditScreen({wallet, onBack, onSaved, onDeleted}: WalletEditScreenProps) {
  const [address, setAddress] = useState(wallet.address);
  const [label, setLabel] = useState(wallet.label ?? '');
  const [selectedTrackTypes, setSelectedTrackTypes] = useState<WalletTrackType[]>(wallet.trackTypes ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const normalizedTrackTypes = useMemo(() => {
    return TRACK_TYPE_OPTIONS.filter(option => selectedTrackTypes.includes(option.key)).map(option => option.key);
  }, [selectedTrackTypes]);

  function toggleTrackType(trackType: WalletTrackType) {
    setSelectedTrackTypes(current => {
      if (current.includes(trackType)) {
        return current.filter(item => item !== trackType);
      }

      return [...current, trackType];
    });
  }

  function validateAddress(value: string) {
    const normalized = value.trim();

    if (normalized.length === 0) {
      return 'Wallet address is required';
    }

    if (!EVM_ADDRESS_PATTERN.test(normalized)) {
      return 'Enter a valid EVM wallet address';
    }

    return null;
  }

  async function handleSave() {
    if (saving || deleting) {
      return;
    }

    const nextAddressError = validateAddress(address);

    if (nextAddressError) {
      setAddressError(nextAddressError);
      return;
    }

    setSaving(true);
    setAddressError(null);
    setSubmitError(null);

    try {
      const updatedWallet = await updateWallet(wallet.id, {
        address: address.trim(),
        label: label.trim() || undefined,
        trackTypes: normalizedTrackTypes,
      });

      onSaved(updatedWallet);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update wallet';
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (saving || deleting) {
      return;
    }

    setDeleting(true);
    setSubmitError(null);

    try {
      await deleteWallet(wallet.id);
      onDeleted(wallet.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete wallet';
      setSubmitError(message);
    } finally {
      setDeleting(false);
    }
  }

  function handleDeletePress() {
    if (saving || deleting) {
      return;
    }

    Alert.alert(
      'Delete wallet?',
      'This will stop tracking the wallet and remove it from your followed list.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void handleDeleteConfirmed();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{wallet.label || 'Wallet settings'}</Text>
          <Text style={styles.subtitle}>{shortenAddress(wallet.address)} · {formatWalletChainsLabel(wallet.chainId, wallet.enabledChains)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Wallet address</Text>
          <TextInput
            value={address}
            onChangeText={value => {
              setAddress(value);
              if (addressError) {
                setAddressError(null);
              }
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="0x..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, addressError ? styles.inputError : null]}
          />
          {addressError ? <Text style={styles.errorText}>{addressError}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Wallet label</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="My Main Wallet"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Track activity</Text>
          {TRACK_TYPE_OPTIONS.map(option => {
            const enabled = selectedTrackTypes.includes(option.key);

            return (
              <View key={option.key} style={styles.switchRow}>
                <Text style={styles.switchLabel}>{option.title}</Text>
                <Switch
                  value={enabled}
                  onValueChange={() => toggleTrackType(option.key)}
                  trackColor={{false: colors.border, true: colors.accent}}
                  thumbColor={enabled ? colors.primaryCtaFill : colors.textSecondary}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Danger zone</Text>
          <Text style={styles.dangerBody}>
            Deleting this wallet will stop tracking its activity and remove it from your list.
          </Text>
          <Pressable
            style={[styles.deleteButton, (saving || deleting) && styles.deleteButtonDisabled]}
            onPress={handleDeletePress}>
            {deleting ? (
              <ActivityIndicator color={colors.negative} />
            ) : (
              <Text style={styles.deleteButtonText}>Delete wallet</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {submitError ? <Text style={styles.submitErrorText}>{submitError}</Text> : null}
        <Pressable
          style={[styles.saveButton, (saving || deleting) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || deleting}>
          {saving ? <ActivityIndicator color={colors.primaryCtaText} /> : <Text style={styles.saveButtonText}>Save changes</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  headerButton: {
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
  section: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 12,
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
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.negative,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
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
  footer: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  submitErrorText: {
    marginBottom: 10,
    fontSize: 13,
    color: colors.negative,
  },
  dangerSection: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  dangerTitle: {
    fontSize: 12,
    color: colors.negative,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '800',
  },
  dangerBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  deleteButton: {
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.negative,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: colors.negative,
    fontSize: 15,
    fontWeight: '700',
  },
});
