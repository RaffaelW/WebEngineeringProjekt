import type { AssetHistory, HistoryQuery } from "../../../../models/history.d.ts";
import type { IsoDate, IsoDateTime } from "./api.d.ts";

export interface RawHistoryQuery extends Omit<HistoryQuery, "start" | "end"> {
  start?: IsoDate;
  end?: IsoDate;
}

export interface RawAssetHistory extends Omit<AssetHistory, "time"> {
  time: IsoDateTime;
}
