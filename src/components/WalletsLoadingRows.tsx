import React from 'react';
import { StyleSheet, View } from 'react-native';
import { walletsColors as colors, getWalletsLayout } from '../theme/wallets';

export function WalletsLoadingRows({ width }: { width: number }) {
  const layout = getWalletsLayout(width);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading wallets"
      style={styles.list}
    >
      {[0, 1, 2].map(index => (
        <View
          key={index}
          style={[
            styles.row,
            {
              height: layout.rowHeight,
              borderRadius: layout.rowRadius,
              paddingHorizontal: layout.rowPadding,
              gap: layout.rowGap,
            },
          ]}
        >
          <View
            style={[
              styles.avatar,
              {
                width: layout.avatarSize,
                height: layout.avatarSize,
                borderRadius: layout.avatarSize / 2,
              },
            ]}
          />
          <View style={styles.identity}>
            <View style={styles.name} />
            <View style={styles.address} />
          </View>
          <View style={styles.value} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 18, gap: 8 },
  row: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    flexDirection: 'row',
  },
  avatar: { backgroundColor: colors.neutralTint },
  identity: { flex: 1, gap: 7 },
  name: {
    height: 17,
    width: '68%',
    borderRadius: 3,
    backgroundColor: colors.neutralTint,
  },
  address: {
    height: 11,
    width: '52%',
    borderRadius: 3,
    backgroundColor: colors.neutralTint,
  },
  value: {
    height: 19,
    width: 62,
    borderRadius: 3,
    backgroundColor: colors.neutralTint,
  },
});
