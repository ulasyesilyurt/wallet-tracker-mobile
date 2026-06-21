import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export function TokensPlaceholder() {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Tokens</Text>
      <Text style={styles.title}>Coming soon</Text>
      <Text style={styles.body}>
        Portfolio holdings and balances will appear here once the tokens endpoint is ready.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fffdf9',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e6dccb',
    marginTop: 16,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8f7a57',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: '#241a11',
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#6d604f',
  },
});
