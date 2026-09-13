import { AlpacaAsset, fetchAssets } from "../lib/alpaca.js";
import { prisma } from "../lib/prisma.js";
import type { AutocompleteAsset } from "../../../models/asset.d.ts";

const AUTOCOMPLETE_SELECT = { name: true, ticker: true, exchange: true } as const;
const AUTOCOMPLETE_LIMIT = 5;

export async function getAutoCompleteData(search: string): Promise<AutocompleteAsset[]> {
  const [tickerMatches, nameMatches] = await Promise.all([
    prisma.asset.findMany({
      where: { ticker: { startsWith: search, mode: "insensitive" } },
      select: AUTOCOMPLETE_SELECT,
      orderBy: { ticker: "asc" },
      take: AUTOCOMPLETE_LIMIT,
    }),
    prisma.asset.findMany({
      where: { name: { contains: search, mode: "insensitive" } },
      select: AUTOCOMPLETE_SELECT,
      orderBy: { name: "asc" },
      take: AUTOCOMPLETE_LIMIT,
    }),
  ]);

  const seen = new Set<string>();
  return [...tickerMatches, ...nameMatches].filter((asset) => {
    if (seen.has(asset.ticker)) return false;
    seen.add(asset.ticker);
    return true;
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
