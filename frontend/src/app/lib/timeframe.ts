import type { TimeFrameKey } from "../../../../models/history.d.ts";
import { TimeFrameRange, timeFrameRanges } from "../../../../lib/timeframe";

export * from "../../../../lib/timeframe";

export const timeFrameLabels: Record<TimeFrameKey, string> = {
  "1min": "1 Min",
  "1h": "1 Hour",
  "1d": "1 Day",
  "1w": "1 Week",
  "1mo": "1 Month",
};

// constraint since timeframe = time window doesn't hold data
const minBarsPerWindow: number = 2;

export function isTimeFrameAllowed(timeframe: TimeFrameKey, span: number): boolean {
  const range: TimeFrameRange = timeFrameRanges[timeframe];
  return span >= range.min * minBarsPerWindow && span <= range.max;
}

export type WindowKey = "1W" | "1M" | "3M" | "1Y" | "ALL";

export const windowKeys: WindowKey[] = ["1W", "1M", "3M", "1Y", "ALL"];

export function windowStart(window: WindowKey, end: Date): Date {
  const start: Date = new Date(end);
  switch (window) {
    case "1W":
      start.setDate(start.getDate() - 7);
      break;
    case "1M":
      start.setMonth(start.getMonth() - 1);
      break;
    case "3M":
      start.setMonth(start.getMonth() - 3);
      break;
    case "1Y":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "ALL":
      return new Date(0);
  }
  return start;
}

export function windowSpan(window: WindowKey, end: Date): number {
  return end.getTime() - windowStart(window, end).getTime();
}
