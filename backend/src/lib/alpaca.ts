import path from "node:path";
import { fileURLToPath } from "node:url";

import { Alpaca, trading } from "@alpacahq/alpaca-trade-api";
import dotenv from "dotenv";

export type AlpacaAsset = trading.Assets;

const dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dirname, "..", "..", "..", ".env") });

export async function fetchAssets(): Promise<AlpacaAsset[]> {
  const keyId = process.env.API_KEY;
  const secret = process.env.API_KEY_SECRET;
  if (!keyId || !secret) {
    throw new Error("API_KEY and API_KEY_SECRET are not set");
  }

  const alpaca = new Alpaca({ keyId, secret, paper: true });

  try {
    return await alpaca.trading.assets.getV2Assets({
      status: "active",
      assetClass: "us_equity",
    });
  } catch (error) {
    throw new Error("Asset search failed for assets", {
      cause: error,
    });
  }
}
