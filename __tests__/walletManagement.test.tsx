import React from 'react';
import {Alert, ScrollView, Text} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import {createWallet, deleteWallet, updateWallet} from '../src/api/wallets';
import {
  getWalletAlertSettings,
  updateWalletAlertSettings,
} from '../src/api/walletAlertSettings';
import {
  FormField,
  SegmentedChainSelect,
} from '../src/components/WalletManagementUI';
import {AddWalletScreen} from '../src/screens/AddWalletScreen';
import {WalletAlertSettingsScreen} from '../src/screens/WalletAlertSettingsScreen';
import {WalletEditScreen} from '../src/screens/WalletEditScreen';
import {
  getWalletFormScrollBottomPadding,
  getWalletManagementBottomInset,
  getWalletManagementLayout,
} from '../src/theme/walletManagement';
import type {Wallet} from '../src/types/wallet';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 24, bottom: 24, left: 0, right: 0}),
}));
jest.mock('../src/api/wallets', () => ({
  createWallet: jest.fn(),
  updateWallet: jest.fn(),
  deleteWallet: jest.fn(),
}));
jest.mock('../src/api/walletAlertSettings', () => ({
  getWalletAlertSettings: jest.fn(),
  updateWalletAlertSettings: jest.fn(),
}));

const wallet: Wallet = {
  id: 'wallet-1',
  userId: 'user-1',
  chainId: 'ethereum-mainnet',
  enabledChains: ['ethereum-mainnet'],
  address: '0x1111111111111111111111111111111111111111',
  label: 'Main',
  status: 'active',
  trackTypes: ['token_transfer', 'native_transfer'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const alertSettings = {
  minimumAlertUsd: 25,
  notificationsEnabled: true,
  notifyFungibleTransfers: true,
  notifyIncomingTransfers: true,
  notifyOutgoingTransfers: false,
  notifyNftTransfers: true,
};

function textContent(node: TestRenderer.ReactTestInstance) {
  return node
    .findAllByType(Text)
    .map(item => item.props.children)
    .flat(Infinity)
    .filter(value => typeof value === 'string' || typeof value === 'number')
    .join(' ');
}

function buttonWithText(
  renderer: TestRenderer.ReactTestRenderer,
  label: string,
) {
  const candidate = renderer.root
    .findAllByProps({accessibilityRole: 'button'})
    .find(node => textContent(node).includes(label));
  if (!candidate) throw new Error(`Button not found: ${label}`);
  return candidate;
}

async function renderAlertSettings() {
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <WalletAlertSettingsScreen
        wallet={wallet}
        onBack={jest.fn()}
      />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer!;
}

beforeEach(() => {
  jest.clearAllMocks();
  (createWallet as jest.Mock).mockResolvedValue(wallet);
  (updateWallet as jest.Mock).mockResolvedValue(wallet);
  (deleteWallet as jest.Mock).mockResolvedValue({id: wallet.id, deleted: true});
  (getWalletAlertSettings as jest.Mock).mockResolvedValue(alertSettings);
  (updateWalletAlertSettings as jest.Mock).mockResolvedValue(alertSettings);
});

it('renders invalid and valid FormField presentation states', () => {
  let invalid: TestRenderer.ReactTestRenderer;
  act(() => {
    invalid = TestRenderer.create(
      <FormField
        label="Wallet address"
        value="bad"
        state="error"
        message="Enter a valid EVM wallet address"
      />,
    );
  });
  expect(textContent(invalid!.root)).toContain('✕');
  expect(textContent(invalid!.root)).toContain('Enter a valid EVM wallet address');
  act(() => invalid!.unmount());

  let valid: TestRenderer.ReactTestRenderer;
  act(() => {
    valid = TestRenderer.create(
      <FormField label="Wallet address" value={wallet.address} state="valid" />,
    );
  });
  expect(textContent(valid!.root)).toContain('✓');
  act(() => valid!.unmount());
});

it('uses the existing multi-chain semantics in the segmented control', () => {
  const onToggle = jest.fn();
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <SegmentedChainSelect
        options={[
          {chainId: 'ethereum-mainnet', label: 'Ethereum'},
          {chainId: 'base-mainnet', label: 'Base'},
        ]}
        selectedValues={['ethereum-mainnet']}
        onToggle={onToggle}
      />,
    );
  });
  const base = renderer!.root.findByProps({accessibilityLabel: 'Base'});
  expect(base.props.accessibilityState.checked).toBe(false);
  act(() => base.props.onPress());
  expect(onToggle).toHaveBeenCalledWith('base-mainnet');
  act(() => renderer!.unmount());
});

it('preserves Add validation timing and submit payload', async () => {
  const onSaved = jest.fn();
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <AddWalletScreen onBack={jest.fn()} onSaved={onSaved} />,
    );
  });

  const save = buttonWithText(renderer!, 'Save wallet');
  expect(save.props.accessibilityState.disabled).toBe(false);
  await act(async () => {
    await save.props.onPress();
  });
  expect(textContent(renderer!.root)).toContain('Wallet address is required');
  expect(createWallet).not.toHaveBeenCalled();

  act(() => {
    renderer!.root
      .findByProps({accessibilityLabel: 'Wallet address'})
      .props.onChangeText(wallet.address);
    renderer!.root
      .findByProps({accessibilityLabel: 'Label'})
      .props.onChangeText('Main');
  });
  await act(async () => {
    await buttonWithText(renderer!, 'Save wallet').props.onPress();
  });
  expect(createWallet).toHaveBeenCalledWith({
    address: wallet.address,
    label: 'Main',
    trackTypes: ['token_transfer', 'nft_transfer', 'native_transfer'],
    enabledChains: ['ethereum-mainnet'],
  });
  expect(onSaved).toHaveBeenCalledWith(wallet);
  act(() => renderer!.unmount());
});

it('prevents a double Add submission while showing the busy state', async () => {
  let resolveCreate: (value: Wallet) => void = () => undefined;
  (createWallet as jest.Mock).mockImplementation(
    () => new Promise<Wallet>(resolve => (resolveCreate = resolve)),
  );
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <AddWalletScreen onBack={jest.fn()} onSaved={jest.fn()} />,
    );
  });
  act(() =>
    renderer!.root
      .findByProps({accessibilityLabel: 'Wallet address'})
      .props.onChangeText(wallet.address),
  );
  let firstSubmission: Promise<void>;
  act(() => {
    firstSubmission = buttonWithText(renderer!, 'Save wallet').props.onPress();
  });
  const busy = buttonWithText(renderer!, 'Saving…');
  expect(busy.props.accessibilityState.busy).toBe(true);
  act(() => {
    busy.props.onPress();
  });
  expect(createWallet).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolveCreate(wallet);
    await firstSubmission!;
  });
  act(() => renderer!.unmount());
});

it('prefills editable Edit fields and preserves the PATCH payload', async () => {
  const onSaved = jest.fn();
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <WalletEditScreen
        wallet={wallet}
        onBack={jest.fn()}
        onOpenAlertSettings={jest.fn()}
        onSaved={onSaved}
        onDeleted={jest.fn()}
      />,
    );
  });
  const address = renderer!.root.findByProps({accessibilityLabel: 'Wallet address'});
  const label = renderer!.root.findByProps({accessibilityLabel: 'Label'});
  expect(address.props.value).toBe(wallet.address);
  expect(address.props.editable).toBe(true);
  expect(label.props.value).toBe('Main');
  expect(
    renderer!.root.findByProps({accessibilityLabel: 'Ethereum'}).props.disabled,
  ).toBe(false);

  await act(async () => {
    await buttonWithText(renderer!, 'Save changes').props.onPress();
  });
  expect(updateWallet).toHaveBeenCalledWith(wallet.id, {
    address: wallet.address,
    label: 'Main',
    trackTypes: ['token_transfer', 'native_transfer'],
    enabledChains: ['ethereum-mainnet'],
  });
  expect(onSaved).toHaveBeenCalledWith(wallet);
  act(() => renderer!.unmount());
});

it('preserves the existing delete confirmation without deleting on row press', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <WalletEditScreen
        wallet={wallet}
        onBack={jest.fn()}
        onOpenAlertSettings={jest.fn()}
        onSaved={jest.fn()}
        onDeleted={jest.fn()}
      />,
    );
  });
  act(() => buttonWithText(renderer!, 'Delete wallet').props.onPress());
  expect(alert).toHaveBeenCalledWith(
    'Delete wallet?',
    'This will stop tracking the wallet and remove it from your followed list.',
    expect.any(Array),
  );
  expect(deleteWallet).not.toHaveBeenCalled();
  alert.mockRestore();
  act(() => renderer!.unmount());
});

it('renders only real Alert Settings capabilities and preserves batch save', async () => {
  const renderer = await renderAlertSettings();
  const text = textContent(renderer.root);
  expect(text).toContain('Event types');
  expect(text).toContain('Minimum USD amount');
  expect(text).toContain('Notifications enabled');
  expect(text).not.toContain('Mute this wallet');
  expect(text).not.toContain('Large transfer alert');

  act(() =>
    renderer.root
      .findByProps({accessibilityLabel: 'Outgoing transfers'})
      .props.onPress(),
  );
  expect(updateWalletAlertSettings).not.toHaveBeenCalled();
  await act(async () => {
    await buttonWithText(renderer, 'Save alert settings').props.onPress();
  });
  expect(updateWalletAlertSettings).toHaveBeenCalledWith(wallet.id, {
    ...alertSettings,
    notifyOutgoingTransfers: true,
  });
  act(() => renderer.unmount());
});

it('uses handled keyboard taps and the locked 360pt/safe-area tokens', async () => {
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <AddWalletScreen onBack={jest.fn()} onSaved={jest.fn()} />,
    );
  });
  expect(renderer!.root.findByType(ScrollView).props.keyboardShouldPersistTaps).toBe(
    'handled',
  );
  expect(getWalletManagementLayout(360)).toMatchObject({
    narrow: true,
    gutter: 16,
    titleSize: 26,
    fieldHeight: 50,
    segmentHeight: 46,
    rowHeight: 54,
    buttonHeight: 50,
  });
  expect(getWalletManagementBottomInset('android', 24)).toBe(24);
  expect(getWalletManagementBottomInset('ios', 34)).toBe(0);
  expect(getWalletFormScrollBottomPadding(360, 'android', 24)).toBe(94);
  act(() => renderer!.unmount());
});
