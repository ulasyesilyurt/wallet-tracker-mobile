import type { NotificationHistoryItem } from '../src/api/notifications';
import {
  filterNotificationHistory,
  formatNotificationAge,
  getNotificationFilterOptions,
  getNotificationRowCopy,
  groupNotificationHistory,
  isNotificationWithinDays,
} from '../src/utils/notificationHistoryPresentation';

function notification(
  id: string,
  occurredAt: string,
  overrides: Partial<NotificationHistoryItem['walletEvent']> = {},
): NotificationHistoryItem {
  return {
    id,
    walletId: 'wallet-1',
    chainId: 'ethereum-mainnet',
    type: overrides.eventType ?? 'token_transfer',
    category: overrides.eventType === 'nft_transfer' ? 'nft' : 'movement',
    severity: overrides.eventType === 'nft_transfer' ? 'info' : 'warning',
    title: 'Backend alert title',
    body: 'Backend alert body',
    readAt: null,
    isRead: false,
    relatedEventId: `event-${id}`,
    transactionHash: `0x${'2'.repeat(64)}`,
    status: 'delivered',
    providerMessageId: null,
    errorMessage: null,
    createdAt: occurredAt,
    sentAt: occurredAt,
    walletEvent: {
      id: `event-${id}`,
      walletId: 'wallet-1',
      walletLabel: 'Main',
      walletAddress: `0x${'1'.repeat(40)}`,
      transactionHash: `0x${'2'.repeat(64)}`,
      eventType: 'token_transfer',
      direction: 'outgoing',
      assetSymbol: 'ETH',
      amount: '0.5',
      fromAddress: `0x${'3'.repeat(40)}`,
      toAddress: `0x${'4'.repeat(40)}`,
      chainId: 'ethereum-mainnet',
      createdAt: occurredAt,
      occurredAt,
      ...overrides,
    },
  };
}

const now = new Date('2026-09-19T12:00:00.000Z');

describe('notification history presentation', () => {
  it('detects quiet state inputs from the last seven days without using unread state', () => {
    expect(
      isNotificationWithinDays(
        notification('recent', '2026-09-18T12:00:00.000Z'),
        7,
        now,
      ),
    ).toBe(true);
    expect(
      isNotificationWithinDays(
        notification('old', '2026-09-01T12:00:00.000Z'),
        7,
        now,
      ),
    ).toBe(false);
  });

  it('keeps older alerts in one Earlier section when the screen is quiet', () => {
    const sections = groupNotificationHistory(
      [
        notification('older', '2026-08-01T10:00:00.000Z'),
        notification('newer', '2026-09-01T10:00:00.000Z'),
      ],
      true,
      now,
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Earlier');
    expect(sections[0].data.map(item => item.id)).toEqual(['newer', 'older']);
  });

  it('groups normal history by local calendar day and preserves newest-first order', () => {
    const sections = groupNotificationHistory(
      [
        notification('first', '2026-09-19T08:00:00.000Z'),
        notification('latest', '2026-09-19T11:00:00.000Z'),
        notification('yesterday', '2026-09-18T10:00:00.000Z'),
      ],
      false,
      now,
    );
    expect(sections[0].data.map(item => item.id)).toEqual(['latest', 'first']);
    expect(sections.flatMap(section => section.data)).toHaveLength(3);
  });

  it('uses backend title and body while preserving honest event glyphs and severity', () => {
    const item = notification('incoming', '2026-09-19T11:48:00.000Z', {
      direction: 'incoming',
      fromAddress: `0x${'a'.repeat(40)}`,
      amount: '2',
      assetSymbol: 'USDC',
    });
    expect(getNotificationRowCopy(item)).toMatchObject({
      title: 'Backend alert title',
      fact: 'Backend alert body',
      glyph: '↓',
      tone: 'warning',
    });
    expect(formatNotificationAge(item, now)).toBe('12m');
  });

  it('builds honest loaded-data filters without fabricating critical', () => {
    const movement = notification('move', '2026-09-19T11:00:00.000Z');
    const nft = {
      ...notification('nft', '2026-09-19T10:00:00.000Z', {
        eventType: 'nft_transfer',
      }),
      type: 'nft_transfer',
      category: 'nft',
      severity: 'info',
    };
    const options = getNotificationFilterOptions([movement, nft]);

    expect(options.map(option => option.id)).toEqual([
      'all',
      'warning',
      'moves',
    ]);
    expect(filterNotificationHistory([movement, nft], 'warning')).toEqual([
      movement,
    ]);
    expect(filterNotificationHistory([movement, nft], 'moves')).toEqual([
      movement,
    ]);
  });

  it('shows Critical only when the loaded backend data contains it', () => {
    const critical = {
      ...notification('critical', '2026-09-19T11:00:00.000Z'),
      severity: 'critical',
    };
    expect(getNotificationFilterOptions([critical])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'critical', count: 1 }),
      ]),
    );
  });
});
