import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../auth/AuthContext';
import {AppNavigator} from './AppNavigator';
import {LoginScreen} from '../screens/LoginScreen';
import {RegisterScreen} from '../screens/RegisterScreen';
import {WelcomeScreen} from '../screens/WelcomeScreen';
import {authColors} from '../theme/auth';

type AuthRoute = 'login' | 'register';
const WELCOME_SEEN_KEY = 'chainbell_welcome_seen';

export function RootNavigator() {
  const {user, isInitializing} = useAuth();
  const [authRoute, setAuthRoute] = useState<AuthRoute>('login');
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);

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

    return <LoginScreen onShowRegister={() => setAuthRoute('register')} />;
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
