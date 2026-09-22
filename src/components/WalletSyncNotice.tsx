import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {walletDetailColors as colors} from '../theme/walletDetail';

export function WalletSyncNotice({message}: {message: string}) {
  return (
    <View style={styles.notice}>
      <Text accessibilityLiveRegion="polite" style={styles.text}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderLeftWidth: 2,
    borderLeftColor: colors.warning,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  text: {
    color: colors.textDim,
    fontSize: 12.5,
    lineHeight: 18,
  },
});
