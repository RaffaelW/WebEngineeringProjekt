/**
 * GET /api/leaderboard
 */

import type { SessionUser } from "./auth.js";

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

/**
 * Sorted by performance, best first.
 */
export type Leaderboard = LeaderboardEntry[];
