import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from "@angular/core";
import { provideNativeDateAdapter } from "@angular/material/core";
import { provideRouter } from "@angular/router";

import { routes } from "./app.routes";
import { withApiCredentials } from "./services/api";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([withApiCredentials])),
    provideNativeDateAdapter(),
  ],
};
