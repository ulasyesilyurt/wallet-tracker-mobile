import {
  parseNotificationTarget,
  resolveEventTarget,
  shouldHandleOpenKey,
} from '../src/notifications/notificationTarget';

describe('notification event targets', () => {
  it('parses wallet and wallet event ids from notification data', () => {
    expect(
      parseNotificationTarget({
        walletId: 'wallet-1',
        walletEventId: 'event-1',
      }),
    ).toEqual({
      walletId: 'wallet-1',
      walletEventId: 'event-1',
    });
  });

  it('keeps wallet navigation when the wallet event id is missing', () => {
    expect(parseNotificationTarget({walletId: 'wallet-1'})).toEqual({
      walletId: 'wallet-1',
      walletEventId: null,
    });
  });

  it('treats a new open key as a new tap, including for the same event', () => {
    expect(shouldHandleOpenKey(null, 1)).toBe(true);
    expect(shouldHandleOpenKey(1, 1)).toBe(false);
    expect(shouldHandleOpenKey(1, 2)).toBe(true);
  });

  it('finds the target against the full event list', () => {
    const events = [
      {id: 'event-on-selected-network', chainId: 'base-mainnet'},
      {id: 'target-event', chainId: 'ethereum-mainnet'},
    ];

    expect(
      resolveEventTarget({
        events,
        targetEventId: 'target-event',
        loading: false,
        loadFailed: false,
        targetLoadComplete: true,
      }),
    ).toEqual({status: 'found', event: events[1]});
  });

  it('definitively falls back when a successful load has no match', () => {
    expect(
      resolveEventTarget({
        events: [{id: 'event-1'}],
        targetEventId: 'missing-event',
        loading: false,
        loadFailed: false,
        targetLoadComplete: true,
      }),
    ).toEqual({status: 'not_found'});
  });

  it('keeps the target pending while loading and after a failed load', () => {
    expect(
      resolveEventTarget({
        events: [],
        targetEventId: 'event-1',
        loading: true,
        loadFailed: false,
        targetLoadComplete: false,
      }),
    ).toEqual({status: 'pending'});

    expect(
      resolveEventTarget({
        events: [],
        targetEventId: 'event-1',
        loading: false,
        loadFailed: true,
        targetLoadComplete: false,
      }),
    ).toEqual({status: 'pending'});
  });

  it('waits for a fresh target-specific load instead of using stale events', () => {
    expect(
      resolveEventTarget({
        events: [{id: 'event-1'}],
        targetEventId: 'event-1',
        loading: false,
        loadFailed: false,
        targetLoadComplete: false,
      }),
    ).toEqual({status: 'pending'});
  });
});
