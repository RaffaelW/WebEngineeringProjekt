import path from "node:path";
import { fileURLToPath } from "node:url";

import { Alpaca, Bar, trading, values } from "@alpacahq/alpaca-trade-api";
import dotenv from "dotenv";

export type AlpacaAsset = trading.Assets;

export type AssetHistory = {
  ticker: string;
  time: Date;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
};

const dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dirname, "..", "..", "..", ".env") });

const keyId: string | undefined = process.env.API_KEY;
const secret: string | undefined = process.env.API_KEY_SECRET;

export class GateWayError extends Error {}

if (!keyId || !secret) {
  throw new Error("API_KEY and API_KEY_SECRET are not set");
}

const alpaca: Alpaca = new Alpaca({ keyId, secret, paper: true });

export async function fetchTradingDays(start: Date, end: Date): Promise<Date[]> {
  try {
    const days = await alpaca.trading.calendar.legacyCalendar({ start, end });
    return days.map((day) => day.date);
  } catch (error: unknown) {
    throw new GateWayError("Market calendar lookup failed", {
      cause: error,
    });
  }
}

export async function fetchAssetHistory(
  ticker: string,
  timeframe: values.TimeFrameString,
  start: Date,
  end: Date,
): Promise<Bar[]> {
  try {
    return await alpaca.data.getStockBarsFor(ticker, {
      timeframe: timeframe,
      start,
      end,
      adjustment: "all",
    });
  } catch (error: unknown) {
    throw new GateWayError(`Bar search failed for asset ${ticker}`, {
      cause: error,
    });
  }
}
