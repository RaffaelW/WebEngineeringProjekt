import { registerLocaleData } from "@angular/common";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import localeDe from "@angular/common/locales/de";
import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideRouter } from "@angular/router";

import { routes } from "./app.routes";
import { withApiCredentials } from "./services/api";

// German number, currency and date formatting for the built-in pipes
registerLocaleData(localeDe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([withApiCredentials])),
    { provide: LOCALE_ID, useValue: "de" },
    { provide: DEFAULT_CURRENCY_CODE, useValue: "EUR" },
  ],
};
