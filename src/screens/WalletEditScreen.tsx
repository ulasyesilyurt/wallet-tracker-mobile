import React, {useMemo, useRef, useState} from 'react';
import {
  Alert,
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
import {deleteWallet, updateWallet} from '../api/wallets';
import {
  DestructiveRow,
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
import {
  getWalletEnabledChains,
  SUPPORTED_WALLET_CHAIN_OPTIONS,
} from '../utils/chains';

type WalletEditScreenProps = {
  wallet: Wallet;
  onBack: () => void;
  onOpenAlertSettings: () => void;
  onSaved: (wallet: Wallet) => void;
  onDeleted: (walletId: string) => void;
};

const TRACK_TYPE_OPTIONS: Array<{key: WalletTrackType; label: string}> = [
  {key: 'token_transfer', label: 'Token transfers'},
  {key: 'nft_transfer', label: 'NFT transfers'},
  {key: 'native_transfer', label: 'Native transfers'},
];

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function WalletEditScreen({
  wallet,
  onBack,
  onOpenAlertSettings,
  onSaved,
  onDeleted,
}: WalletEditScreenProps) {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = getWalletManagementLayout(width);
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const bottomInset = getWalletManagementBottomInset(platform, insets.bottom);
  const labelRef = useRef<TextInput>(null);
  const [address, setAddress] = useState(wallet.address);
  const [label, setLabel] = useState(wallet.label ?? '');
  const [selectedChains, setSelectedChains] = useState<string[]>(
    getWalletEnabledChains(wallet.chainId, wallet.enabledChains),
  );
  const [selectedTrackTypes, setSelectedTrackTypes] = useState<WalletTrackType[]>(
    wallet.trackTypes ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [chainsError, setChainsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const normalizedTrackTypes = useMemo(
    () =>
      TRACK_TYPE_OPTIONS.filter(option =>
        selectedTrackTypes.includes(option.key),
      ).map(option => option.key),
    [selectedTrackTypes],
  );

  function toggleTrackType(trackType: WalletTrackType) {
    setSelectedTrackTypes(current =>
      current.includes(trackType)
        ? current.filter(item => item !== trackType)
        : [...current, trackType],
    );
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

  function validateAddress(value: string) {
    const normalized = value.trim();
    if (normalized.length === 0) return 'Wallet address is required';
    if (!EVM_ADDRESS_PATTERN.test(normalized)) {
      return 'Enter a valid EVM wallet address';
    }
    return null;
  }

  async function handleSave() {
    if (saving || deleting) return;

    const nextAddressError = validateAddress(address);
    if (nextAddressError) {
      setAddressError(nextAddressError);
      return;
    }
    if (selectedChains.length === 0) {
      setChainsError('Select at least one chain');
      return;
    }

    setSaving(true);
    setAddressError(null);
    setChainsError(null);
    setSubmitError(null);

    try {
      const updatedWallet = await updateWallet(wallet.id, {
        address: address.trim(),
        label: label.trim() || undefined,
        trackTypes: normalizedTrackTypes,
        enabledChains: selectedChains,
      });
      onSaved(updatedWallet);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not update wallet',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (saving || deleting) return;
    setDeleting(true);
    setSubmitError(null);

    try {
      await deleteWallet(wallet.id);
      onDeleted(wallet.id);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not delete wallet',
      );
    } finally {
      setDeleting(false);
    }
  }

  function handleDeletePress() {
    if (saving || deleting) return;
    Alert.alert(
      'Delete wallet?',
      'This will stop tracking the wallet and remove it from your followed list.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDeleteConfirmed,
        },
      ],
    );
  }

  const disabled = saving || deleting;

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
            title="Edit wallet"
            walletLabel={wallet.label || 'Wallet'}
            onBack={onBack}
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
                  disabled={disabled}
                  switchValue={selectedTrackTypes.includes(option.key)}
                  onPress={() => {
                    if (!disabled) toggleTrackType(option.key);
                  }}
                />
              ))}
            </View>
          </View>

          <View style={{marginTop: layout.sectionGap}}>
            <ListSectionHeader first title="Alerts" />
            <SettingRow
              type="navigation"
              label="Alert settings"
              disabled={disabled}
              onPress={() => {
                if (!disabled) onOpenAlertSettings();
              }}
            />
          </View>

          <DestructiveRow
            label={deleting ? 'Deleting…' : 'Delete wallet'}
            consequence="Stops monitoring. On-chain funds are unaffected."
            disabled={disabled}
            onPress={handleDeletePress}
          />
        </ScrollView>

        <FormActionBar
          label="Save changes"
          onPress={handleSave}
          busy={saving}
          disabled={deleting}
          bottomInset={bottomInset}
          error={submitError}
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
});
