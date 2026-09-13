import { registerLocaleData } from "@angular/common";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import localeDe from "@angular/common/locales/de";
import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideNativeDateAdapter } from "@angular/material/core";
import { provideRouter } from "@angular/router";
import { provideNativeDateTimeAdapter } from "@dhutaryan/ngx-mat-timepicker";

import { routes } from "./app.routes";
import { withApiCredentials } from "./services/api";

// German number, currency and date formatting for the built-in pipes
registerLocaleData(localeDe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([withApiCredentials])),
    // Date objects for the Material date and time pickers, formatted via LOCALE_ID
    provideNativeDateAdapter(),
    // Date objects for the clock-dial time picker (ngx-mat-timepicker)
    provideNativeDateTimeAdapter(),
    { provide: LOCALE_ID, useValue: "de" },
    { provide: DEFAULT_CURRENCY_CODE, useValue: "USD" },
  ],
};
