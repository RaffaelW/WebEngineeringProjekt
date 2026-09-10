import { IsoDate, IsoDateTime } from "./api";

export type TimeFrame = "1min" | "1h" | "1d" | "1w" | "1mo";

export interface HistoryQuery {
  ticker: string;
  start: IsoDate;
  end: IsoDate;
  timeframe: TimeFrame;
}

export interface AssetHistory {
  ticker: string;
  time: IsoDateTime;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
}
