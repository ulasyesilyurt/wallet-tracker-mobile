import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {getWalletEvents, type WalletEvent} from '../api/events';
import {EventCard} from '../components/EventCard';
import {colors} from '../theme/colors';

type EventsScreenProps = {
  walletId: string;
  selectedChainId?: string | null;
};

export function EventsScreen({walletId, selectedChainId = null}: EventsScreenProps) {
  const [events, setEvents] = useState<WalletEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextEvents = await getWalletEvents(walletId);
      setEvents(nextEvents);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, [walletId]);

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
        <Pressable onPress={() => void loadEvents()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const filteredEvents = selectedChainId
    ? events.filter((event) => event.chainId === selectedChainId)
    : events;

  return (
    <FlatList
      data={filteredEvents}
      keyExtractor={item => item.id}
      contentContainerStyle={filteredEvents.length === 0 ? styles.emptyListContent : styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void loadEvents(true)} tintColor={colors.accent} />
      }
      ListHeaderComponent={
        filteredEvents.length > 0 ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryKicker}>History</Text>
            <Text style={styles.summaryTitle}>Recent wallet activity</Text>
            <Text style={styles.summaryBody}>
              Incoming and outgoing transfers are organized here so you can scan
              movement quickly.
            </Text>
          </View>
        ) : null
      }
      renderItem={({item}) => <EventCard event={item} />}
      ListEmptyComponent={
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.stateText}>Wallet activity will appear here once events are available.</Text>
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
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
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  summaryKicker: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryTitle: {
    marginTop: 7,
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryBody: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
