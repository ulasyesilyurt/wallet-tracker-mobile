import React, {useEffect, useImperativeHandle, useRef, useState} from 'react';
import {ActivityIndicator, Image, Keyboard, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {useAuth} from '../auth/AuthContext';
import {socialAuthError, type SocialAuthNotice, type SocialProvider} from '../auth/authErrors';
import {ProviderAuthError} from '../auth/providerAuth';
import {AuthNotice} from './AuthUI';

const googleLogo = require('../assets/google-g-logo.png');

export type SocialAuthButtonsHandle = {clearNotice: () => void};

type Props = {
  disabled?: boolean;
  onAvailabilityChange?: (available: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
  linkAction?: {label: string; onPress: () => void};
  emailRequiredAction?: {label: string; onPress: () => void};
  testID: string;
};

export const SocialAuthButtons = React.forwardRef<SocialAuthButtonsHandle, Props>(function SocialAuthButtons({
  disabled = false, onAvailabilityChange, onBusyChange, linkAction, emailRequiredAction, testID,
}, ref) {
  const {signInWithApple, signInWithGoogle} = useAuth();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [notice, setNotice] = useState<(SocialAuthNotice & {provider: SocialProvider}) | null>(null);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const busyRef = useRef(false);
  const blocked = disabled || busy !== null;

  useImperativeHandle(ref, () => ({clearNotice: () => setNotice(null)}), []);

  let AppleButton: typeof import('@invertase/react-native-apple-authentication').AppleButton | null = null;
  if (Platform.OS === 'ios') {
    const appleSdk = require('@invertase/react-native-apple-authentication') as
      typeof import('@invertase/react-native-apple-authentication');
    if (appleSdk.appleAuth.isSupported) AppleButton = appleSdk.AppleButton;
  }
  const showGoogle = (Platform.OS === 'ios' || Platform.OS === 'android') && !googleUnavailable;
  const hasProviders = AppleButton !== null || showGoogle;

  useEffect(() => { onAvailabilityChange?.(hasProviders); }, [hasProviders, onAvailabilityChange]);

  async function signIn(provider: SocialProvider) {
    if (disabled || busyRef.current || (provider === 'google' && !showGoogle) ||
      (provider === 'apple' && !AppleButton)) return;
    busyRef.current = true;
    setBusy(provider);
    setNotice(null);
    onBusyChange?.(true);
    Keyboard.dismiss();
    let succeeded = false;
    try {
      const result = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
      succeeded = result.status === 'success';
    } catch (error) {
      setNotice({...socialAuthError(error, provider), provider});
      if (provider === 'google' && error instanceof ProviderAuthError &&
        error.code === 'PLAY_SERVICES_NOT_AVAILABLE') setGoogleUnavailable(true);
    } finally {
      if (!succeeded) {
        busyRef.current = false;
        setBusy(null);
        onBusyChange?.(false);
      }
    }
  }

  const noticeAction = notice?.kind === 'linkRequired' ? linkAction :
    notice?.kind === 'emailRequired' ? emailRequiredAction :
      notice?.kind === 'retry' ? {label: 'Try again', onPress: () => { signIn(notice.provider); }} : undefined;

  if (!hasProviders && !notice) return null;

  return (
    <View testID={testID} style={styles.group}>
      {notice ? (
        <AuthNotice
          tone={notice.tone}
          testID={`${testID}.notice`}
          message={notice.kind === 'linkRequired' && linkAction?.label === 'Use password'
            ? `${notice.message} Enter your email and password below.` : notice.message}
          action={noticeAction ? {...noticeAction, testID: `${testID}.action`} : undefined}
        />
      ) : null}
      {AppleButton ? (
        <View style={[styles.appleContainer, blocked && styles.disabled]} pointerEvents={blocked ? 'none' : 'auto'}>
          <AppleButton
            buttonType={AppleButton.Type.CONTINUE}
            buttonStyle={AppleButton.Style.WHITE}
            cornerRadius={12}
            style={styles.appleButton}
            testID={`${testID}.apple`}
            {...{
              accessibilityRole: 'button',
              accessibilityLabel: 'Continue with Apple',
              accessibilityState: {disabled: blocked, busy: busy === 'apple'},
            }}
            onPress={() => { signIn('apple'); }}
          />
          {busy === 'apple' ? <ActivityIndicator style={styles.appleSpinner} color="#1F1F1F" /> : null}
        </View>
      ) : null}
      {showGoogle ? (
        <Pressable
          testID={`${testID}.google`}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          accessibilityState={{disabled: blocked, busy: busy === 'google'}}
          disabled={blocked}
          onPress={() => { signIn('google'); }}
          style={({pressed}) => [styles.googleButton, pressed && !blocked && styles.googlePressed, blocked && styles.disabled]}>
          <View style={styles.googleLogoTile} accessible={false}>
            <Image source={googleLogo} style={styles.googleLogo} accessible={false} />
          </View>
          <Text style={styles.googleText}>Continue with Google</Text>
          {busy === 'google' ? <ActivityIndicator size="small" color="#1F1F1F" /> : null}
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  group: {gap: 10},
  appleContainer: {position: 'relative', minHeight: 48},
  appleButton: {width: '100%', height: 48},
  appleSpinner: {position: 'absolute', right: 16, top: 14},
  googleButton: {
    width: '100%', minHeight: 48, borderRadius: 12, backgroundColor: '#FFFFFF',
    borderColor: '#747775', borderWidth: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  googlePressed: {backgroundColor: '#F2F2F2'},
  googleLogoTile: {width: 28, height: 28, borderRadius: 4, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center'},
  googleLogo: {width: 18, height: 18, resizeMode: 'contain'},
  googleText: {color: '#1F1F1F', fontSize: 14, fontWeight: '600'},
  disabled: {opacity: 0.4},
});
