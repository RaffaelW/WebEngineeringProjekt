/**
 * GET /api/leaderboard
 */

import type { SessionUser } from "./auth.d.ts";

export interface LeaderboardQuery {
  start?: Date;
  end?: Date;
}

export interface LeaderboardEntry {
  user: SessionUser;
  total_costs: number;
  total_gains: number;
  performance: number;
}

export interface Leaderboard {
  start: Date;
  end: Date;
  entries: LeaderboardEntry[];
}
