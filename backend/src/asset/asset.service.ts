import type { History } from "@prisma/client";
import { fetchAssets } from "../lib/alpaca.js";
import { prisma } from "../lib/prisma.js";

export interface AutoCompleteType {
  id: number;
  name: string;
  ticker: string;
}

export async function getAutoCompleteData(name: string): Promise<AutoCompleteType[]> {
  return await prisma.asset.findMany({
    where: { name: { contains: name, mode: "insensitive" } },
    select: { id: true, name: true, ticker: true },
    take: 10,
  });
}

export async function populateAssetTable(): Promise<void> {
  const assets = await fetchAssets();

  const tradable = assets.filter((asset) => asset.tradable);

  await prisma.asset.createMany({
    data: tradable.map((asset) => ({
      name: asset.name,
      ticker: asset.symbol,
      exchange: asset.exchange,
    })),
    skipDuplicates: true,
  });
}

export async function getHistoricalBars(
  assetId: number,
  start: Date,
  end: Date,
): Promise<History[]> {
  return await prisma.history.findMany({
    where: {
      assetId,
      time: { gte: start, lte: end },
    },
    orderBy: { time: "asc" },
  });
}
