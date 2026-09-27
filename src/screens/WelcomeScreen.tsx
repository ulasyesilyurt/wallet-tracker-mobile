import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../theme/colors';

type WelcomeScreenProps = {
  onContinue: () => void;
};

const chainBellLogo = require('../assets/chainbell-logo.png');

export function WelcomeScreen({onContinue}: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, {paddingBottom: Math.max(32, insets.bottom + 20)}]}>
      <View style={styles.hero}>
        <View style={styles.logoHalo}>
          <Image
            source={chainBellLogo}
            style={styles.heroLogo}
            resizeMode="cover"
            accessibilityLabel="ChainBell logo"
          />
        </View>
        <Text style={styles.eyebrow}>YOUR WALLETS, IN THE KNOW</Text>
        <Text style={styles.title}>Real-time wallet alerts and tracking</Text>
        <Text style={styles.description}>
          Track wallets across chains, monitor activity, and get instant alerts.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          style={styles.continueButton}
          onPress={onContinue}>
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={19} color={colors.primaryCtaText} />
        </Pressable>
        <Text style={styles.footerNote}>Sign in or create an account next</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 24,
    justifyContent: 'space-between',
  },
  hero: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  logoHalo: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  heroLogo: {
    width: 202,
    height: 202,
    borderRadius: 101,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    textAlign: 'center',
    marginBottom: 14,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '800',
    letterSpacing: -1.1,
    textAlign: 'center',
    maxWidth: 360,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 340,
  },
  footer: {
    alignItems: 'center',
  },
  continueButton: {
    minHeight: 54,
    width: '100%',
    borderRadius: 999,
    backgroundColor: colors.primaryCtaFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  continueText: {
    color: colors.primaryCtaText,
    fontSize: 16,
    fontWeight: '800',
  },
  footerNote: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 16,
    textAlign: 'center',
  },
});
