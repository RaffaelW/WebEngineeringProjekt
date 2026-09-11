import path from "node:path";
import { fileURLToPath } from "node:url";

import { Alpaca, Bar, trading, values } from "@alpacahq/alpaca-trade-api";
import dotenv from "dotenv";

import { getHistory } from "../history/history.service.js";
import { endOfDay, startOfDay } from "./date.js";
import type { AssetHistory } from "../../../models/history.d.ts";

export type AlpacaAsset = trading.Assets;

export class TickerNotFoundError extends Error {
  constructor(ticker: string) {
    super(`Asset with ticker ${ticker} does not exist`);
  }
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dirname, "..", "..", "..", ".env") });

const keyId: string | undefined = process.env.API_KEY;
const secret: string | undefined = process.env.API_KEY_SECRET;

export class GateWayError extends Error {}

export class NoMarketDataError extends Error {}

if (!keyId || !secret) {
  throw new Error("API_KEY and API_KEY_SECRET are not set");
}

const alpaca: Alpaca = new Alpaca({ keyId, secret, paper: true });

export async function fetchAssets(): Promise<AlpacaAsset[]> {
  try {
    return await alpaca.trading.assets.getV2Assets({
      status: "active",
      assetClass: "us_equity",
    });
  } catch (error: unknown) {
    throw new GateWayError("Asset search failed for assets", {
      cause: error,
    });
  }
}

export async function fetchTradingDays(start: Date, end: Date): Promise<Date[]> {
  try {
    const days = await alpaca.trading.calendar.legacyCalendar({ start, end });

    // ascending, callers rely on the last entry being the most recent trading day
    return days
      .map((day: trading.LegacyCalendarDay) => day.date)
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());
  } catch (error: unknown) {
    throw new GateWayError("Market calendar lookup failed", {
      cause: error,
    });
  }
}

export type MarketClock = {
  isOpen: boolean;
  timestamp: Date;
  nextOpen: Date;
};

/**
 * Current state of the US market. The upstream clock only reports on right now,
 * it cannot answer for a past moment.
 */
export async function fetchMarketClock(): Promise<MarketClock> {
  try {
    const clock: trading.LegacyClock = await alpaca.trading.clock.legacyClock();

    return { isOpen: clock.isOpen, timestamp: clock.timestamp, nextOpen: clock.nextOpen };
  } catch (error: unknown) {
    throw new GateWayError("Market clock lookup failed", {
      cause: error,
    });
  }
}

/**
 * The free data plan rejects SIP queries covering the last 15 minutes
 */
export function clampToAvailable(end: Date): Date {
  const sipDelayMs: number = 15 * 60 * 1000;
  const cutoff: Date = new Date(Date.now() - sipDelayMs);
  return end.getTime() > cutoff.getTime() ? cutoff : end;
}

export async function fetchAssetHistory(
  ticker: string,
  timeframe: values.TimeFrameString,
  start: Date,
  end: Date,
): Promise<Bar[]> {
  const available: Date = clampToAvailable(end);
  // the whole window sits inside the restricted tail, asking would be a start > end request
  if (start.getTime() > available.getTime()) {
    return [];
  }

  try {
    const result: Bar[] = await alpaca.data.getStockBarsFor(ticker, {
      timeframe: timeframe,
      start,
      end: available,
      adjustment: "all",
    });
    return result;
  } catch (error: unknown) {
    throw new GateWayError(`Bar search failed for asset ${ticker}`, {
      cause: error,
    });
  }
}

/**
 * Returns the last bar for a given ticker at or before the given time, looking back up to an hour
 * if time is during market close the last bar of the previous session is returned
 */
export async function getApproxBarAt(ticker: string, time: Date): Promise<AssetHistory> {
  const LOOK_BACK_MS: number = 60 * 60 * 1000;
  const bars: AssetHistory[] = await getHistory(
    ticker,
    "1min",
    new Date(time.getTime() - LOOK_BACK_MS),
    time,
  );

  const last: AssetHistory | undefined = bars.at(-1);
  if (!last) {
    throw new NoMarketDataError(
      `No market data for ${ticker} in the hour before ${time.toISOString()}, the market was closed, the session had not opened yet, or the timestamp is within the last 15 minutes`,
    );
  }
  return last;
}

export async function fetchLivePrice(ticker: string): Promise<number> {
  try {
    const result: number | undefined = await alpaca.data.getLatestPrice(ticker);
    if (result === undefined) {
      throw new GateWayError(`No live price for ${ticker}`);
    }
    return result;
  } catch (error: unknown) {
    throw new GateWayError(`Live price lookup failed for asset ${ticker}`, {
      cause: error,
    });
  }
}

/**
 * Last minute bar the asset traded on the given day
 */
export async function fetchLastBarOfDay(ticker: string, day: Date): Promise<AssetHistory> {
  const bars: AssetHistory[] = await getHistory(ticker, "1min", startOfDay(day), endOfDay(day));

  const last: AssetHistory | undefined = bars.at(-1);
  if (!last) {
    throw new NoMarketDataError(`No market data for ${ticker} on ${startOfDay(day).toISOString()}`);
  }
  return last;
}

/**
 * First minute bar the asset traded on the given day
 */
export async function fetchFirstBarOfDay(ticker: string, day: Date): Promise<AssetHistory> {
  const bars: AssetHistory[] = await getHistory(ticker, "1min", startOfDay(day), endOfDay(day));

  const first: AssetHistory | undefined = bars.at(0);
  if (!first) {
    throw new NoMarketDataError(`No market data for ${ticker} on ${startOfDay(day).toISOString()}`);
  }
  return first;
}
