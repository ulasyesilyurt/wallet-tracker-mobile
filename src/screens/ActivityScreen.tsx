import React, {useEffect, useState} from 'react';
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
import {getGlobalActivity} from '../api/activity';
import {EventCard} from '../components/EventCard';
import {colors} from '../theme/colors';
import type {WalletEvent} from '../api/events';
import {formatEventDayLabel, getEventDayKey} from '../utils/format';

type ActivityListItem =
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

function buildActivityListItems(events: WalletEvent[]): ActivityListItem[] {
  const items: ActivityListItem[] = [];
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

export function ActivityScreen() {
  const [events, setEvents] = useState<WalletEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadActivity(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await getGlobalActivity();
      const sortedEvents = [...result.items].sort((left, right) => {
        return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
      });
      setEvents(sortedEvents);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load activity');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadActivity();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.stateText}>Loading activity...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Could not load activity</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => void loadActivity()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const listItems = buildActivityListItems(events);

  const renderItem: ListRenderItem<ActivityListItem> = ({item}) => {
    if (item.type === 'separator') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{item.label}</Text>
        </View>
      );
    }

    return <EventCard event={item.event} />;
  };

  return (
    <FlatList
      data={listItems}
      keyExtractor={item => item.key}
      contentContainerStyle={events.length === 0 ? styles.emptyContent : styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadActivity(true)}
          tintColor={colors.accent}
        />
      }
      ListHeaderComponent={
        events.length > 0 ? (
          <View style={styles.headerCard}>
            <Text style={styles.headerKicker}>Activity</Text>
            <Text style={styles.headerTitle}>Across followed wallets</Text>
            <Text style={styles.headerBody}>
              Recent transfers across your tracked wallets appear here so you can
              scan movement in one place.
            </Text>
          </View>
        ) : null
      }
      renderItem={renderItem}
      ListEmptyComponent={
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.stateText}>Tracked wallet activity will appear here as new events arrive.</Text>
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  headerKicker: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    marginTop: 7,
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerBody: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
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
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
