import { HttpClient } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { Observable } from "rxjs";
import type { Leaderboard, LeaderboardQuery } from "../../../../models/leaderboard.d.ts";
import { SerializeService } from "../serialize-service";
import { API_BASE_URL, toHttpParams } from "./api";

// Calls the /api/leaderboard routes
@Service()
export class LeaderboardApi {
  private readonly http = inject(HttpClient);
  private readonly serializer = inject(SerializeService);
  private readonly baseUrl = `${API_BASE_URL}/leaderboard`;

  /** GET /api/leaderboard — every user sorted by performance, optionally limited to a range */
  getLeaderboard(query: LeaderboardQuery = {}): Observable<Leaderboard> {
    return this.http.get<Leaderboard>(this.baseUrl, {
      params: toHttpParams(this.serializer.toRawLeaderboardQuery(query)),
    });
  }
}
