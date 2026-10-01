/* global jest */
jest.mock('@invertase/react-native-apple-authentication', () => {
  const React = require('react');
  const AppleButton = props => React.createElement('MockAppleButton', props);
  AppleButton.Type = {CONTINUE: 'Continue'};
  AppleButton.Style = {WHITE: 'White'};
  return {AppleButton, appleAuth: {isSupported: true}};
});
