import type { WalletEvent } from '../src/api/events';
import { getActivityLayout } from '../src/theme/activity';
import {
  calculateActivityDayNet,
  filterActivityEvents,
  getActivityFilterOptions,
  getActivityKind,
  getActivityQuietState,
  groupActivityEvents,
  resolveActivityRow,
  sortActivityChronologically,
} from '../src/utils/activityPresentation';

const now = new Date(2026, 8, 19, 12, 0, 0);

function event(id: string, overrides: Partial<WalletEvent> = {}): WalletEvent {
  return {
    id,
    walletId: 'wallet-1',
    walletLabel: 'Main wallet',
    walletAddress: `0x${'1'.repeat(40)}`,
    chainId: 'ethereum-mainnet',
    transactionHash: `0x${id.padStart(64, '0')}`,
    eventType: 'token_transfer',
    assetType: 'erc20',
    assetSymbol: 'ETH',
    assetName: 'Ether',
    amount: '1',
    usdValue: '100',
    usdValueStatus: 'priced_current',
    direction: 'incoming',
    occurredAt: new Date(2026, 8, 19, 10, 0, 0).toISOString(),
    fromAddress: `0x${'2'.repeat(40)}`,
    toAddress: `0x${'1'.repeat(40)}`,
    ...overrides,
  };
}

describe('activity presentation', () => {
  it('sorts reverse chronologically and preserves API order for ties', () => {
    const tiedAt = new Date(2026, 8, 19, 10, 0, 0).toISOString();
    const items = [
      event('first-tie', { occurredAt: tiedAt }),
      event('older', {
        occurredAt: new Date(2026, 8, 18, 10, 0, 0).toISOString(),
      }),
      event('second-tie', { occurredAt: tiedAt }),
      event('newest', {
        occurredAt: new Date(2026, 8, 19, 11, 0, 0).toISOString(),
      }),
    ];

    expect(sortActivityChronologically(items).map(item => item.id)).toEqual([
      'newest',
      'first-tie',
      'second-tie',
      'older',
    ]);
  });

  it('filters loaded events into All, In, Out, and Other without changing counts', () => {
    const items = [
      event('in'),
      event('out', { direction: 'outgoing' }),
      event('swap', { eventType: 'token_swap', direction: null }),
      event('old', {
        occurredAt: new Date(2026, 7, 1, 10, 0, 0).toISOString(),
      }),
    ];

    expect(filterActivityEvents(items, 'all')).toEqual(items);
    expect(filterActivityEvents(items, 'in').map(item => item.id)).toEqual([
      'in',
      'old',
    ]);
    expect(filterActivityEvents(items, 'out').map(item => item.id)).toEqual([
      'out',
    ]);
    expect(filterActivityEvents(items, 'other').map(item => item.id)).toEqual([
      'swap',
    ]);
    expect(getActivityFilterOptions(items, now)).toEqual([
      { id: 'all', label: 'All', count: 3 },
      { id: 'in', label: 'In', count: 1 },
      { id: 'out', label: 'Out', count: 1 },
      { id: 'other', label: 'Other', count: 1 },
    ]);
  });

  it('groups by local calendar day and keeps daily net independent of filters', () => {
    const incoming = event('incoming', { usdValue: '150' });
    const outgoing = event('outgoing', {
      direction: 'outgoing',
      usdValue: '40',
    });
    const yesterday = event('yesterday', {
      occurredAt: new Date(2026, 8, 18, 9, 0, 0).toISOString(),
    });

    const sections = groupActivityEvents(
      [incoming, outgoing, yesterday],
      [incoming, yesterday],
      false,
      now,
    );

    expect(sections.map(section => section.title)).toEqual([
      'Today',
      'Yesterday',
    ]);
    expect(sections[0].meta).toBe('+$110.00');
    expect(sections[0].data.map(item => item.id)).toEqual(['incoming']);
  });

  it('omits daily net when any relevant USD value is unavailable', () => {
    expect(
      calculateActivityDayNet([
        event('priced'),
        event('unpriced', {
          direction: 'outgoing',
          usdValue: null,
          usdValueStatus: 'unavailable',
        }),
      ]),
    ).toBeNull();
  });

  it.each([
    ['incoming', event('incoming'), 'Received ETH'],
    ['outgoing', event('outgoing', { direction: 'outgoing' }), 'Sent ETH'],
    [
      'swap',
      event('swap', { eventType: 'token_swap', direction: null }),
      'Swapped ETH',
    ],
    [
      'nft',
      event('nft', {
        eventType: 'nft_transfer',
        assetType: 'erc721',
        direction: 'incoming',
        assetSymbol: null,
        assetName: 'Art',
        assetTokenId: '7',
      }),
      'NFT received',
    ],
    [
      'approval',
      event('approval', {
        eventType: 'token_approval',
        direction: null,
      }),
      'Spend approval granted',
    ],
    [
      'failed',
      event('failed', { eventType: 'swap_failed', direction: null }),
      'Swap failed',
    ],
    [
      'pending',
      event('pending', { eventType: 'transaction_pending', direction: null }),
      'Transaction pending',
    ],
  ])('maps %s activity honestly', (kind, item, title) => {
    expect(getActivityKind(item)).toBe(kind);
    expect(resolveActivityRow(item, now).title).toBe(title);
  });

  it('keeps outgoing neutral in the model and omits unavailable fragments', () => {
    const outgoing = resolveActivityRow(
      event('outgoing', {
        direction: 'outgoing',
        amount: null,
        usdValue: null,
        usdValueStatus: null,
        toAddress: null,
        assetName: null,
        assetSymbol: null,
        assetContractAddress: null,
      }),
      now,
    );

    expect(outgoing.kind).toBe('outgoing');
    expect(outgoing.amount).toBeNull();
    expect(outgoing.usd).toBeNull();
    expect(outgoing.factPrefix).toBeNull();
    expect(outgoing.factAddress).toBeNull();
  });

  it('uses the quiet state only when no event is within seven days', () => {
    expect(getActivityQuietState([], now)).toBe(true);
    expect(getActivityQuietState([event('recent')], now)).toBe(false);
    expect(
      getActivityQuietState(
        [
          event('old', {
            occurredAt: new Date(2026, 7, 1, 10, 0, 0).toISOString(),
          }),
        ],
        now,
      ),
    ).toBe(true);
  });

  it('applies the 360pt narrow layout overrides', () => {
    expect(getActivityLayout(360)).toMatchObject({
      narrow: true,
      gutter: 16,
      rowHeight: 78,
      tileSize: 32,
    });
    expect(getActivityLayout(390)).toMatchObject({
      narrow: false,
      gutter: 20,
      rowHeight: 84,
      tileSize: 34,
    });
  });
});
