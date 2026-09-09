import { IsoDate, IsoDateTime } from "./api";
import { TimeFrame } from "./history";

export type TransactionType = "buy" | "sell";

export type HoldingStatus = "active" | "inactive";

export interface OrderbookQuery {
  start?: IsoDate;
  end?: IsoDate;
}

export interface Order {
  name: string;
  ticker: string;
  transactionType: TransactionType;
  time: IsoDateTime;
  shares_amount: number;
}

export interface HoldingsQuery {
  status?: HoldingStatus;
}

export interface StatsQuery {
  tickers?: string;
  start?: IsoDate;
  end?: IsoDate;
}

export interface Stats {
  ticker: string;
  name: string;
  shares: number;
  invested_money: number;
  current_value: number;
  realized_gains: number;
  performance: number;
}

export interface PortfolioChartQuery {
  timeframe: TimeFrame;
  start?: IsoDate;
  end?: IsoDate;
}

export interface PortfolioBar {
  time: IsoDateTime;
  value: number;
  gain: number;
  invested: number;
}

export interface TransactionRequest {
  ticker: string;
  transactionType: TransactionType;
  shares_amount: number;
  time: IsoDateTime;
}
