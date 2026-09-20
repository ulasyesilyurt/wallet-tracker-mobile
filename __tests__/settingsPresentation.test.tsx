import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Switch, Text } from 'react-native';
import { getWallets } from '../src/api/wallets';
import { SettingRow } from '../src/components/SettingsUI';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { getSettingsLayout } from '../src/theme/settings';
import type { Wallet } from '../src/types/wallet';

jest.mock('../src/api/wallets');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));

const mockedGetWallets = jest.mocked(getWallets);

function wallet(id: string): Wallet {
  return {
    id,
    userId: 'user-1',
    chainId: 'ethereum-mainnet',
    enabledChains: ['ethereum-mainnet'],
    address: '0x' + '1'.repeat(40),
    label: 'Main',
    status: 'active',
    trackTypes: ['token_transfer'],
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z',
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function allText(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(value => typeof value === 'string' || typeof value === 'number')
    .join(' ');
}

function renderScreen(
  overrides: Partial<React.ComponentProps<typeof SettingsScreen>> = {},
) {
  const props: React.ComponentProps<typeof SettingsScreen> = {
    onOpenNotificationHistory: jest.fn(),
    onManageWallets: jest.fn(),
    onAddWallet: jest.fn(),
    onLogout: jest.fn(),
    ...overrides,
  };
  const renderer = TestRenderer.create(<SettingsScreen {...props} />);
  return { renderer, props };
}

describe('Settings presentation', () => {
  let mounted: TestRenderer.ReactTestRenderer[];

  beforeEach(() => {
    mounted = [];
    mockedGetWallets.mockReset();
  });

  afterEach(() => {
    act(() => mounted.forEach(renderer => renderer.unmount()));
  });

  it('keeps Alerts first and renders only capabilities in the current build', async () => {
    mockedGetWallets.mockResolvedValue([
      wallet('wallet-1'),
      wallet('wallet-2'),
    ]);
    let result: ReturnType<typeof renderScreen>;
    await act(async () => {
      result = renderScreen();
    });
    mounted.push(result!.renderer);
    await flush();

    const text = allText(result!.renderer);
    expect(text.indexOf('Alerts')).toBeLessThan(text.indexOf('Wallets'));
    expect(text.indexOf('Wallets')).toBeLessThan(text.indexOf('App'));
    expect(text).toContain('Notification history');
    expect(text).toContain('Manage wallets');
    expect(text).toContain('Add wallet');
    expect(text).toContain('Log out');
    expect(text).toContain('Monitoring 2 wallets');
    expect(text).toContain('2 watched');
    expect(text).toContain('Wallet Tracker 0.0.1');

    [
      'Alert rules',
      'Push notifications',
      'Quiet hours',
      'Minimum alert value',
      'Muted wallets',
      'Currency',
      'App lock',
      'Haptics',
      'Data',
      'Clear cached balances',
      'Share anonymous diagnostics',
      'About',
      'Help & support',
      'Terms of service',
      'Privacy policy',
      'Remove all wallets',
    ].forEach(unavailableCopy => {
      expect(text).not.toContain(unavailableCopy);
    });
  });

  it('does not show fake zero values while loading or for an empty wallet list', async () => {
    let resolveWallets: ((wallets: Wallet[]) => void) | undefined;
    mockedGetWallets.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveWallets = resolve;
        }),
    );

    let result: ReturnType<typeof renderScreen>;
    await act(async () => {
      result = renderScreen();
    });
    mounted.push(result!.renderer);

    expect(allText(result!.renderer)).toContain('Syncing…');
    expect(allText(result!.renderer)).not.toContain('0 watched');
    expect(allText(result!.renderer)).not.toContain('Remove all wallets');

    await act(async () => resolveWallets?.([]));
    await flush();

    const text = allText(result!.renderer);
    expect(text).not.toContain('Monitoring');
    expect(text).not.toContain('0 watched');
    expect(text).toContain('Manage wallets');
    expect(text).toContain('Add wallet');
    expect(text).not.toContain('Remove all wallets');
  });

  it('drops unavailable values on error and keeps navigation rows usable', async () => {
    mockedGetWallets.mockRejectedValue(new Error('offline'));
    const onOpenNotificationHistory = jest.fn();
    const onManageWallets = jest.fn();
    const onAddWallet = jest.fn();
    const onLogout = jest.fn();

    let result: ReturnType<typeof renderScreen>;
    await act(async () => {
      result = renderScreen({
        onOpenNotificationHistory,
        onManageWallets,
        onAddWallet,
        onLogout,
      });
    });
    mounted.push(result!.renderer);
    await flush();

    expect(allText(result!.renderer)).toContain('Offline');
    expect(allText(result!.renderer)).not.toContain('watched');

    act(() =>
      result!.renderer.root
        .findByProps({ accessibilityLabel: 'Notification history' })
        .props.onPress(),
    );
    act(() =>
      result!.renderer.root
        .findByProps({ accessibilityLabel: 'Manage wallets' })
        .props.onPress(),
    );
    act(() =>
      result!.renderer.root
        .findByProps({ accessibilityLabel: 'Add wallet' })
        .props.onPress(),
    );
    act(() =>
      result!.renderer.root
        .findByProps({ accessibilityLabel: 'Log out' })
        .props.onPress(),
    );

    expect(onOpenNotificationHistory).toHaveBeenCalledTimes(1);
    expect(onManageWallets).toHaveBeenCalledTimes(1);
    expect(onAddWallet).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders navigation, switch, disabled, and destructive row contracts', () => {
    const navigate = jest.fn();
    const toggle = jest.fn();
    const destructive = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <>
          <SettingRow
            type="navigation"
            label="Destination"
            value="USD"
            onPress={navigate}
          />
          <SettingRow
            type="switch"
            label="Preference"
            switchValue
            onPress={toggle}
          />
          <SettingRow
            type="switch"
            label="Unavailable preference"
            switchValue={false}
            disabled
          />
          <SettingRow
            type="action"
            label="Destructive action"
            destructive
            onPress={destructive}
          />
        </>,
      );
    });
    mounted.push(renderer!);

    const destination = renderer!.root.findByProps({
      accessibilityLabel: 'Destination',
    });
    expect(destination.props.accessibilityRole).toBe('button');
    expect(allText(renderer!)).toContain('USD');
    expect(allText(renderer!)).toContain('›');

    const preference = renderer!.root.findByProps({
      accessibilityLabel: 'Preference',
    });
    expect(preference.props.accessibilityRole).toBe('switch');
    expect(preference.props.accessibilityState.checked).toBe(true);
    expect(renderer!.root.findAllByType(Switch)).toHaveLength(2);

    const disabled = renderer!.root.findByProps({
      accessibilityLabel: 'Unavailable preference',
    });
    expect(disabled.props.accessibilityState.disabled).toBe(true);
    expect(
      StyleSheet.flatten(disabled.props.style({ pressed: false })).opacity,
    ).toBe(0.55);

    act(() => destination.props.onPress());
    act(() => preference.props.onPress());
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('applies the 360pt layout overrides', () => {
    expect(getSettingsLayout(360)).toMatchObject({
      narrow: true,
      gutter: 16,
      titleSize: 27,
      rowMinHeight: 50,
      rowLabelSize: 14.5,
    });
    expect(getSettingsLayout(390)).toMatchObject({
      narrow: false,
      gutter: 20,
      titleSize: 30,
      rowMinHeight: 52,
      rowLabelSize: 15,
    });
  });
});
