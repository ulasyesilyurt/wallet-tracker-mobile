import {validateLogin, validateRegistration} from '../src/auth/validation';

it('checks sign-in email shape and a nonempty password', () => {
  expect(validateLogin(' ', '')).toEqual({
    email: 'Enter your email address.',
    password: 'Enter your password.',
  });
  expect(validateLogin('invalid', 'secret').email).toBe('Enter a valid email address.');
  expect(validateLogin(' user@example.com ', 'secret')).toEqual({
    email: undefined,
    password: undefined,
  });
});

it('matches the backend registration minimum and optional name limit', () => {
  expect(validateRegistration('user@example.com', '1234567', '').password)
    .toBe('Use at least 8 characters.');
  expect(validateRegistration('user@example.com', 'abcdefgh', '')).toEqual({
    email: undefined,
    password: undefined,
    name: undefined,
  });
  expect(validateRegistration('user@example.com', '12345678', 'a'.repeat(121)).name)
    .toBe('Name must be 120 characters or less.');
});
