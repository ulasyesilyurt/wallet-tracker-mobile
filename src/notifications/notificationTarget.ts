export type NotificationData = {
  [key: string]: string | object;
};

export type ParsedNotificationTarget = {
  walletId: string | null;
  walletEventId: string | null;
};

type IdentifiedEvent = {
  id: string;
  sourceEventIds?: string[];
};

export type EventTargetResolution<TEvent extends IdentifiedEvent> =
  | {status: 'none'}
  | {status: 'pending'}
  | {status: 'found'; event: TEvent}
  | {status: 'not_found'};

function getStringValue(value: string | object | undefined) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function parseNotificationTarget(
  data: NotificationData | undefined,
): ParsedNotificationTarget {
  return {
    walletId: getStringValue(data?.walletId),
    walletEventId: getStringValue(data?.walletEventId),
  };
}

export function shouldHandleOpenKey(
  handledOpenKey: number | null,
  openKey: number | null | undefined,
) {
  return openKey != null && handledOpenKey !== openKey;
}

export function resolveEventTarget<TEvent extends IdentifiedEvent>({
  events,
  targetEventId,
  loading,
  loadFailed,
  targetLoadComplete,
}: {
  events: TEvent[];
  targetEventId: string | null | undefined;
  loading: boolean;
  loadFailed: boolean;
  targetLoadComplete: boolean;
}): EventTargetResolution<TEvent> {
  if (!targetEventId) {
    return {status: 'none'};
  }

  if (loading || loadFailed || !targetLoadComplete) {
    return {status: 'pending'};
  }

  const event = events.find(candidate => {
    return (
      candidate.id === targetEventId ||
      candidate.sourceEventIds?.includes(targetEventId) === true
    );
  });
  return event ? {status: 'found', event} : {status: 'not_found'};
}
