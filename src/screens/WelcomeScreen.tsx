import React, {useState} from 'react';
import {Image, Platform, StyleSheet, Text, View} from 'react-native';
import {AuthFooterLink, AuthScaffold, PrimaryAuthButton, SecondaryAuthButton} from '../components/AuthUI';
import {SocialAuthButtons} from '../components/SocialAuthButtons';
import {authColors} from '../theme/auth';

type WelcomeScreenProps = {
  onContinue: () => void;
  onShowRegister: () => void;
};

const chainBellLogo = require('../assets/chainbell-logo.png');

export function WelcomeScreen({onContinue, onShowRegister}: WelcomeScreenProps) {
  const [socialBusy, setSocialBusy] = useState(false);
  const [hasProviders, setHasProviders] = useState(Platform.OS === 'ios' || Platform.OS === 'android');
  return (
    <AuthScaffold
      testID="welcome"
      topSpacing={20}
      footer={
        <View style={styles.footer}>
          <SocialAuthButtons
            testID="welcome.social"
            onBusyChange={setSocialBusy}
            onAvailabilityChange={setHasProviders}
            linkAction={{label: 'Sign in', onPress: onContinue}}
            emailRequiredAction={{label: 'Use email', onPress: onShowRegister}}
          />
          <View style={socialBusy && styles.emailDisabled}>
            {hasProviders ?
              <SecondaryAuthButton label="Continue with email" onPress={onContinue} disabled={socialBusy} testID="welcome.email" /> :
              <PrimaryAuthButton label="Continue with email" onPress={onContinue} disabled={socialBusy} testID="welcome.email" />}
          </View>
          <AuthFooterLink prompt="Already have an account?" linkLabel="Sign in" onPress={onContinue} disabled={socialBusy} />
        </View>
      }>
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

    </AuthScaffold>
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
  footer: {paddingTop: 8, gap: 10},
  emailDisabled: {opacity: 0.4},
});
