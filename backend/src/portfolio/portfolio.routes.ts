import { Router } from "express";
import z from "zod";
import {
  calculateStats,
  getLatestValidEnd,
  getOrderBook,
  getStocksByStatus,
  getValidStart,
  HoldingError,
  NotATradeDayError,
  processOrder,
  setWantedTickers,
} from "./portfolio.service.js";
import { TransactionType } from "@prisma/client";
import { requireAuth } from "../auth/auth.middleware.js";
import { validate, validateQuery } from "../middleware/validation.middleware.js";
import { DateError, endOfDay, getLatestTradedDay, startOfDay } from "../lib/date.js";
import { GateWayError, NoMarketDataError, TickerNotFoundError } from "../lib/alpaca.js";
import { timeFrameKeys } from "../lib/timeframe.js";
import { RangeError } from "../history/history.service.js";
import { calculatePortfolioChart } from "./chart.service.js";
import type {
  HoldingsQuery,
  Orderbook,
  OrderbookQuery,
  PortfolioBar,
  PortfolioChartQuery,
  Stats,
  StatsQuery,
  TransactionRequest,
} from "../../../models/portfolio.js";
import type { ApiMessage } from "../../../models/api.js";

export const router = Router();

const portfolioSchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(10)
    .transform((s: string) => s.toUpperCase()),
  transactionType: z.enum(TransactionType),
  shares_amount: z.int().positive(),
  time: z.iso.datetime().transform((s) => new Date(s)),
}) satisfies z.ZodType<TransactionRequest>;
type PortfolioSchema = z.infer<typeof portfolioSchema>;

const orderbookSchema = z
  .object({
    start: z.iso
      .date()
      .transform((s: string) => startOfDay(new Date(s)))
      .optional(),
    end: z.iso
      .date()
      .transform((s: string) => endOfDay(new Date(s)))
      .optional(),
  })
  .refine((range) => !range.start || !range.end || range.start <= range.end, {
    message: "start must not be after end",
    path: ["start"],
  }) satisfies z.ZodType<OrderbookQuery>;
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
    // if not set the latest trading day is used, priced live while the market is open
    // and off that session's closing bar otherwise
    end: z.iso
      .date()
      .optional()
      .transform((s: string | undefined) => (s ? new Date(s) : undefined)),
    // must be a trading day, absent means the performance is measured from the very first order
    start: z.iso
      .date()
      .optional()
      .transform((s: string | undefined) => (s ? new Date(s) : undefined)),
  })
  // a reversed window would price the opening position after the day it is valued on
  .refine((range) => !range.start || !range.end || range.start <= range.end, {
    message: "start must not be after end",
    path: ["start"],
  }) satisfies z.ZodType<StatsQuery>;
type StatsSchema = z.infer<typeof statsSchema>;

// absent means every ticker ever traded, held or already sold off
const holdingsSchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
}) satisfies z.ZodType<HoldingsQuery>;
type HoldingsSchema = z.infer<typeof holdingsSchema>;

// the window of the chart, neither bound has to be a trading day, bars align to their own grid
const chartSchema = z
  .object({
    timeframe: z.enum(timeFrameKeys),
    // absent means the day of the very first order
    start: z.iso
      .date()
      .transform((s: string) => startOfDay(new Date(s)))
      .optional(),
    // absent means the latest day that already produced market data
    end: z.iso
      .date()
      .transform((s: string) => endOfDay(new Date(s)))
      .optional(),
  })
  .refine((range) => !range.start || !range.end || range.start <= range.end, {
    message: "start must not be after end",
    path: ["start"],
  }) satisfies z.ZodType<PortfolioChartQuery>;
type ChartSchema = z.infer<typeof chartSchema>;

/**
 * Returns every transaction every made in ascending order of one user,
 * optionally limited to the given range, by default the whole orderbook
 */
router.route("/orderbook").get(requireAuth, validateQuery(orderbookSchema), async (req, res) => {
  const { start, end } = req.query as OrderbookSchema;

  const orderbook: Orderbook = await getOrderBook(req.user!.id, start, end);
  res.status(200).json(orderbook);
});

/**
 * Returns the tickers the user holds, active are the open positions, inactive the ones
 * already sold off completely, without a status every ticker ever traded is returned
 */
router.route("/holdings").get(requireAuth, validateQuery(holdingsSchema), async (req, res) => {
  try {
    const { status } = req.query as HoldingsSchema;

    // every order made in ascending order
    const orderbook: Orderbook = await getOrderBook(req.user!.id);
    const tickers: string[] = getStocksByStatus(orderbook, status);

    res.status(200).json(tickers);
  } catch (error) {
    // an orderbook that sells more than it holds
    if (error instanceof HoldingError) {
      return res.status(400).json({ message: error.message } satisfies ApiMessage);
    }

    console.error("Failed to load holdings", error);
    res.status(500).json({ message: "Internal server error" } satisfies ApiMessage);
  }
});

/**
 * Returns a number of statistics about a set of tickers if not set return the statistics of every ticker ever held
 * if end is set only transaction which happened before that will be used to calculate the statistic
 * if start is set the performance is measured from there, a position already held then counts with
 * its market price at start instead of what it once was bought for
 */
router.route("/stats").get(requireAuth, validateQuery(statsSchema), async (req, res) => {
  try {
    const { tickers, end, start } = req.query as StatsSchema;

    // every order made in ascending order
    const orderbook: Orderbook = await getOrderBook(req.user!.id);

    // if no tickers are queried wanted is set to every ticker ever held
    const wanted: string[] = setWantedTickers(orderbook, tickers);

    // if end is valid trading return end else return the previous trading day
    const windowEnd: Date = await getLatestValidEnd(end);
    // without a start the window starts at the very first order
    const windowStart: Date = await getValidStart(start);

    const stats: Stats[] = await calculateStats(orderbook, wanted, windowEnd, windowStart);

    res.status(200).json(stats);
  } catch (error) {
    // a non tradeable end, an end without market data, or an orderbook that sells more than it holds
    if (
      error instanceof DateError ||
      error instanceof NoMarketDataError ||
      error instanceof HoldingError
    ) {
      return res.status(400).json({ message: error.message } satisfies ApiMessage);
    }

    if (error instanceof GateWayError) {
      console.error("Failed to fetch market data from upstream", error);
      return res
        .status(502)
        .json({ message: "Failed to fetch market data from upstream" } satisfies ApiMessage);
    }

    console.error("Failed to calculate portfolio stats", error);
    res.status(500).json({ message: "Internal server error" } satisfies ApiMessage);
  }
});

/**
 * Returns one candle per period for the portfolio as a whole.
 *
 * The shares are the ones held right now, weighted by their price on each bar, so value reads as
 * what the current portfolio would have been worth back then. invested is the money actually paid
 * for those shares and stays flat across the window, gain is the distance between the two.
 */
router.route("/chart").get(requireAuth, validateQuery(chartSchema), async (req, res) => {
  try {
    // timeframe is required and req.query is declared as ParsedQs, which does not
    // carry it, so the conversion only compiles through unknown
    const { timeframe, start, end } = req.query as unknown as ChartSchema;

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

    res.status(200).json(bars);
  } catch (error) {
    if (error instanceof TickerNotFoundError) {
      console.error("Asset not found", error);
      return res.status(404).json({ message: "Asset not found" } satisfies ApiMessage);
    }

    // a window the timeframe cannot serve, a day without market data, or an orderbook
    // that sells more than it holds
    if (
      error instanceof RangeError ||
      error instanceof DateError ||
      error instanceof NoMarketDataError ||
      error instanceof HoldingError
    ) {
      return res.status(400).json({ message: error.message } satisfies ApiMessage);
    }

    if (error instanceof GateWayError) {
      console.error("Failed to fetch market data from upstream", error);
      return res
        .status(502)
        .json({ message: "Failed to fetch market data from upstream" } satisfies ApiMessage);
    }

    console.error("Failed to calculate portfolio chart", error);
    res.status(500).json({ message: "Internal server error" } satisfies ApiMessage);
  }
});

router.route("/transaction").post(requireAuth, validate(portfolioSchema), async (req, res) => {
  try {
    const order = req.body as PortfolioSchema;

    await processOrder(order, req.user!.id);
    res.status(201).json({ message: "Transaction created" } satisfies ApiMessage);
  } catch (error) {
    if (error instanceof TickerNotFoundError) {
      return res.status(404).json({ message: "Asset not found" } satisfies ApiMessage);
    }

    if (error instanceof NotATradeDayError) {
      return res.status(400).json({ message: error.message } satisfies ApiMessage);
    }

    if (error instanceof GateWayError) {
      console.error("Failed to fetch market calendar from upstream", error);
      return res
        .status(502)
        .json({ message: "Failed to fetch market calendar from upstream" } satisfies ApiMessage);
    }

    console.error("Failed to process order", error);
    res.status(500).json({ message: "Internal server error" } satisfies ApiMessage);
  }
});
