import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {getWalletEvents, type WalletEvent} from '../api/events';
import {EventCard} from '../components/EventCard';
import {EventDetailModal} from '../components/EventDetailModal';
import {colors} from '../theme/colors';
import {formatEventDayLabel, getEventDayKey} from '../utils/format';
import {
  resolveEventTarget,
  shouldHandleOpenKey,
} from '../notifications/notificationTarget';

type EventsScreenProps = {
  walletId: string;
  selectedChainId?: string | null;
  targetEventId?: string | null;
  targetOpenKey?: number;
  onTargetConsumed?: (openKey: number) => void;
};

type EventListItem =
  | {
      type: 'separator';
      key: string;
      label: string;
    }
  | {
      type: 'event';
      key: string;
      event: WalletEvent;
    };

function buildEventListItems(events: WalletEvent[]): EventListItem[] {
  const items: EventListItem[] = [];
  let lastDayKey: string | null = null;

  events.forEach((event) => {
    const dayKey = getEventDayKey(event.occurredAt);

    if (dayKey !== lastDayKey) {
      items.push({
        type: 'separator',
        key: `separator:${dayKey}`,
        label: formatEventDayLabel(event.occurredAt),
      });
      lastDayKey = dayKey;
    }

    items.push({
      type: 'event',
      key: `event:${event.id}`,
      event,
    });
  });

  return items;
}

export function EventsScreen({
  walletId,
  selectedChainId = null,
  targetEventId,
  targetOpenKey,
  onTargetConsumed,
}: EventsScreenProps) {
  const [events, setEvents] = useState<WalletEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<WalletEvent | null>(null);
  const [loadedTargetOpenKey, setLoadedTargetOpenKey] = useState<number | null>(null);
  const handledTargetOpenKeyRef = useRef<number | null>(null);
  const attemptedTargetOpenKeyRef = useRef<number | null>(null);
  const initialTargetOpenKeyRef = useRef(targetOpenKey ?? null);
  const latestRequestIdRef = useRef(0);

  const loadEvents = useCallback(async (
    isRefresh = false,
    requestTargetOpenKey: number | null = null,
  ) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    attemptedTargetOpenKeyRef.current = requestTargetOpenKey;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextEvents = await getWalletEvents(walletId);

      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setEvents(nextEvents);
      setLoadedTargetOpenKey(requestTargetOpenKey);
      setError(null);
    } catch (loadError) {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : 'Could not load events');
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [walletId]);

  useEffect(() => {
    loadEvents(false, initialTargetOpenKeyRef.current);
  }, [loadEvents]);

  useEffect(() => {
    if (
      targetOpenKey == null ||
      attemptedTargetOpenKeyRef.current === targetOpenKey
    ) {
      return;
    }

    loadEvents(false, targetOpenKey);
  }, [loadEvents, targetOpenKey]);

  useEffect(() => {
    if (!shouldHandleOpenKey(handledTargetOpenKeyRef.current, targetOpenKey)) {
      return;
    }

    const resolution = resolveEventTarget({
      events,
      targetEventId,
      loading,
      loadFailed: error != null,
      targetLoadComplete: loadedTargetOpenKey === targetOpenKey,
    });

    if (resolution.status === 'none' || resolution.status === 'pending') {
      return;
    }

    handledTargetOpenKeyRef.current = targetOpenKey ?? null;

    if (resolution.status === 'found') {
      setSelectedEvent(resolution.event);
    }

    if (targetOpenKey != null) {
      onTargetConsumed?.(targetOpenKey);
    }
  }, [
    error,
    events,
    loadedTargetOpenKey,
    loading,
    onTargetConsumed,
    targetEventId,
    targetOpenKey,
  ]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.stateText}>Loading history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Could not load history</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          onPress={() => {
            loadEvents(false, targetOpenKey ?? null);
          }}
          style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const filteredEvents = selectedChainId
    ? events.filter((event) => event.chainId === selectedChainId)
    : events;
  const listItems = buildEventListItems(filteredEvents);

  const renderItem: ListRenderItem<EventListItem> = ({item}) => {
    if (item.type === 'separator') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{item.label}</Text>
        </View>
      );
    }

    return <EventCard event={item.event} onPress={() => setSelectedEvent(item.event)} />;
  };

  return (
    <>
      <FlatList
        data={listItems}
        keyExtractor={item => item.key}
        contentContainerStyle={filteredEvents.length === 0 ? styles.emptyListContent : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              loadEvents(true, targetOpenKey ?? null);
            }}
            tintColor={colors.accent}
          />
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.stateText}>Wallet activity will appear here once events are available.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 2,
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorText: {
    marginTop: 10,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: colors.primaryCtaFill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryButtonText: {
    color: colors.primaryCtaText,
    fontWeight: '700',
  },
  dateSeparator: {
    paddingTop: 6,
    paddingBottom: 8,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
