import React, {useMemo, useState} from 'react';
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
import {createWallet} from '../api/wallets';
import {colors} from '../theme/colors';
import type {Wallet, WalletTrackType} from '../types/wallet';
import {SUPPORTED_WALLET_CHAIN_OPTIONS} from '../utils/chains';

const DEFAULT_CHAIN_ID = 'ethereum-mainnet';
const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

const TRACK_TYPE_OPTIONS: Array<{key: WalletTrackType; label: string}> = [
  {key: 'token_transfer', label: 'Token transfers'},
  {key: 'nft_transfer', label: 'NFT transfers'},
  {key: 'native_transfer', label: 'Native transfers'},
];

type AddWalletScreenProps = {
  onBack: () => void;
  onSaved: (wallet: Wallet) => void;
};

type TrackTypeState = Record<WalletTrackType, boolean>;

const INITIAL_TRACK_TYPE_STATE: TrackTypeState = {
  token_transfer: true,
  nft_transfer: true,
  native_transfer: true,
};

function normalizeAddress(value: string) {
  return value.trim();
}

export function AddWalletScreen({onBack, onSaved}: AddWalletScreenProps) {
  const [address, setAddress] = useState('');
  const [selectedChains, setSelectedChains] = useState<string[]>([DEFAULT_CHAIN_ID]);
  const [label, setLabel] = useState('');
  const [trackTypesState, setTrackTypesState] = useState<TrackTypeState>(INITIAL_TRACK_TYPE_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [chainsError, setChainsError] = useState<string | null>(null);
  const [trackTypesError, setTrackTypesError] = useState<string | null>(null);

  const selectedTrackTypes = useMemo(() => {
    return TRACK_TYPE_OPTIONS.filter(option => trackTypesState[option.key]).map(option => option.key);
  }, [trackTypesState]);

  function toggleTrackType(trackType: WalletTrackType, nextValue: boolean) {
    setTrackTypesState(current => ({
      ...current,
      [trackType]: nextValue,
    }));
  }

  function toggleChain(chainId: string) {
    setSelectedChains(current => {
      const nextChains = current.includes(chainId)
        ? current.filter(value => value !== chainId)
        : [...current, chainId];

      if (chainsError && nextChains.length > 0) {
        setChainsError(null);
      }

      return nextChains;
    });
  }

  function validateForm() {
    let hasError = false;
    const normalizedAddress = normalizeAddress(address);

    if (normalizedAddress.length === 0) {
      setAddressError('Wallet address is required');
      hasError = true;
    } else if (!EVM_ADDRESS_PATTERN.test(normalizedAddress)) {
      setAddressError('Enter a valid EVM wallet address');
      hasError = true;
    } else {
      setAddressError(null);
    }

    if (selectedChains.length === 0) {
      setChainsError('Select at least one chain');
      hasError = true;
    } else {
      setChainsError(null);
    }

    if (selectedTrackTypes.length === 0) {
      setTrackTypesError('Select at least one notification type');
      hasError = true;
    } else {
      setTrackTypesError(null);
    }

    return {
      hasError,
      normalizedAddress,
    };
  }

  async function handleSave() {
    const validation = validateForm();

    if (validation.hasError) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const wallet = await createWallet({
        address: validation.normalizedAddress,
        label: label.trim() || undefined,
        trackTypes: selectedTrackTypes,
        enabledChains: selectedChains,
      });

      onSaved(wallet);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save wallet');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.title}>Add wallet</Text>
        <Text style={styles.subtitle}>Track a wallet and choose which activity should trigger notifications.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Wallet address</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="0x..."
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, addressError ? styles.inputError : null]}
          value={address}
          onChangeText={value => {
            setAddress(value);
            if (addressError) {
              setAddressError(null);
            }
          }}
        />
        {addressError ? <Text style={styles.errorText}>{addressError}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Label</Text>
        <TextInput
          autoCapitalize="words"
          placeholder="My wallet"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          value={label}
          onChangeText={setLabel}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Chains</Text>
        <View style={styles.chainOptionsRow}>
          {SUPPORTED_WALLET_CHAIN_OPTIONS.map(option => {
            const selected = selectedChains.includes(option.chainId);

            return (
              <Pressable
                key={option.chainId}
                onPress={() => toggleChain(option.chainId)}
                style={[
                  styles.chainOptionSelected,
                  styles.chainOptionSelectable,
                  selected ? styles.chainOptionActive : null,
                ]}>
                <Text style={styles.chainOptionText}>{option.label}</Text>
                <Text style={styles.chainOptionHint}>
                  {selected ? 'Selected' : 'Tap to add'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {chainsError ? <Text style={styles.errorText}>{chainsError}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notifications</Text>
        <View style={styles.preferenceCard}>
          {TRACK_TYPE_OPTIONS.map(option => (
            <View key={option.key} style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>{option.label}</Text>
              <Switch
                value={trackTypesState[option.key]}
                onValueChange={value => {
                  toggleTrackType(option.key, value);
                  if (trackTypesError) {
                    setTrackTypesError(null);
                  }
                }}
                trackColor={{false: colors.border, true: colors.accent}}
                thumbColor={trackTypesState[option.key] ? colors.primaryCtaFill : colors.textSecondary}
              />
            </View>
          ))}
        </View>
        {trackTypesError ? <Text style={styles.errorText}>{trackTypesError}</Text> : null}
      </View>

      {submitError ? (
        <View style={styles.submitErrorCard}>
          <Text style={styles.submitErrorTitle}>Could not save wallet</Text>
          <Text style={styles.submitErrorText}>{submitError}</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.saveButton, submitting ? styles.saveButtonDisabled : null]}
        onPress={() => {
          void handleSave();
        }}
        disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color={colors.primaryCtaText} />
        ) : (
          <Text style={styles.saveButtonText}>Save wallet</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
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
  hero: {
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
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 18,
  },
  chainOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
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
  chainOptionSelected: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  chainOptionSelectable: {
    flex: 1,
  },
  chainOptionActive: {
    backgroundColor: colors.elevated,
    borderColor: colors.accent,
  },
  chainOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chainOptionHint: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  preferenceCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  preferenceLabel: {
    flex: 1,
    paddingRight: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  submitErrorCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.negative,
    padding: 14,
  },
  submitErrorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.negative,
  },
  submitErrorText: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
  saveButton: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: colors.primaryCtaFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.75,
  },
  saveButtonText: {
    color: colors.primaryCtaText,
    fontSize: 15,
    fontWeight: '700',
  },
});
