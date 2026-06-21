import React, {useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useAuth} from '../auth/AuthContext';
import {AppNavigator} from './AppNavigator';
import {LoginScreen} from '../screens/LoginScreen';
import {RegisterScreen} from '../screens/RegisterScreen';
import {colors} from '../theme/colors';

type AuthRoute = 'login' | 'register';

export function RootNavigator() {
  const {user, isInitializing} = useAuth();
  const [authRoute, setAuthRoute] = useState<AuthRoute>('login');

  if (isInitializing) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) {
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
    backgroundColor: colors.background,
  },
});
