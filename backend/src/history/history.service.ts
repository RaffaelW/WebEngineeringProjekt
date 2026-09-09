import { Asset, History } from "@prisma/client";
import {
  AssetHistory,
  TickerNotFoundError,
  clampToAvailable,
  fetchAssetHistory,
} from "../lib/alpaca.js";
import { prisma } from "../lib/prisma.js";
import { TimeFrameKey, TimeFrameSpec, timeFrames } from "../lib/timeframe.js";
import { Bar } from "@alpacahq/alpaca-trade-api";
import { cacheBars, checkCoverage } from "../lib/database.js";

export class RangeError extends Error {
  constructor(start: Date, end: Date, timeframe: TimeFrameKey, violation: "small" | "large") {
    super(
      `For timeframe: ${timeframe} the range: ${start.toISOString()} to ${end.toISOString()} is too ${violation}`,
    );
  }
}

/**
 * Validates that the range between start and end is within the limits of the timeframe.
 * Throws a RangeError if the range is too small or too large.
 */
function validateTimeFrameByTimeSpan(timeframe: TimeFrameKey, start: Date, end: Date): void {
  const range: number = end.getTime() - start.getTime();
  const spec: TimeFrameSpec = timeFrames[timeframe];

  if (range < spec.min) {
    throw new RangeError(start, end, timeframe, "small");
  }

  if (range > spec.max) {
    throw new RangeError(start, end, timeframe, "large");
  }
}

/**
 * Converts a Bar to an AssetHistory object, adding the ticker.
 */
function barToAssetHistory(bar: Bar, ticker: string): AssetHistory {
  return {
    ticker,
    time: bar.timestamp,
    high: bar.high,
    low: bar.low,
    open: bar.open,
    close: bar.close,
    volume: bar.volume,
  };
}

/**
 * Converts a History to an AssetHistory object, adding the ticker.
 */
function historyToAssetHistory(entry: History, ticker: string): AssetHistory {
  return {
    ticker,
    time: entry.time,
    high: entry.high,
    low: entry.low,
    open: entry.open,
    close: entry.close,
    volume: entry.volume,
  };
}

export async function getHistory(
  ticker: string,
  timeframe: TimeFrameKey,
  start: Date,
  end: Date,
): Promise<AssetHistory[]> {
  const asset: Asset | null = await prisma.asset.findUnique({ where: { ticker } });
  if (!asset) {
    throw new TickerNotFoundError(ticker);
  }

  validateTimeFrameByTimeSpan(timeframe, start, end);

  const spec: TimeFrameSpec = timeFrames[timeframe];

  /**
   * A bar is only final once its whole period has finished, so the bar the current period is
   * still building must never be cached, and everything before it can be.
   *
   * The boundary has to come from the fixed period grid rather like the full hours
   */
  const forming: number = Math.floor(clampToAvailable(new Date()).getTime() / spec.min) * spec.min;

  const cacheEnd: Date = new Date(Math.min(end.getTime(), forming - 1));

  const history: AssetHistory[] = [];

  if (cacheEnd >= start) {
    const covered: boolean = await checkCoverage(asset.id, spec.prisma, start, cacheEnd);

    if (covered) {
      const rows: History[] = await prisma.history.findMany({
        where: { assetId: asset.id, timeframe: spec.prisma, time: { gte: start, lte: cacheEnd } },
        orderBy: { time: "asc" },
      });
      history.push(...rows.map((row: History) => historyToAssetHistory(row, asset.ticker)));
    } else {
      const bars: Bar[] = await fetchAssetHistory(asset.ticker, spec.alpaca, start, cacheEnd);
      await cacheBars(asset.id, spec.prisma, bars, start, cacheEnd);
      history.push(...bars.map((bar: Bar) => barToAssetHistory(bar, asset.ticker)));
    }
  }

  // the bar which is still forming, fetched every time and never cached, it is not final yet.
  // a window ending before it never gets here, cacheEnd already covers all of it.
  // fetchAssetHistory drops the part of the window it is not allowed to ask for
  if (end.getTime() >= forming) {
    const bars: Bar[] = await fetchAssetHistory(asset.ticker, spec.alpaca, new Date(forming), end);
    history.push(...bars.map((bar: Bar) => barToAssetHistory(bar, asset.ticker)));
  }

  return history;
}
