import { Coverage, TimeFrame } from "@prisma/client";
import { Bar } from "@alpacahq/alpaca-trade-api";
import { prisma } from "./prisma.js";
import { getOrderBook, Orderbook } from "../portfolio/portfolio.service.js";
import { endOfDay } from "./date.js";

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

/**
 * Drop cached bars of assets no user holds a transaction on,
 * coverage goes with them so nothing claims data which is no longer stored.
 * A ticker is kept from its first buy until the day the last holder sold out,
 * or until now while anybody is still holding it.
 */
export async function freeSpace(): Promise<void> {
  /** What the cache still has to hold for a ticker, summed over every user. */
  type Demand = {
    start: Date;
    lastOrder: Date;
    sharesHeld: number;
  };

  const currentDate: Date = new Date();
  const demands: Map<string, Demand> = new Map();

  const users: { id: number }[] = await prisma.appUser.findMany({ select: { id: true } });

  for (const user of users) {
    const orderbook: Orderbook = await getOrderBook(user.id);

    for (const order of orderbook) {
      // widen to what an earlier user already needed of this ticker
      const demand: Demand = demands.get(order.ticker) ?? {
        start: order.time,
        lastOrder: order.time,
        sharesHeld: 0,
      };

      if (order.time < demand.start) demand.start = order.time;
      if (order.time > demand.lastOrder) demand.lastOrder = order.time;
      demand.sharesHeld +=
        order.transactionType == "buy" ? order.shares_amount : -order.shares_amount;

      demands.set(order.ticker, demand);
    }
  }

  const assets: { id: number; ticker: string }[] = await prisma.asset.findMany({
    select: { id: true, ticker: true },
  });

  for (const asset of assets) {
    const demand: Demand | undefined = demands.get(asset.ticker);

    // no user ever held this no need to cache it (reestablish consistent db layout)
    if (demand == undefined) {
      await prisma.coverage.deleteMany({ where: { assetId: asset.id } });
      await prisma.history.deleteMany({ where: { assetId: asset.id } });
      continue;
    }

    for (const timeframe of Object.keys(TimeFrame)) {
      await unifyCoverageRanges(asset.id, timeframe as TimeFrame);
    }

    const keepFrom: Date = demand.start;
    // while somebody holds the ticker now is the latest bar which can exist,
    // once it is sold off the closing bar of the sell day is the last one needed
    const keepUntil: Date = demand.sharesHeld > 0 ? currentDate : endOfDay(demand.lastOrder);

    await prisma.coverage.deleteMany({
      where: { assetId: asset.id, end: { lt: keepFrom } },
    });

    await prisma.coverage.updateMany({
      where: { assetId: asset.id, start: { lt: keepFrom } },
      data: { start: keepFrom },
    });

    await prisma.history.deleteMany({
      where: { assetId: asset.id, time: { lt: keepFrom } },
    });

    await prisma.coverage.deleteMany({
      where: { assetId: asset.id, start: { gt: keepUntil } },
    });

    await prisma.coverage.updateMany({
      where: { assetId: asset.id, end: { gt: keepUntil } },
      data: { end: keepUntil },
    });

    await prisma.history.deleteMany({
      where: { assetId: asset.id, time: { gt: keepUntil } },
    });
  }
}
