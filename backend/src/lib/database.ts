import { Coverage, TimeFrame } from "@prisma/client";
import { Bar } from "@alpacahq/alpaca-trade-api";
import { prisma } from "./prisma.js";

/**
 * Checks the coverage table for a range of bars of an asset, returns true if the range is fully covered.
 */
export async function checkCoverage(
  assetId: number,
  timeframe: TimeFrame,
  start: Date,
  end: Date,
): Promise<boolean> {
  const covered: Coverage | null = await prisma.coverage.findFirst({
    where: {
      assetId,
      timeframe,
      start: { lte: start },
      end: { gte: end },
    },
  });

  return covered != null;
}

/**
 * Store bars as cache and record the range they span in the coverage table.
 * Coverage is only written once the rows are in, it never claim data which is not stored.
 */
export async function cacheBars(assetId: number, timeframe: TimeFrame, bars: Bar[]): Promise<void> {
  //nothing to cache
  if (bars.length === 0) {
    return;
  }
  const first: Bar = bars[0];
  const last: Bar = bars.at(-1)!;

  // a range already holding these bars means they are cached
  const covered: boolean = await checkCoverage(assetId, timeframe, first.timestamp, last.timestamp);

  // already cached
  if (covered) {
    return;
  }

  await prisma.history.createMany({
    data: bars.map((bar: Bar) => ({
      assetId,
      time: bar.timestamp,
      high: bar.high,
      low: bar.low,
      open: bar.open,
      close: bar.close,
      volume: bar.volume,
    })),
    skipDuplicates: true,
  });

  await prisma.coverage.create({
    data: { assetId, timeframe, start: first.timestamp, end: last.timestamp },
  });

  await unifyCoverageRanges(assetId, timeframe);
}

/**
 * Collapse overlapping and touching coverage rows of an asset into as few ranges as possible,
 * so a lookup only has to find a single row instead of stitching several together.
 */
async function unifyCoverageRanges(assetId: number, timeframe: TimeFrame): Promise<void> {
  const ranges: Coverage[] = await prisma.coverage.findMany({
    where: { assetId, timeframe },
    orderBy: { start: "asc" },
  });

  const seed: Coverage | undefined = ranges[0];
  if (!seed) return;

  // seeding with a real row keeps the bounds non-null
  let start: Date = seed.start;
  let end: Date = seed.end;

  for (const range of ranges) {
    if (range.start < start) start = range.start;
    if (range.end > end) end = range.end;
  }

  // if there is already one range which covers everything keep it and drop the rest
  const spanning: Coverage | undefined = ranges.find(
    (range: Coverage) =>
      range.start.getTime() == start.getTime() && range.end.getTime() == end.getTime(),
  );

  if (spanning) {
    await prisma.coverage.deleteMany({
      where: { assetId, timeframe, id: { not: spanning.id } },
    });
    return;
  }

  await prisma.coverage.deleteMany({ where: { assetId, timeframe } });
  await prisma.coverage.create({ data: { assetId, timeframe, start, end } });
}
