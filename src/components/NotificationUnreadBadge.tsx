import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { alertsColors as colors } from '../theme/alerts';

export function NotificationUnreadBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <View
      accessibilityLabel={`${count} unread alert${count === 1 ? '' : 's'}`}
      style={styles.badge}
    >
      <Text maxFontSizeMultiplier={1} style={styles.text}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -13,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.negative,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  text: {
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
});
