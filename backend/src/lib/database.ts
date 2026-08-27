import { Coverage, TimeFrame } from "@prisma/client";
import { Bar } from "@alpacahq/alpaca-trade-api";
import { prisma } from "./prisma.js";
import { clampToAvailable } from "./alpaca.js";

export type Range = { start: Date; end: Date };

const touchToleranceMs: number = 1;

export function mergeRanges(ranges: readonly Range[]): Range[] {
  const sorted: Range[] = [...ranges].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime(),
  );

  const merged: Range[] = [];

  for (const { start, end } of sorted) {
    const last: Range | undefined = merged.at(-1);

    if (last && start.getTime() <= last.end.getTime() + touchToleranceMs) {
      if (end.getTime() > last.end.getTime()) last.end = new Date(end);
    } else {
      merged.push({ start: new Date(start), end: new Date(end) });
    }
  }

  return merged;
}

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
 * Store bars as cache and record the window they were fetched for.
 *
 * Coverage records the REQUESTED window, not the span of the returned bars: weekends,
 * holidays and the 15 minute delay make the bars a strict subset, so recording their span
 * would miss on the next identical request and refetch forever. An empty result is cached
 * too. requestedStart/requestedEnd must be the clamped values handed to fetchAssetHistory,
 * so nothing is claimed which was not fetched.
 */
export async function cacheBars(
  assetId: number,
  timeframe: TimeFrame,
  bars: Bar[],
  requestedStart: Date,
  requestedEnd: Date,
): Promise<void> {
  if (requestedEnd.getTime() > clampToAvailable(requestedEnd).getTime()) {
    throw new Error(
      `cacheBars got an unclamped window ending ${requestedEnd.toISOString()}, pass the end which was handed to fetchAssetHistory`,
    );
  }

  if (requestedEnd < requestedStart) {
    return;
  }

  const covered: boolean = await checkCoverage(assetId, timeframe, requestedStart, requestedEnd);

  if (covered) {
    return;
  }

  await prisma.history.createMany({
    data: bars.map((bar: Bar) => ({
      assetId,
      timeframe,
      time: bar.timestamp,
      high: bar.high,
      low: bar.low,
      open: bar.open,
      close: bar.close,
      volume: bar.volume,
    })),
    skipDuplicates: true,
  });

  await prisma.coverage.createMany({
    data: [{ assetId, timeframe, start: requestedStart, end: requestedEnd }],
    skipDuplicates: true,
  });

  await unifyCoverageRanges(assetId, timeframe);
}

/**
 * Collapse overlapping and touching coverage rows of an asset into as few ranges as possible,
 * so a lookup only has to find a single row instead of stitching several together.
 */
async function unifyCoverageRanges(assetId: number, timeframe: TimeFrame): Promise<void> {
  const rows: Coverage[] = await prisma.coverage.findMany({
    where: { assetId, timeframe },
    orderBy: [{ start: "asc" }],
  });

  if (rows.length === 0) return;

  const merged: Range[] = mergeRanges(rows);

  const changedRows: Coverage[] = rows.filter(
    (row: Coverage) =>
      !merged.some(
        (range: Range) =>
          range.start.getTime() === row.start.getTime() &&
          range.end.getTime() === row.end.getTime(),
      ),
  );

  if (changedRows.length === 0) return;

  await prisma.$transaction([
    prisma.coverage.deleteMany({
      where: { id: { in: changedRows.map((row: Coverage) => row.id) } },
    }),
    prisma.coverage.createMany({
      data: merged.map((range: Range) => ({
        assetId,
        timeframe,
        start: range.start,
        end: range.end,
      })),
      skipDuplicates: true,
    }),
  ]);
}
