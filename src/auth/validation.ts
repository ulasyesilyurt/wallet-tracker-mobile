export type AuthFieldErrors = {
  email?: string;
  password?: string;
  name?: string;
};

// Match the current backend contract: trimmed email, login password nonempty,
// registration password >= 8 characters, and optional name <= 120 characters.
function emailError(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'Enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
  return undefined;
}

export function validateLogin(email: string, password: string): AuthFieldErrors {
  return {
    email: emailError(email),
    password: password ? undefined : 'Enter your password.',
  };
}

export function validateRegistration(
  email: string,
  password: string,
  name: string,
): AuthFieldErrors {
  return {
    email: emailError(email),
    password: password.length >= 8 ? undefined : 'Use at least 8 characters.',
    name: name.trim().length > 120 ? 'Name must be 120 characters or less.' : undefined,
  };
}

export function hasAuthFieldErrors(errors: AuthFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
