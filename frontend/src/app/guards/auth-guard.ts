import { HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { AuthApi } from "../services/auth-api";

/**
 * Lets the navigation through when the backend knows the session,
 * otherwise redirects to /auth.
 * Runs on every navigation, so a page is never shown while signed out.
 */
export const authGuard: CanActivateFn = async () => {
  const authApi: AuthApi = inject(AuthApi);
  const router: Router = inject(Router);

  try {
    await firstValueFrom(authApi.getSession());
    return true;
  } catch (error) {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      router.navigate(["/auth"]);
      return false;
    }
    throw error;
  }
};
