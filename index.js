/**
 * @format
 */

import messaging from '@react-native-firebase/messaging';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[notifications] background message received', {
    messageId: remoteMessage.messageId,
    data: remoteMessage.data,
    notification: remoteMessage.notification,
  });
});

AppRegistry.registerComponent(appName, () => App);
