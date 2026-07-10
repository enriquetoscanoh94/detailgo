/**
 * User roles. A user's role lives in their Firestore `users/{uid}` document and
 * decides which navigation stack the app renders after login.
 */

export const ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
  WORKER: 'worker',
};

export const isValidRole = (role) => Object.values(ROLES).includes(role);

/** Route group each role is sent to once authenticated. */
export const ROLE_HOME_ROUTE = {
  [ROLES.ADMIN]: '/(admin)/dashboard',
  [ROLES.CLIENT]: '/(client)/home',
  [ROLES.WORKER]: '/(worker)/available',
};

export default ROLES;
