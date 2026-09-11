/**
 * POST /api/auth/register, POST /api/auth/session, GET /api/auth/session
 */

export interface AuthCredentials {
  name: string;
  password: string;
}

/**
 * The signed in user, as returned by GET /api/auth/session.
 */
export interface SessionUser {
  id: number;
  name: string;
}
