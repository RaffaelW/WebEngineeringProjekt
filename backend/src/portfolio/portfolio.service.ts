import { Bar } from "@alpacahq/alpaca-trade-api";
import { TransactionType } from "@prisma/client";
import {
  AssetHistory,
  clampToAvailable,
  fetchAssetHistory,
  fetchFirstBarOfDay,
  fetchLastBarOfDay,
  fetchLivePrice,
  getApproxBarAt,
  TickerNotFoundError,
} from "../lib/alpaca.js";
import { cacheBars } from "../lib/database.js";
import {
  DateError,
  endOfDay,
  getLatestTradedDay,
  isMarketOpen,
  isTradeDay,
  startOfDay,
} from "../lib/date.js";
import { prisma } from "../lib/prisma.js";
import { timeFrames, TimeFrameSpec } from "../lib/timeframe.js";

export class NotATradeDayError extends DateError {
  constructor(time: Date) {
    super(`${startOfDay(time).toISOString()} is not a trading day`);
  }
}

export class HoldingError extends Error {}

export type Order = {
  name: string;
  ticker: string;
  transactionType: TransactionType;
  time: Date;
  shares_amount: number;
};

export type transactionOrder = {
  ticker: string;
  transactionType: TransactionType;
  time: Date;
  shares_amount: number;
};

export type Stats = {
  ticker: string;
  name: string;
  shares: number;
  invested_money: number;
  // shares * live price, 0 once the position is closed
  current_value: number;
  realized_gains: number;
  total_costs: number;
  // (realized + unrealized) / cost basis of the window, a carried position costs its price at start
  performance: number;
};

export type Orderbook = Order[];

export async function processOrder(order: transactionOrder, userId: number): Promise<void> {
  // not on a tradeable day
  if (!(await isTradeDay(order.time))) {
    throw new NotATradeDayError(order.time);
  }

  const asset: { id: number } | null = await prisma.asset.findUnique({
    where: { ticker: order.ticker },
    select: { id: true },
  });

  if (!asset) {
    throw new TickerNotFoundError(order.ticker);
  }

  // get all current holdings
  const orderbook: Orderbook = await getOrderBook(userId);
  const holdings: Map<string, Holding> = await getHolding(orderbook);

  // can only sell as many shares as the user owns, a ticker never held counts as zero.
  const sharesHeld: number = holdings.get(order.ticker)?.shares ?? 0;
  if (order.transactionType === "sell" && sharesHeld < order.shares_amount) {
    throw new HoldingError(
      `Cannot sell ${order.shares_amount} shares of ${order.ticker}, only ${sharesHeld} held`,
    );
  }

  await prisma.portfolioTransaction.create({
    data: {
      appUserId: userId,
      assetId: asset.id,
      transactionType: order.transactionType,
      time: order.time,
      shares_amount: order.shares_amount,
    },
  });

  if (order.transactionType == "sell") {
    return;
  }
  // one spec so the bars fetched and the coverage written can never disagree
  const daily: TimeFrameSpec = timeFrames["1d"];
  // from the start of the order day, the daily bar of that day is stamped before the
  // order itself. clamp once, so the window fetched is the window recorded as cached
  const fetchStart: Date = startOfDay(order.time);
  const clampedEnd: Date = clampToAvailable(new Date());
  const bars: Bar[] = await fetchAssetHistory(order.ticker, daily.alpaca, fetchStart, clampedEnd);

  // save data with timeframe 1day as cache
  await cacheBars(asset.id, daily.prisma, bars, fetchStart, clampedEnd);
}

function barMidpoint(bar: Bar | AssetHistory): number {
  return (bar.high + bar.low) / 2;
}

export type Holding = {
  name: string;
  shares: number;
  averageBuyPrice: number;
  investedMoney: number;
  realizedGains: number;
  totalCost: number;
};

/**
 * every ticker get mapped to an Holding type which holds information about it
 *
 * opening is the position already held before the first order, every order is replayed on top of it
 */
export async function getHolding(
  orderbook: Orderbook,
  opening: Map<string, Holding> = new Map(),
): Promise<Map<string, Holding>> {
  // copy so a seeded holding is never mutated for the caller
  const holdings: Map<string, Holding> = new Map();
  for (const [ticker, holding] of opening) {
    holdings.set(ticker, { ...holding });
  }

  // fetch all bars in parallel
  const bars = await Promise.all(
    orderbook.map(async (order) => getApproxBarAt(order.ticker, order.time)),
  );

  for (const [index, order] of orderbook.entries()) {
    // smallest timeframe in external api restrict to 1min therefore take the avg. price as approx. price
    const price: number = barMidpoint(bars[index]);
    const holding: Holding = holdings.get(order.ticker) ?? {
      name: order.name,
      shares: 0,
      averageBuyPrice: 0,
      investedMoney: 0,
      realizedGains: 0,
      totalCost: 0,
    };

    // actions for buy
    if (order.transactionType === TransactionType.buy) {
      const cost: number = order.shares_amount * price;
      holding.shares += order.shares_amount;
      holding.investedMoney += cost;
      holding.totalCost += cost;
      holding.averageBuyPrice = holding.investedMoney / holding.shares;
    } else {
      //actions for sell
      if (order.shares_amount > holding.shares) {
        throw new HoldingError(
          `Cannot sell ${order.shares_amount} shares of ${order.ticker}, only ${holding.shares} held`,
        );
      }

      // a sell only shrinks the position, the average buy price of the rest is unchanged
      const costBasis: number = order.shares_amount * holding.averageBuyPrice;
      holding.realizedGains += order.shares_amount * price - costBasis;
      holding.shares -= order.shares_amount;
      // to avoid rounding errors use if clause
      holding.investedMoney = holding.shares === 0 ? 0 : holding.investedMoney - costBasis;
    }
    holdings.set(order.ticker, holding);
  }
  return holdings;
}

export type HoldingStatus = "active" | "inactive";

export function getStocksByStatus(orderbook: Orderbook, status?: HoldingStatus): string[] {
  const shares: Map<string, number> = new Map();

  for (const order of orderbook) {
    const held: number = shares.get(order.ticker) ?? 0;

    if (order.transactionType === TransactionType.buy) {
      shares.set(order.ticker, held + order.shares_amount);
      continue;
    }

    if (order.shares_amount > held) {
      throw new HoldingError(
        `Cannot sell ${order.shares_amount} shares of ${order.ticker}, only ${held} held`,
      );
    }

    shares.set(order.ticker, held - order.shares_amount);
  }

  return [...shares.entries()]
    .filter(([, held]: [string, number]) => {
      if (status === "active") {
        return held > 0;
      }

      if (status === "inactive") {
        return held === 0;
      }

      return true;
    })
    .map(([ticker]: [string, number]) => ticker);
}

/**
 * return every order of the user in ascending order, optionally limited to a time range,
 * by default from the unix epoch up to now
 */
export async function getOrderBook(
  userId: number,
  start: Date = new Date(0),
  end: Date = new Date(),
): Promise<Orderbook> {
  type transactionType = {
    transactionType: TransactionType;
    time: Date;
    shares_amount: number;
    asset: {
      name: string;
      ticker: string;
    };
  };

  const transactions: transactionType[] = await prisma.portfolioTransaction.findMany({
    where: { appUserId: userId, time: { gte: start, lte: end } },
    select: {
      transactionType: true,
      time: true,
      shares_amount: true,
      asset: { select: { name: true, ticker: true } },
    },
    orderBy: { time: "asc" },
  });

  return transactions.map((transaction) => ({
    name: transaction.asset.name,
    ticker: transaction.asset.ticker,
    transactionType: transaction.transactionType,
    time: transaction.time,
    shares_amount: transaction.shares_amount,
  }));
}

/**
 * the position held when the window opens, re-based to the market price at start
 *
 * a share bought before start costs what it was worth at start, not what it once was bought for,
 * so the performance of the window measures only what happened inside the window
 */
export async function openingHoldings(
  orderbook: Orderbook,
  start: Date,
): Promise<Map<string, Holding>> {
  const before: Orderbook = orderbook.filter(
    (order: Order) => order.time.getTime() < start.getTime(),
  );
  const carried: Map<string, Holding> = await getHolding(before);

  const opening: Map<string, Holding> = new Map();

  const heldTickers = [...carried.entries()].filter(([, h]) => h.shares > 0);

  // fetch all first bars in parallel
  const bars = await Promise.all(heldTickers.map(([ticker]) => fetchFirstBarOfDay(ticker, start)));

  for (const [index, [ticker, holding]] of heldTickers.entries()) {
    const price: number = barMidpoint(bars[index]);
    const cost: number = holding.shares * price;

    opening.set(ticker, {
      name: holding.name,
      shares: holding.shares,
      averageBuyPrice: price,
      investedMoney: cost,
      realizedGains: 0,
      totalCost: cost,
    });
  }

  return opening;
}

/**
 *  if tickers is undefined return the tickers of every stock ever held
 */
export function setWantedTickers(orderbook: Orderbook, tickers: string[] | undefined): string[] {
  let wanted: string[];
  if (tickers === undefined) {
    // get all tickers which were ever held
    const allHeldTickers: string[] = orderbook.map((order: Order) => order.ticker);
    wanted = [...new Set(allHeldTickers)];
  } else {
    wanted = tickers;
  }
  return wanted;
}

// return end itself, or without one the latest day that already has market data
export async function getLatestValidEnd(end: Date | undefined): Promise<Date> {
  if (end && !(await isTradeDay(end))) {
    throw new NotATradeDayError(end);
  } else {
    return end ? endOfDay(end) : endOfDay(await getLatestTradedDay(new Date()));
  }
}

/*
 * start of the window, a trading day so the position held there can be priced
 *
 * without a start the window covers the whole history, nothing is ever carried into it
 */
export async function getValidStart(start: Date | undefined): Promise<Date> {
  if (!start) {
    return new Date(0);
  }

  if (!(await isTradeDay(start))) {
    throw new NotATradeDayError(start);
  }

  return startOfDay(start);
}

// calculate a number of statistics for every ticker over the window between start and end
export async function calculateStats(
  orderbook: Orderbook,
  tickers: string[],
  end: Date,
  start: Date,
): Promise<Stats[]> {
  // only the tickers the user asked for, the whole history of them is needed to know what start holds
  const owned: Orderbook = orderbook.filter((order: Order) => tickers.includes(order.ticker));

  // what was already held when the window opened, priced at start
  const opening: Map<string, Holding> = await openingHoldings(owned, start);

  const windowOrderbook: Orderbook = owned.filter(
    (order: Order) =>
      order.time.getTime() >= start.getTime() && order.time.getTime() <= end.getTime(),
  );

  // every ticker with information about it which is held or was completely sold off
  const holdings: Map<string, Holding> = await getHolding(windowOrderbook, opening);

  const endIsToday: boolean = startOfDay(end).getTime() === startOfDay(new Date()).getTime();
  const hasOpenPosition: boolean = [...holdings.values()].some(
    (holding: Holding) => holding.shares > 0,
  );
  // resolved once instead of per ticker, and only when it can change a price
  const useLivePrice: boolean = endIsToday && hasOpenPosition && (await isMarketOpen());

  const promises: Promise<Stats | undefined>[] = tickers.map(async (ticker) => {
    const holding: Holding | undefined = holdings.get(ticker);

    // if user never held that ticker return undefined, instead of throwing an error
    if (!holding) {
      return undefined;
    }

    // price is determined by the end of the day, or live if the market is open and the position is still held
    let price: number = 0;
    if (holding.shares > 0) {
      price = useLivePrice
        ? await fetchLivePrice(ticker)
        : barMidpoint(await fetchLastBarOfDay(ticker, end));
    }

    const current_value: number = holding.shares * price;
    const unrealized: number = current_value - holding.investedMoney;

    return {
      ticker,
      name: holding.name,
      shares: holding.shares,
      invested_money: holding.investedMoney,
      current_value,
      realized_gains: holding.realizedGains,
      total_costs: holding.totalCost,
      performance: calculatePerformance(holding.totalCost, holding.realizedGains + unrealized),
    };
  });
  const results = await Promise.all(promises);

  return results.filter((r): r is Stats => r !== undefined);
}

/**
 * Helper function to calculate the performance of a ticker or a portfolio.
 * The performance is calculated as (realized + unrealized) / cost basis of the window.
 * @param costs The total costs of the ticker or portfolio.
 * @param gains The total gains (realized + unrealized) of the ticker or portfolio.
 * @returns The performance as a number.
 */
export function calculatePerformance(costs: number, gains: number): number {
  return costs === 0 ? 0 : gains / costs; //avoid division by 0
}
