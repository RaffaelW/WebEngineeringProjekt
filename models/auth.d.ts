/**
 * POST /api/auth/register, POST /api/auth/session
 */

export interface AuthCredentials {
  name: string;
  password: string;
}

/**
 * PATCH /api/auth/me
 */
export interface UpdateUserData {
  name?: string;
  password?: string;
}

/**
 * The signed in user, as returned by GET /api/auth/me.
 */
export interface SessionUser {
  id: number;
  name: string;
}
