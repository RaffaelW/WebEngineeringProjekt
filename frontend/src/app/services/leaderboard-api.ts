import { HttpClient } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { map, Observable } from "rxjs";
import type { Leaderboard, LeaderboardQuery } from "../../../../models/leaderboard.d.ts";
import type { RawLeaderboard } from "../models/leaderboard.d.ts";
import { API_BASE_URL, toHttpParams } from "./api";
import { SerializeService } from "./serialize-service.js";

// Calls the /api/leaderboard routes
@Service()
export class LeaderboardApi {
  private readonly http = inject(HttpClient);
  private readonly serializer = inject(SerializeService);
  private readonly baseUrl = `${API_BASE_URL}/leaderboard`;

  /**
   * GET /api/leaderboard — every user sorted by performance, optionally limited to a range,
   * together with the trading days the range was clamped to
   */
  getLeaderboard(query: LeaderboardQuery = {}): Observable<Leaderboard> {
    return this.http
      .get<RawLeaderboard>(this.baseUrl, {
        params: toHttpParams(this.serializer.toRawLeaderboardQuery(query)),
      })
      .pipe(map((raw: RawLeaderboard) => this.serializer.toLeaderboard(raw)));
  }
}
