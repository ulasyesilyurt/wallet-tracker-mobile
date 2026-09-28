export type VerificationMode = 'register' | 'signin' | 'restored' | 'reset';

export type VerificationModeCopy = {
  title: string;
  subtitle: string;
  emailActionLabel: string;
  allowsInitialCodeRequest: boolean;
  showsSignOut: boolean;
  showsBack: boolean;
};

// Presentation only. AuthContext and VerificationCodeScreen retain the request handoff.
export const verificationModes: Record<VerificationMode, VerificationModeCopy> = {
  register: {
    title: 'Check your email',
    subtitle: 'Enter the 6-digit code we sent to',
    emailActionLabel: 'Wrong email?',
    allowsInitialCodeRequest: true,
    showsSignOut: true,
    showsBack: false,
  },
  signin: {
    title: 'Verify your email',
    subtitle: 'Your account isn’t verified yet. We just sent a code to',
    emailActionLabel: 'Not you?',
    allowsInitialCodeRequest: true,
    showsSignOut: true,
    showsBack: false,
  },
  restored: {
    title: 'Finish verifying your email',
    subtitle: 'Enter the latest code we sent to',
    emailActionLabel: 'Not you?',
    allowsInitialCodeRequest: false,
    showsSignOut: true,
    showsBack: false,
  },
  reset: {
    title: 'Check your email',
    subtitle: 'If an account exists for this email, a code is on its way.',
    emailActionLabel: 'Change',
    allowsInitialCodeRequest: false,
    showsSignOut: false,
    showsBack: true,
  },
};
