import React, {useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {createWallet} from '../api/wallets';
import {
  FormActionBar,
  FormField,
  PushedScreenHeader,
  SegmentedChainSelect,
} from '../components/WalletManagementUI';
import {SafeAreaScreen} from '../components/SafeAreaScreen';
import {ListSectionHeader, SettingRow} from '../components/SettingsUI';
import {
  getWalletFormScrollBottomPadding,
  getWalletManagementBottomInset,
  getWalletManagementLayout,
  walletManagementColors as colors,
} from '../theme/walletManagement';
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
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = getWalletManagementLayout(width);
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const bottomInset = getWalletManagementBottomInset(platform, insets.bottom);
  const labelRef = useRef<TextInput>(null);
  const [address, setAddress] = useState('');
  const [selectedChains, setSelectedChains] = useState<string[]>([
    DEFAULT_CHAIN_ID,
  ]);
  const [label, setLabel] = useState('');
  const [trackTypesState, setTrackTypesState] =
    useState<TrackTypeState>(INITIAL_TRACK_TYPE_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [chainsError, setChainsError] = useState<string | null>(null);
  const [trackTypesError, setTrackTypesError] = useState<string | null>(null);

  const selectedTrackTypes = useMemo(
    () =>
      TRACK_TYPE_OPTIONS.filter(option => trackTypesState[option.key]).map(
        option => option.key,
      ),
    [trackTypesState],
  );

  function toggleTrackType(trackType: WalletTrackType, nextValue: boolean) {
    setTrackTypesState(current => ({...current, [trackType]: nextValue}));
  }

  function toggleChain(chainId: string) {
    setSelectedChains(current => {
      const nextChains = current.includes(chainId)
        ? current.filter(value => value !== chainId)
        : [...current, chainId];

      if (chainsError && nextChains.length > 0) setChainsError(null);
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

    return {hasError, normalizedAddress};
  }

  async function handleSave() {
    if (submitting) return;
    const validation = validateForm();
    if (validation.hasError) return;

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
      setSubmitError(
        error instanceof Error ? error.message : 'Could not save wallet',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaScreen style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoider}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: layout.gutter,
            paddingBottom: getWalletFormScrollBottomPadding(
              width,
              platform,
              insets.bottom,
            ),
          }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          scrollIndicatorInsets={{bottom: bottomInset}}
          showsVerticalScrollIndicator={false}
        >
          <PushedScreenHeader
            title="Add wallet"
            onBack={onBack}
            description="Watch any address. Nothing is ever signed or spent — Wallet Tracker only reads."
          />

          <View style={{marginTop: layout.sectionGap}}>
            <FormField
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              blurOnSubmit={false}
              label="Wallet address"
              message={addressError}
              mono
              onChangeText={value => {
                setAddress(value);
                if (addressError) setAddressError(null);
              }}
              onSubmitEditing={() => labelRef.current?.focus()}
              placeholder="0x…"
              returnKeyType="next"
              state={addressError ? 'error' : 'rest'}
              value={address}
            />
          </View>

          <View style={{marginTop: layout.fieldGap}}>
            <FormField
              ref={labelRef}
              autoCapitalize="words"
              label="Label"
              onChangeText={setLabel}
              onSubmitEditing={Keyboard.dismiss}
              placeholder="Main, Cold, Trading…"
              returnKeyType="done"
              value={label}
            />
          </View>

          <View style={{marginTop: layout.sectionGap}}>
            <ListSectionHeader first title="Network" />
            <SegmentedChainSelect
              options={SUPPORTED_WALLET_CHAIN_OPTIONS}
              selectedValues={selectedChains}
              onToggle={toggleChain}
            />
            {chainsError ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {chainsError}
              </Text>
            ) : null}
          </View>

          <View style={{marginTop: layout.sectionGap}}>
            <ListSectionHeader first title="Alert me about" />
            <View style={styles.preferenceRows}>
              {TRACK_TYPE_OPTIONS.map(option => (
                <SettingRow
                  key={option.key}
                  type="switch"
                  label={option.label}
                  switchValue={trackTypesState[option.key]}
                  onPress={() => {
                    toggleTrackType(option.key, !trackTypesState[option.key]);
                    if (trackTypesError) setTrackTypesError(null);
                  }}
                />
              ))}
            </View>
            {trackTypesError ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {trackTypesError}
              </Text>
            ) : null}
          </View>

          {submitError ? (
            <View style={styles.submitError}>
              <Text style={styles.submitErrorTitle}>Could not save wallet</Text>
              <Text style={styles.submitErrorBody}>{submitError}</Text>
            </View>
          ) : null}
        </ScrollView>

        <FormActionBar
          label="Save wallet"
          onPress={handleSave}
          busy={submitting}
          disabled={false}
          bottomInset={bottomInset}
        />
      </KeyboardAvoidingView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  keyboardAvoider: {flex: 1},
  preferenceRows: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  errorText: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: '500',
    color: colors.negative,
  },
  submitError: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.negative,
    paddingTop: 12,
  },
  submitErrorTitle: {fontSize: 14, fontWeight: '700', color: colors.negative},
  submitErrorBody: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
