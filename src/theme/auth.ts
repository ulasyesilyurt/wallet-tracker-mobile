import {walletsColors} from './wallets';

// Auth palette from the approved ChainBell design. Other app screens retain their theme.
export const authColors = {
  background: walletsColors.background,
  surface: '#0D1220',
  text: '#F2F5FA',
  textSecondary: '#B4BCCB',
  textTertiary: '#7F8AA0',
  textDisabled: '#5E6980',
  line: '#263149',
  primary: '#3563EB',
  primaryPressed: '#2B55D6',
  focus: '#3FD0E6',
  brand: '#9A8CFF',
  error: '#FF5C66',
  disabledFill: '#1B202B',
} as const;
