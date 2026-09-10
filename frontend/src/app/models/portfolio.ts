import type { TimeFrameKey } from "../../../../models/history";
import type { TransactionType } from "../../../../models/portfolio";
import type { IsoDate, IsoDateTime } from "./api";

export interface RawOrderbookQuery {
  start?: IsoDate;
  end?: IsoDate;
}

export interface RawOrder {
  name: string;
  ticker: string;
  transactionType: TransactionType;
  time: IsoDateTime;
  shares_amount: number;
}

export interface RawStatsQuery {
  // comma separated, the backend splits it
  tickers?: string;
  start?: IsoDate;
  end?: IsoDate;
}

export interface RawPortfolioChartQuery {
  timeframe: TimeFrameKey;
  start?: IsoDate;
  end?: IsoDate;
}

export interface RawPortfolioBar {
  time: IsoDateTime;
  value: number;
  gain: number;
  invested: number;
}

export interface RawTransactionRequest {
  ticker: string;
  transactionType: TransactionType;
  shares_amount: number;
  time: IsoDateTime;
}
