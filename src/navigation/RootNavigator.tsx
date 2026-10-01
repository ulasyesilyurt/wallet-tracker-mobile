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
  const {user, isInitializing, verificationEntryMode, consumeInitialVerificationCodeRequest, logout} = useAuth();
  const [authRoute, setAuthRoute] = useState<AuthRoute>('login');
  const [forceWelcome, setForceWelcome] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [focusLoginEmail, setFocusLoginEmail] = useState(false);
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

    if (forceWelcome) return;

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
  }, [forceWelcome, isInitializing, user]);

  function continueFromWelcome() {
    setForceWelcome(false);
    setHasSeenWelcome(true);
    setAuthEmail('');
    setAuthRoute('login');
    setFocusLoginEmail(false);
    AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true').catch(() => {});
  }

  function showRegisterFromWelcome() {
    continueFromWelcome();
    setRegistrationEmail('');
    setAuthRoute('register');
  }

  function exitVerification(destination: 'welcome' | 'register' | 'login') {
    setForceWelcome(destination === 'welcome');
    setAuthRoute(destination === 'register' ? 'register' : 'login');
    setAuthEmail('');
    setRegistrationEmail(destination === 'register' ? user?.email ?? '' : '');
    setFocusLoginEmail(destination === 'login');
    logout().catch(() => {});
  }

  if (isInitializing || (!user && hasSeenWelcome === null)) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={authColors.focus} />
      </View>
    );
  }

  if (!user) {
    if (forceWelcome || !hasSeenWelcome) {
      return <WelcomeScreen onContinue={continueFromWelcome} onShowRegister={showRegisterFromWelcome} />;
    }

    if (authRoute === 'register') {
      return <RegisterScreen initialEmail={registrationEmail} onShowLogin={() => {
        setRegistrationEmail('');
        setAuthEmail('');
        setFocusLoginEmail(false);
        setAuthRoute('login');
      }} />;
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
      focusEmail={focusLoginEmail}
      onShowRegister={() => {
        setRegistrationEmail('');
        setFocusLoginEmail(false);
        setAuthRoute('register');
      }}
      onForgotPassword={email => { setAuthEmail(email); setAuthRoute('forgot'); }}
    />;
  }

  if (user.emailVerified !== true) {
    return <VerificationCodeScreen
      mode={verificationEntryMode ?? 'restored'}
      email={user.email}
      shouldRequestInitialCode={() => consumeInitialVerificationCodeRequest(user.id)}
      onSignOut={() => exitVerification('welcome')}
      onChangeEmail={() => exitVerification(verificationEntryMode === 'register' ? 'register' : 'login')}
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
