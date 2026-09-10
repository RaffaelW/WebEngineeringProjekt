/**
 * Everything under /api/portfolio
 */

import type { TimeFrameKey } from "./history.js";

export type TransactionType = "buy" | "sell";

/**
 * active is an open position, inactive one that was completely sold off.
 */
export type HoldingStatus = "active" | "inactive";

/* -------------------------------------------------------------------------- */
/* GET /api/portfolio/orderbook                                               */
/* -------------------------------------------------------------------------- */

export interface OrderbookQuery {
  start?: Date;
  end?: Date;
}

export interface Order {
  name: string;
  ticker: string;
  transactionType: TransactionType;
  time: Date;
  shares_amount: number;
}

export type Orderbook = Order[];

/* -------------------------------------------------------------------------- */
/* GET /api/portfolio/holdings                                                */
/* -------------------------------------------------------------------------- */

/**
 * Without a status every ticker ever traded is returned.
 */
export interface HoldingsQuery {
  status?: HoldingStatus;
}

/* -------------------------------------------------------------------------- */
/* GET /api/portfolio/stats                                                   */
/* -------------------------------------------------------------------------- */

export interface StatsQuery {
  // absent means every ticker in the orderbook
  tickers?: string[];
  start?: Date;
  end?: Date;
}

export interface Stats {
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
}

/* -------------------------------------------------------------------------- */
/* GET /api/portfolio/chart                                                   */
/* -------------------------------------------------------------------------- */

export interface PortfolioChartQuery {
  timeframe: TimeFrameKey;
  start?: Date;
  end?: Date;
}

/**
 * One candle for the portfolio as a whole.
 */
export interface PortfolioBar {
  time: Date;
  value: number;
  gain: number;
  invested: number;
}

/* -------------------------------------------------------------------------- */
/* POST /api/portfolio/transaction                                            */
/* -------------------------------------------------------------------------- */

export interface TransactionRequest {
  ticker: string;
  transactionType: TransactionType;
  shares_amount: number;
  time: Date;
}
