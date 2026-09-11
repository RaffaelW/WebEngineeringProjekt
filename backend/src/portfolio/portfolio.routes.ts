import { TransactionType } from "@prisma/client";
import { Router } from "express";
import z from "zod";
import type { ApiMessage } from "../../../models/api.d.ts";
import type {
  HoldingStatus,
  HoldingsQuery,
  Orderbook,
  OrderbookQuery,
  PortfolioBar,
  PortfolioChartQuery,
  Stats,
  StatsQuery,
  TransactionRequest,
} from "../../../models/portfolio.d.ts";
import { requireAuth } from "../auth/auth.middleware.js";
import { endOfDay, getLatestTradedDay, startOfDay } from "../lib/date.js";
import { timeFrameKeys } from "../lib/timeframe.js";
import {
  endDateSchema,
  requireStartBeforeEnd,
  startBeforeEndError,
  startDateSchema,
  tickerSchema,
} from "../lib/validation.js";
import { validate, validateQuery } from "../middleware/validation.middleware.js";
import { calculatePortfolioChart } from "./chart.service.js";
import {
  calculateStats,
  getLatestValidEnd,
  getOrderBook,
  getStocksByStatus,
  getValidStart,
  processOrder,
  setWantedTickers,
} from "./portfolio.service.js";

export const router = Router();

const FUTURE_TOLERANCE = 1000 * 5; // 5 seconds, client/server clock drift
const portfolioSchema = z.object({
  ticker: tickerSchema,
  transactionType: z.enum(TransactionType),
  shares_amount: z.int().positive(),
  time: z.iso
    .datetime()
    .transform((s) => new Date(s))
    .refine((time) => time.getTime() <= Date.now() + FUTURE_TOLERANCE, {
      message: "time cannot be in the future",
    }),
}) satisfies z.ZodType<TransactionRequest>;
type PortfolioSchema = z.infer<typeof portfolioSchema>;

const orderbookSchema = z
  .object({
    start: startDateSchema,
    end: endDateSchema,
  })
  .refine(requireStartBeforeEnd, startBeforeEndError) satisfies z.ZodType<OrderbookQuery>;
type OrderbookSchema = z.infer<typeof orderbookSchema>;

// comma separated list, absent means every ticker in the orderbook
const statsSchema = z
  .object({
    tickers: z
      .string()
      .optional()
      .transform((s: string | undefined) => {
        if (!s) {
          return undefined;
        }

        return s
          .split(",")
          .map((ticker: string) => ticker.trim().toUpperCase())
          .filter(Boolean);
      }),
    // must be a trading day, absent means the performance is measured from the very first order
    start: startDateSchema,
    // if not set the latest trading day is used, priced live while the market is open
    // and off that session's closing bar otherwise
    end: endDateSchema,
  })
  .refine(requireStartBeforeEnd, startBeforeEndError) satisfies z.ZodType<StatsQuery>;

// absent means every ticker ever traded, held or already sold off
const holdingsSchema = z.object({
  status: z.enum(["active", "inactive"] satisfies HoldingStatus[]).optional(),
}) satisfies z.ZodType<HoldingsQuery>;
type HoldingsSchemaQuery = z.infer<typeof holdingsSchema>;

// the window of the chart, neither bound has to be a trading day, bars align to their own grid
const chartSchema = z
  .object({
    timeframe: z.enum(timeFrameKeys),
    // absent means the day of the very first order
    start: startDateSchema,
    // absent means the latest day that already produced market data
    end: endDateSchema,
  })
  .refine(requireStartBeforeEnd, startBeforeEndError) satisfies z.ZodType<PortfolioChartQuery>;
type ChartQuery = z.infer<typeof chartSchema>;

/**
 * Returns every transaction every made in ascending order of one user,
 * optionally limited to the given range, by default the whole orderbook
 */
router.route("/orderbook").get(requireAuth, validateQuery(orderbookSchema), async (req, res) => {
  const { start, end } = req.validatedQuery as OrderbookSchema;

  const orderbook: Orderbook = await getOrderBook(req.user!.id, start, end);
  res.status(200).json(orderbook satisfies Orderbook);
});

/**
 * Returns the tickers the user holds, active are the open positions, inactive the ones
 * already sold off completely, without a status every ticker ever traded is returned
 */
router.route("/holdings").get(requireAuth, validateQuery(holdingsSchema), async (req, res) => {
  const { status } = req.validatedQuery as HoldingsSchemaQuery;

  // every order made in ascending order
  const orderbook: Orderbook = await getOrderBook(req.user!.id);
  const tickers: string[] = getStocksByStatus(orderbook, status);

  res.status(200).json(tickers satisfies string[]);
});

/**
 * Returns a number of statistics about a set of tickers if not set return the statistics of every ticker ever held
 * if end is set only transaction which happened before that will be used to calculate the statistic
 * if start is set the performance is measured from there, a position already held then counts with
 * its market price at start instead of what it once was bought for
 */
router.route("/stats").get(requireAuth, validateQuery(statsSchema), async (req, res) => {
  const { tickers, end, start } = req.validatedQuery as StatsQuery;

  // every order made in ascending order
  const orderbook: Orderbook = await getOrderBook(req.user!.id);

  // if no tickers are queried wanted is set to every ticker ever held
  const wanted: string[] = setWantedTickers(orderbook, tickers);

  // if end is valid trading return end else return the previous trading day
  const windowEnd: Date = await getLatestValidEnd(end);
  // without a start the window starts at the very first order
  const windowStart: Date = await getValidStart(start);

  const stats: Stats[] = await calculateStats(orderbook, wanted, windowEnd, windowStart);

  res.status(200).json(stats satisfies Stats[]);
});

/**
 * Returns one candle per period for the portfolio as a whole.
 *
 * The shares are the ones held right now, weighted by their price on each bar, so value reads as
 * what the current portfolio would have been worth back then. invested is the money actually paid
 * for those shares and stays flat across the window, gain is the distance between the two.
 */
router.route("/chart").get(requireAuth, validateQuery(chartSchema), async (req, res) => {
  const { timeframe, start, end } = req.validatedQuery as ChartQuery;

  // every order made in ascending order
  const orderbook: Orderbook = await getOrderBook(req.user!.id);

  // nothing was ever traded, there is no portfolio to chart
  if (orderbook.length === 0) {
    return res.status(200).json([]);
  }

  const windowEnd: Date = end ?? endOfDay(await getLatestTradedDay(new Date()));
  // without a start the chart begins on the day the first order was placed
  const windowStart: Date = start ?? startOfDay(orderbook[0].time);

  const bars: PortfolioBar[] = await calculatePortfolioChart(
    orderbook,
    timeframe,
    windowStart,
    windowEnd,
  );

  res.status(200).json(bars satisfies PortfolioBar[]);
});

router.route("/transaction").post(requireAuth, validate(portfolioSchema), async (req, res) => {
  const order = req.body as PortfolioSchema;

  await processOrder(order, req.user!.id);
  res.status(201).json({ message: "Transaction created" } satisfies ApiMessage);
});
