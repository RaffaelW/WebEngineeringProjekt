/**
 * GET /api/history
 */

export type TimeFrameKey = "1min" | "1h" | "1d" | "1w" | "1mo";

export interface HistoryQuery {
  ticker: string;
  start?: Date;
  end?: Date;
  timeframe: TimeFrameKey;
}

/**
 * One candle of a single asset.
 */
export interface AssetHistory {
  ticker: string;
  time: Date;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
}
