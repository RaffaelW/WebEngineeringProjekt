import { AlpacaAsset, fetchAssets } from "../lib/alpaca.js";
import { prisma } from "../lib/prisma.js";
import type { AutocompleteAsset } from "../../../models/asset.d.ts";

export async function getAutoCompleteData(name: string): Promise<AutocompleteAsset[]> {
  return await prisma.asset.findMany({
    where: { name: { contains: name, mode: "insensitive" } },
    select: { name: true, ticker: true, exchange: true },
    take: 10,
  });
}

export async function populateAssetTable(): Promise<void> {
  const existing: number = await prisma.asset.count();
  if (existing > 0) {
    return;
  }

  const assets: AlpacaAsset[] = await fetchAssets();
  const tradable: AlpacaAsset[] = assets.filter((asset) => asset.tradable);

  await prisma.asset.createMany({
    data: tradable.map((asset) => ({
      name: asset.name,
      ticker: asset.symbol,
      exchange: asset.exchange,
    })),
    skipDuplicates: true,
  });
}
