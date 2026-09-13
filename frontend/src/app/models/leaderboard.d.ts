import type { Leaderboard, LeaderboardQuery } from "../../../../models/leaderboard.d.ts";
import type { IsoDate, IsoDateTime } from "./api.d.ts";

export interface RawLeaderboardQuery extends Omit<LeaderboardQuery, "start" | "end"> {
  start?: IsoDate;
  end?: IsoDate;
}

export interface RawLeaderboard extends Omit<Leaderboard, "start" | "end"> {
  start: IsoDateTime;
  end: IsoDateTime;
}
