import { HttpClient } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { Observable } from "rxjs";
import type { AutocompleteAsset, AutocompleteQuery } from "../../../../models/asset";
import { API_BASE_URL, toHttpParams } from "./api";

@Service()
export class AssetApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/assets`;

  /** GET /api/assets/autocomplete — return assets whose name matches the query */
  autocomplete(query: AutocompleteQuery): Observable<AutocompleteAsset[]> {
    return this.http.get<AutocompleteAsset[]>(`${this.baseUrl}/autocomplete`, {
      params: toHttpParams(query),
    });
  }
}
