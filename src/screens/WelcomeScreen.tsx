import React from 'react';
import {Image, Platform, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AuthPrimaryButton} from '../components/AuthUI';
import {authColors} from '../theme/auth';

type WelcomeScreenProps = {
  onContinue: () => void;
};

const chainBellLogo = require('../assets/chainbell-logo.png');

export function WelcomeScreen({onContinue}: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const safePadding = {
    paddingTop: 20 + (Platform.OS === 'android' ? insets.top : 0),
    paddingBottom: Platform.OS === 'ios' ? 8 : Math.max(16, insets.bottom + 8),
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, safePadding]}>
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <Image source={chainBellLogo} style={styles.brandMark} accessibilityLabel="ChainBell logo" />
          <Text style={styles.brandName}>ChainBell</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>Know the moment a wallet moves.</Text>
          <Text style={styles.description}>
            Follow any address and get instant alerts for transfers, swaps and mints.
          </Text>

          <View style={styles.preview} accessibilityLabel="Example wallet alerts">
            <AlertPreviewRow
              tint={authColors.brand}
              title="Main received 1.25 ETH"
              detail="0x1bc…d1eb  ·  Ethereum"
              time="now"
            />
            <View style={styles.previewDivider} />
            <AlertPreviewRow
              tint={authColors.primary}
              title="Multi 1 swapped 400 USDC"
              detail="0x456…17eb  ·  Base"
              time="2m"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <AuthPrimaryButton
            label="Continue with email"
            loadingLabel="Continue with email"
            loading={false}
            disabled={false}
            onPress={onContinue}
          />
          <Text style={styles.footerNote}>Sign in or create an account next</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function AlertPreviewRow({
  tint,
  title,
  detail,
  time,
}: {
  tint: string;
  title: string;
  detail: string;
  time: string;
}) {
  return (
    <View style={styles.previewRow}>
      <View style={[styles.previewAvatar, {borderColor: tint}]}>
        <Text style={[styles.previewAvatarText, {color: tint}]}>M</Text>
      </View>
      <View style={styles.previewDetails}>
        <Text style={styles.previewTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.previewMeta} numberOfLines={1}>{detail}</Text>
      </View>
      <Text style={styles.previewTime}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: authColors.background,
    paddingHorizontal: 20,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  brandMark: {width: 40, height: 40, borderRadius: 10},
  brandName: {color: authColors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.2},
  hero: {flexGrow: 1, justifyContent: 'center', paddingVertical: 48},
  title: {
    color: authColors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
    maxWidth: 360,
  },
  description: {
    color: authColors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
    maxWidth: 360,
  },
  preview: {
    marginTop: 30,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: authColors.surface,
    borderColor: '#202A3B',
    borderWidth: 1,
    borderRadius: 14,
  },
  previewRow: {minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10},
  previewAvatar: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: '#1D2440',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarText: {fontSize: 14, fontWeight: '800'},
  previewDetails: {flex: 1, minWidth: 0},
  previewTitle: {color: authColors.text, fontSize: 13.5, fontWeight: '700'},
  previewMeta: {color: authColors.textTertiary, fontSize: 11, marginTop: 4},
  previewTime: {color: authColors.textTertiary, fontSize: 11, alignSelf: 'flex-start', marginTop: 15},
  previewDivider: {height: 1, backgroundColor: '#1F2939', marginLeft: 46},
  footer: {paddingTop: 8},
  footerNote: {color: authColors.textTertiary, fontSize: 12.5, textAlign: 'center', marginTop: 16},
});
