import { AssetHistory, fetchAssetHistory } from "../lib/alpaca.js";
import { prisma } from "../lib/prisma.js";
import { Bar, values } from "@alpacahq/alpaca-trade-api";

export class TickerNotFoundError extends Error {
  constructor(ticker: string) {
    super(`Asset with ticker ${ticker} does not exist`);
  }
}

export class ResponseSizeError extends Error {
  constructor(start: Date, end: Date, timeframe: values.TimeFrameString) {
    super(`For timeframe: ${timeframe} the range: ${start} to ${end} is too large`);
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
