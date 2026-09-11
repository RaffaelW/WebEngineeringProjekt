import { HttpClient } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { map, Observable } from "rxjs";
import type { AssetHistory, HistoryQuery } from "../../../../models/history.d.ts";
import type { RawAssetHistory } from "../models/history.d.ts";
import { API_BASE_URL, toHttpParams } from "./api";
import { SerializeService } from "./serialize-service.js";

@Service()
export class HistoryApi {
  private readonly http = inject(HttpClient);
  private readonly serializer = inject(SerializeService);
  private readonly baseUrl = `${API_BASE_URL}/history`;

  /** GET /api/history — one candle per period of a single asset in the given range */
  getHistory(query: HistoryQuery): Observable<AssetHistory[]> {
    return this.http
      .get<RawAssetHistory[]>(this.baseUrl, {
        params: toHttpParams(this.serializer.toRawHistoryQuery(query)),
      })
      .pipe(
        map(
          // map command for Observable
          (bars: RawAssetHistory[]) =>
            // map elements of array
            bars.map((bar: RawAssetHistory) => this.serializer.toAssetHistory(bar)),
        ),
      );
  }
}
