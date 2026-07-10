/**
 * Centralized error handling.
 *
 * Firebase throws error codes like "auth/invalid-credential". We map the ones
 * users can actually act on to i18n keys, and fall back to a generic message
 * for everything else. This keeps raw error codes off the screen.
 */

const FIREBASE_ERROR_KEYS = {
  'auth/invalid-email': 'error.invalidEmail',
  'auth/user-disabled': 'error.userDisabled',
  'auth/user-not-found': 'error.invalidCredentials',
  'auth/wrong-password': 'error.invalidCredentials',
  'auth/invalid-credential': 'error.invalidCredentials',
  'auth/email-already-in-use': 'error.emailInUse',
  'auth/weak-password': 'error.weakPassword',
  'auth/too-many-requests': 'error.tooManyRequests',
  'auth/network-request-failed': 'error.network',
  'permission-denied': 'error.permissionDenied',
  unavailable: 'error.network',
};

/** Returns an i18n key for the given error (Firebase or otherwise). */
export const errorKey = (error) => {
  const code = error?.code || '';
  if (FIREBASE_ERROR_KEYS[code]) return FIREBASE_ERROR_KEYS[code];
  return 'error.generic';
};

/**
 * A domain error carrying an i18n key, thrown by the service layer so screens
 * can show a localized message without inspecting Firebase internals.
 */
export class AppError extends Error {
  constructor(key, cause) {
    super(key);
    this.name = 'AppError';
    this.key = key;
    this.cause = cause;
  }
}

/** Wrap an unknown throwable into an AppError with a friendly i18n key. */
export const toAppError = (error) =>
  error instanceof AppError ? error : new AppError(errorKey(error), error);
