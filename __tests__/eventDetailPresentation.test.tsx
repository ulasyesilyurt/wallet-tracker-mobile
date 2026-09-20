import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Linking, Modal, Text } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import type {
  TransactionActivityItem,
  WalletEvent,
} from '../src/api/events';
import { EventDetailModal } from '../src/components/EventDetailModal';
import { getEventDetailLayout } from '../src/theme/eventDetail';
import { resolveEventDetail } from '../src/utils/eventDetailPresentation';

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));

const walletAddress = `0x${'a'.repeat(40)}`;
const counterparty = `0x${'b'.repeat(40)}`;
const contractAddress = `0x${'c'.repeat(40)}`;
const transactionHash = `0x${'d'.repeat(64)}`;

function event(overrides: Partial<WalletEvent> = {}): WalletEvent {
  return {
    id: 'event-1',
    walletId: 'wallet-1',
    walletLabel: 'Main',
    walletAddress,
    chainId: 'ethereum-mainnet',
    transactionHash,
    eventType: 'token_transfer',
    assetType: 'ERC-20',
    assetSymbol: 'ETH',
    assetName: 'Ethereum',
    assetContractAddress: contractAddress,
    amount: '1.5',
    usdValue: 2910.5,
    usdValueStatus: 'priced_native_eth',
    direction: 'incoming',
    occurredAt: '2026-07-21T10:56:00.000Z',
    fromAddress: counterparty,
    ...overrides,
  };
}

function transaction(
  overrides: Partial<TransactionActivityItem> = {},
): TransactionActivityItem {
  return {
    itemType: 'transaction',
    activityType: 'nft_purchase',
    id: 'transaction-1',
    walletId: 'wallet-1',
    walletLabel: 'Main',
    walletAddress,
    chainId: 'ethereum-mainnet',
    transactionHash,
    occurredAt: '2026-07-21T10:56:00.000Z',
    usdValue: 118.6,
    usdValueStatus: 'priced_nft_trade',
    sentAssets: [
      {
        eventType: 'native_transfer',
        assetType: 'native',
        assetSymbol: 'ETH',
        assetName: 'Ethereum',
        amount: '0.0407',
        usdValue: 118.6,
        usdValueStatus: 'priced_native_eth',
      },
    ],
    receivedAssets: [
      {
        eventType: 'nft_transfer',
        assetType: 'ERC-721',
        assetName: 'Degen Pass',
        assetContractAddress: contractAddress,
        assetTokenId: '42',
        amount: '1',
      },
    ],
    ...overrides,
  };
}

describe('event detail presentation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('maps incoming and outgoing events without treating outflow as danger', () => {
    const incoming = resolveEventDetail(event());
    const outgoing = resolveEventDetail(
      event({
        id: 'outgoing',
        direction: 'outgoing',
        fromAddress: null,
        toAddress: counterparty,
      }),
    );

    expect(incoming).toMatchObject({
      kind: 'incoming',
      title: 'Received ETH',
      value: '≈ $2,910.5',
      legsTitle: 'Assets moved',
    });
    expect(incoming.legs[0]).toMatchObject({
      label: 'Received',
      amount: '+1.5 ETH',
      tone: 'incoming',
      struck: false,
    });
    expect(incoming.meta.some(item => item.id === 'from')).toBe(true);

    expect(outgoing.kind).toBe('outgoing');
    expect(outgoing.title).toBe('Sent ETH');
    expect(outgoing.legs[0]).toMatchObject({
      label: 'Sent',
      amount: '−1.5 ETH',
      tone: 'neutral',
      struck: false,
    });
    expect(outgoing.meta.some(item => item.id === 'to')).toBe(true);
  });

  it('maps the available swap leg honestly without inventing a second leg', () => {
    const detail = resolveEventDetail(
      event({
        eventType: 'swap',
        direction: 'outgoing',
        assetSymbol: 'USDC',
        assetName: 'USD Coin',
        amount: '59.94',
      }),
    );

    expect(detail.kind).toBe('swap');
    expect(detail.title).toBe('Swapped USDC');
    expect(detail.legs).toHaveLength(1);
    expect(detail.legs[0]).toMatchObject({
      label: 'Sent',
      amount: '−59.94 USDC',
      assetName: 'USD Coin',
      tone: 'neutral',
    });
  });

  it('maps an NFT purchase into flat sent and received legs', () => {
    const detail = resolveEventDetail(transaction());

    expect(detail).toMatchObject({
      kind: 'nft',
      title: 'NFT purchase',
      value: '≈ $118.60',
      legsTitle: 'Assets moved',
    });
    expect(detail.legs).toHaveLength(2);
    expect(detail.legs[0]).toMatchObject({
      label: 'Sent',
      amount: '−0.0407 ETH',
      assetName: 'Ethereum',
      usd: '$118.60',
      tone: 'neutral',
    });
    expect(detail.legs[1]).toMatchObject({
      label: 'Received',
      amount: '1 NFT',
      assetName: 'Degen Pass #42',
      usd: null,
      tone: 'incoming',
    });
    expect(detail.links.map(item => item.id)).toEqual(['explorer', 'opensea']);
  });

  it('replaces value with honest failed and pending result states', () => {
    const failed = resolveEventDetail(
      event({
        eventType: 'swap_failed',
        direction: 'outgoing',
        assetSymbol: 'USDC',
        amount: '59.94',
      }),
    );
    const pending = resolveEventDetail(
      event({ eventType: 'transaction_pending', direction: 'outgoing' }),
    );

    expect(failed).toMatchObject({
      kind: 'failed',
      status: 'failed',
      value: null,
      legsTitle: 'Attempted',
      result: { title: 'Reverted on-chain' },
    });
    expect(failed.legs[0]).toMatchObject({
      tone: 'failed',
      struck: true,
      usd: null,
    });
    expect(failed.links.map(item => item.id)).toEqual(['explorer']);

    expect(pending).toMatchObject({
      kind: 'pending',
      status: 'pending',
      value: null,
      legsTitle: null,
      result: { title: 'Not yet confirmed' },
    });
    expect(pending.legs).toEqual([]);
  });

  it('omits missing value, legs, counterparty, contract, and contextual links', () => {
    const detail = resolveEventDetail(
      event({
        eventType: 'contract_activity',
        assetType: null,
        assetSymbol: null,
        assetName: null,
        assetContractAddress: null,
        amount: null,
        usdValue: null,
        usdValueStatus: null,
        direction: null,
        fromAddress: null,
        toAddress: null,
      }),
    );

    expect(detail.value).toBeNull();
    expect(detail.legsTitle).toBeNull();
    expect(detail.legs).toEqual([]);
    expect(detail.meta.some(item => ['from', 'to', 'contract'].includes(item.id))).toBe(false);
    expect(detail.links.map(item => item.id)).toEqual(['explorer']);
    expect(JSON.stringify(detail)).not.toContain('Unknown');
    expect(JSON.stringify(detail)).not.toContain('—');
  });

  it('preserves copy, explorer, close button, scrim, and hardware-back paths', async () => {
    const onClose = jest.fn();
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <EventDetailModal event={event()} onClose={onClose} />,
      );
    });

    const copyFrom = renderer!.root.findByProps({
      accessibilityLabel: `Copy From, ${counterparty}`,
    });
    act(() => copyFrom.props.onPress());
    expect(Clipboard.setString).toHaveBeenCalledWith(counterparty);
    expect(renderer!.root.findAllByType(Text).some(node => node.props.children === '✓')).toBe(true);
    act(() => jest.advanceTimersByTime(1200));
    expect(renderer!.root.findAllByType(Text).some(node => node.props.children === '✓')).toBe(false);

    await act(async () => {
      await renderer!.root.findByProps({
        accessibilityLabel: 'View on block explorer',
      }).props.onPress();
    });
    expect(openURL).toHaveBeenCalledWith(
      `https://etherscan.io/tx/${transactionHash}`,
    );

    act(() => renderer!.root.findByProps({ accessibilityLabel: 'Close' }).props.onPress());
    act(() => renderer!.root.findByProps({ accessibilityLabel: 'Close event details' }).props.onPress());
    act(() => renderer!.root.findByType(Modal).props.onRequestClose());
    expect(onClose).toHaveBeenCalledTimes(3);

    act(() => renderer!.unmount());
  });

  it('applies the locked 360pt sizing overrides', () => {
    expect(getEventDetailLayout(360)).toMatchObject({
      narrow: true,
      gutter: 16,
      sheetRadius: 24,
      tileSize: 34,
      valueRowMinHeight: 50,
      legLabelWidth: 54,
      metaRowMinHeight: 42,
      linkRowMinHeight: 46,
    });
    expect(getEventDetailLayout(390)).toMatchObject({
      narrow: false,
      gutter: 20,
      sheetRadius: 26,
      tileSize: 36,
      valueRowMinHeight: 52,
      legLabelWidth: 58,
      metaRowMinHeight: 44,
      linkRowMinHeight: 48,
    });
  });
});
