import path from "node:path";
import { fileURLToPath } from "node:url";

import { Alpaca, Bar, trading, values } from "@alpacahq/alpaca-trade-api";
import dotenv from "dotenv";

export type AlpacaAsset = trading.Assets;

const dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dirname, "..", "..", "..", ".env") });

const keyId: string | undefined = process.env.API_KEY;
const secret: string | undefined = process.env.API_KEY_SECRET;

export class GateWayError extends Error {}

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

export async function fetchAssetHistory(ticker: string, start: Date, end: Date): Promise<Bar[]> {
  try {
    return await alpaca.data.getStockBarsFor(ticker, {
      timeframe: values.TimeFrame.Day,
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
