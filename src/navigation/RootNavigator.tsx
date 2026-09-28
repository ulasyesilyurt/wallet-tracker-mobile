import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../auth/AuthContext';
import {AppNavigator} from './AppNavigator';
import {LoginScreen} from '../screens/LoginScreen';
import {RegisterScreen} from '../screens/RegisterScreen';
import {WelcomeScreen} from '../screens/WelcomeScreen';
import {ForgotPasswordScreen} from '../screens/ForgotPasswordScreen';
import {VerificationCodeScreen} from '../screens/VerificationCodeScreen';
import {NewPasswordScreen} from '../screens/NewPasswordScreen';
import {authColors} from '../theme/auth';

type AuthRoute = 'login' | 'register' | 'forgot' | 'resetCode' | 'newPassword';
const WELCOME_SEEN_KEY = 'chainbell_welcome_seen';

export function RootNavigator() {
  const {user, isInitializing, pendingEmailVerificationUserId, skipEmailVerification} = useAuth();
  const [authRoute, setAuthRoute] = useState<AuthRoute>('login');
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetCodeError, setResetCodeError] = useState<string | null>(null);
  const [resetResendUntil, setResetResendUntil] = useState<number | null>(null);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (user) {
      setHasSeenWelcome(true);
      AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true').catch(() => {});
      return;
    }

    let active = true;

    AsyncStorage.getItem(WELCOME_SEEN_KEY)
      .then(value => {
        if (active) {
          setHasSeenWelcome(value === 'true');
        }
      })
      .catch(() => {
        if (active) {
          setHasSeenWelcome(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isInitializing, user]);

  function continueFromWelcome() {
    setHasSeenWelcome(true);
    AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true').catch(() => {});
  }

  if (isInitializing || (!user && hasSeenWelcome === null)) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={authColors.focus} />
      </View>
    );
  }

  if (!user) {
    if (!hasSeenWelcome) {
      return <WelcomeScreen onContinue={continueFromWelcome} />;
    }

    if (authRoute === 'register') {
      return <RegisterScreen onShowLogin={() => setAuthRoute('login')} />;
    }

    if (authRoute === 'forgot') {
      return <ForgotPasswordScreen
        initialEmail={authEmail}
        focusEmail
        onBack={email => { setAuthEmail(email); setAuthRoute('login'); }}
        onCodeSent={email => {
          setAuthEmail(email);
          setResetCodeError(null);
          setResetResendUntil(Date.now() + 60_000);
          setAuthRoute('resetCode');
        }}
      />;
    }

    if (authRoute === 'resetCode') {
      return <VerificationCodeScreen
        mode="reset"
        email={authEmail}
        initialError={resetCodeError}
        initialCooldownEndsAt={resetResendUntil}
        onCodeRequested={setResetResendUntil}
        onBack={() => setAuthRoute('forgot')}
        onCodeEntered={code => { setResetCode(code); setResetCodeError(null); setAuthRoute('newPassword'); }}
      />;
    }

    if (authRoute === 'newPassword') {
      return <NewPasswordScreen
        email={authEmail}
        code={resetCode}
        onBack={() => setAuthRoute('resetCode')}
        onInvalidCode={() => {
          setResetCode('');
          setResetCodeError('Invalid or expired code. Request a new one.');
          setAuthRoute('resetCode');
        }}
        onResetSuccess={() => {
          setResetCode('');
          setResetCodeError(null);
          setResetResendUntil(null);
          setAuthRoute('login');
        }}
      />;
    }

    return <LoginScreen
      initialEmail={authEmail}
      onShowRegister={() => setAuthRoute('register')}
      onForgotPassword={email => { setAuthEmail(email); setAuthRoute('forgot'); }}
    />;
  }

  if (pendingEmailVerificationUserId === user.id) {
    return <VerificationCodeScreen
      mode="email"
      email={user.email}
      onBack={skipEmailVerification}
      onVerified={skipEmailVerification}
    />;
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.background,
  },
});
