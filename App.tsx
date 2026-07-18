import React, {useEffect} from 'react';
import {PermissionsAndroid, Platform, SafeAreaView, StatusBar, StyleSheet} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './src/auth/AuthContext';
import {RootNavigator} from './src/navigation/RootNavigator';
import {PushRegistrationManager} from './src/notifications/PushRegistrationManager';
import {colors} from './src/theme/colors';

async function requestAndroidNotificationPermission() {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return;
  }

  try {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

    console.log('[notifications] POST_NOTIFICATIONS permission result', {result});
  } catch (error) {
    console.log('[notifications] POST_NOTIFICATIONS permission request failed', error);
  }
}

export default function App() {
  useEffect(() => {
    messaging()
      .registerDeviceForRemoteMessages()
      .then(() => {
        console.log('[notifications] device registered for remote messages');
      })
      .catch(error => {
        console.log('[notifications] registerDeviceForRemoteMessages failed', error);
      });

    requestAndroidNotificationPermission();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <AuthProvider>
          <PushRegistrationManager />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
