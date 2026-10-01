import {colors} from './colors';

// Auth-specific accents and surfaces share the app's base background.
export const authColors = {
  background: colors.background,
  surface: '#0D1220',
  text: '#F2F5FA',
  textSecondary: '#B4BCCB',
  textTertiary: '#7F8AA0',
  textDisabled: '#5E6980',
  placeholder: '#6B768C',
  line: '#263149',
  lineHairline: 'rgba(180,195,255,0.14)',
  lineOutline: 'rgba(180,195,255,0.18)',
  primary: '#3563EB',
  primaryPressed: '#2B55D6',
  focus: '#3FD0E6',
  link: '#56D4E8',
  brand: '#9A8CFF',
  error: '#FF5C66',
  errorText: '#FF8A92',
  errorNoticeText: '#FFC2C6',
  warning: '#F2A93B',
  warningText: '#F8D8A6',
  success: '#34C98E',
  disabledFill: 'rgba(255,255,255,0.07)',
} as const;
