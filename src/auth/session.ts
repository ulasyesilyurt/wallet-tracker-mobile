import type {AuthUser} from '../types/auth';

let currentAccessToken: string | null = null;
let currentUser: AuthUser | null = null;

export function setSessionAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getSessionAccessToken() {
  return currentAccessToken;
}

export function setSessionUser(user: AuthUser | null) {
  currentUser = user;
}

export function getSessionUser() {
  return currentUser;
}
