import { History } from "@prisma/client";
import { AssetHistory, TickerNotFoundError, fetchAssetHistory } from "../lib/alpaca.js";
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
  const asset = await prisma.asset.findUnique({ where: { ticker } });
  if (!asset) {
    throw new TickerNotFoundError(ticker);
  }

  validateTimeFrameByTimeSpan(timeframe, start, end);

  const spec: TimeFrameSpec = timeFrames[timeframe];

  const covered: boolean = await checkCoverage(asset.id, spec.prisma, start, end);

  if (!covered) {
    const bars: Bar[] = await fetchAssetHistory(asset.ticker, spec.alpaca, start, end);
    await cacheBars(asset.id, spec.prisma, bars);
    return bars.map((bar: Bar) => barToAssetHistory(bar, asset.ticker));
  } else {
    const history: History[] = await prisma.history.findMany({
      where: {
        assetId: asset.id,
        timeframe: spec.prisma,
        time: { gte: start, lte: end },
      },
      orderBy: { time: "asc" },
    });
    return history.map((entry: History) => historyToAssetHistory(entry, asset.ticker));
  }
}
