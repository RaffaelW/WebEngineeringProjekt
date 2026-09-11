import type { LeaderboardQuery } from "../../../../models/leaderboard.d.ts";
import type { IsoDate } from "./api.d.ts";

export interface RawLeaderboardQuery extends Omit<LeaderboardQuery, "start" | "end"> {
  start?: IsoDate;
  end?: IsoDate;
}
