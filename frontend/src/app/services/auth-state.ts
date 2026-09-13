import { inject, Service, signal, WritableSignal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { SessionUser } from "../../../../models/auth.d.ts";
import { AuthApi } from "./auth-api";

/**
 * Single source of truth for the signed in user.
 * Populated by the auth guard after a successful session check.
 */
@Service()
export class AuthState {
  private readonly authApi: AuthApi = inject(AuthApi);

  readonly user: WritableSignal<SessionUser | null> = signal<SessionUser | null>(null);

  async logout(): Promise<void> {
    await firstValueFrom(this.authApi.logout());
    this.user.set(null);
  }
}
