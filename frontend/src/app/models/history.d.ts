import type { TimeFrameKey } from "../../../../models/history.d.ts";
import type { IsoDate, IsoDateTime } from "./api.d.ts";

export interface RawHistoryQuery {
  ticker: string;
  start: IsoDate;
  end: IsoDate;
  timeframe: TimeFrameKey;
}

export interface RawAssetHistory {
  ticker: string;
  time: IsoDateTime;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
}
