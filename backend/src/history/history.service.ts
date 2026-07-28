import { AssetHistory, fetchAssetHistory } from "../lib/alpaca.js";
import { prisma } from "../lib/prisma.js";
import { Bar, values } from "@alpacahq/alpaca-trade-api";

export class TickerNotFoundError extends Error {
  constructor(ticker: string) {
    super(`Asset with ticker ${ticker} does not exist`);
  }
}

export class ResponseSizeError extends Error {
  constructor(start: Date, end: Date, timeframe: TimeFrameKey) {
    super(
      `For timeframe: ${timeframe} the range: ${start.toISOString()} to ${end.toISOString()} is too large`,
    );
  }
}

export class RangeTooSmallError extends Error {
  constructor(start: Date, end: Date, timeframe: TimeFrameKey) {
    super(
      `For timeframe: ${timeframe} the range: ${start.toISOString()} to ${end.toISOString()} is too small, it must span at least one ${timeframe} interval`,
    );
  }
}

export type TimeFrameKey = "1min" | "1h" | "1d" | "1w" | "1mo";

export const timeFrames: Record<TimeFrameKey, values.TimeFrameString> = {
  "1min": values.TimeFrame.Minute,
  "1h": values.TimeFrame.Hour,
  "1d": values.TimeFrame.Day,
  "1w": values.TimeFrame.Week,
  "1mo": values.TimeFrame.Month,
};

const msPerMinute: number = 60 * 1000;
const msPerHour: number = 60 * msPerMinute;
const msPerDay: number = 24 * msPerHour;

const rangeLimits: Record<TimeFrameKey, { min: number; max: number }> = {
  "1min": { min: msPerMinute, max: 7 * msPerDay },
  "1h": { min: msPerHour, max: 30 * msPerDay },
  "1d": { min: msPerDay, max: 3 * 365 * msPerDay },
  "1w": { min: 7 * msPerDay, max: Infinity },
  "1mo": { min: 28 * msPerDay, max: Infinity },
};

export async function getHistory(
  ticker: string,
  timeframe: TimeFrameKey,
  start: Date,
  end: Date,
): Promise<AssetHistory[]> {
  const asset = await prisma.asset.findUnique({ where: { ticker } });
  if (!asset) {
    throw new TickerNotFoundError(ticker);
  }

  const range: number = end.getTime() - start.getTime();
  const { min, max } = rangeLimits[timeframe];

  if (range < min) {
    throw new RangeTooSmallError(start, end, timeframe);
  }

  if (range > max) {
    throw new ResponseSizeError(start, end, timeframe);
  }

  const bars: Bar[] = await fetchAssetHistory(asset.ticker, timeFrames[timeframe], start, end);
  return bars.map((bar: Bar) => ({
    ticker: asset.ticker,
    time: bar.timestamp,
    high: bar.high,
    low: bar.low,
    open: bar.open,
    close: bar.close,
    volume: bar.volume,
  }));
}
