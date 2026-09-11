import { HttpInterceptorFn, HttpParams } from "@angular/common/http";

export const API_BASE_URL = "http://localhost:3000/api";

/**
 * Forwards every request with credentials
 */
export const withApiCredentials: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL)) {
    return next(req);
  }

  return next(req.clone({ withCredentials: true }));
};

/**
 * Builds the query string of a request, absent (undefined) and empty fields are left out
 * instead of being sent as the literal string "undefined" or as an empty parameter.
 */
export function toHttpParams(query: object): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params = params.set(key, String(value));
    }
  }

  return params;
}
