import { HttpClient } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { Observable } from "rxjs";
import type { ApiMessage } from "../../../../models/api.d.ts";
import type { AuthCredentials, SessionUser, UpdateUserData } from "../../../../models/auth.d.ts";
import { API_BASE_URL } from "./api";

// Calls the /api/auth routes. Auth models carry no dates, so no serialization is needed.
@Service()
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/auth`;

  /** GET /api/auth/me — the signed in user, 401 if not signed in */
  getSession(): Observable<SessionUser> {
    return this.http.get<SessionUser>(`${this.baseUrl}/me`);
  }

  /** PATCH /api/auth/me — updates the signed in user, 401 on invalid credentials */
  update(user: UpdateUserData): Observable<ApiMessage> {
    return this.http.patch<ApiMessage>(`${this.baseUrl}/me`, user);
  }

  /** DELETE /api/auth/me — deletes the signed in user, 401 on invalid credentials */
  delete(): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.baseUrl}/me`);
  }

  /** POST /api/auth/register — 201 on success, 409 if the name is taken */
  register(credentials: AuthCredentials): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.baseUrl}/register`, credentials);
  }

  /** POST /api/auth/session — sets the auth cookie, 401 on invalid credentials */
  login(credentials: AuthCredentials): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.baseUrl}/session`, credentials);
  }

  /** DELETE /api/auth/session — clears the auth cookie */
  logout(): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.baseUrl}/session`);
  }
}
