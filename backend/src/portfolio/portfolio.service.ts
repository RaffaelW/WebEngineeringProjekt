import { TransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { cacheBars } from "../lib/database.js";
import { isTradeDay, startOfDay } from "../lib/date.js";
import {
  getApproxBarAt,
  clampToAvailable,
  fetchAssetHistory,
  TickerNotFoundError,
} from "../lib/alpaca.js";
import { TimeFrameSpec, timeFrames } from "../lib/timeframe.js";
import { Bar } from "@alpacahq/alpaca-trade-api";

export class NotATradeDayError extends Error {
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

  // can only sell so much of a stocks which user owns
  const sharesHeld: number | undefined = holdings.get(order.ticker)?.shares;
  if (
    sharesHeld != undefined &&
    sharesHeld < order.shares_amount &&
    order.transactionType == "sell"
  ) {
    throw new HoldingError(
      `Can not sell more shares of a stock then currently holding, tired selling:${order.shares_amount} holding:${sharesHeld}`,
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

function barMidpoint(bar: Bar): number {
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
 */
export async function getHolding(orderbook: Orderbook): Promise<Map<string, Holding>> {
  const holdings: Map<string, Holding> = new Map();

  for (const order of orderbook) {
    // get the data of that ticker at that time, only approximately since not every minute holds a data
    const bar: Bar = await getApproxBarAt(order.ticker, order.time);

    // smallest timeframe in external api restrict to 1min therefore take the avg. price as approx. price
    const price: number = barMidpoint(bar);
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
