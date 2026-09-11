import type {
  Order,
  OrderbookQuery,
  PortfolioBar,
  PortfolioChartQuery,
  StatsQuery,
  TransactionRequest,
} from "../../../../models/portfolio.d.ts";
import type { IsoDate, IsoDateTime } from "./api.d.ts";

export interface RawOrderbookQuery extends Omit<OrderbookQuery, "start" | "end"> {
  start?: IsoDate;
  end?: IsoDate;
}

export interface RawOrder extends Omit<Order, "time"> {
  time: IsoDateTime;
}

export interface RawStatsQuery extends Omit<StatsQuery, "tickers" | "start" | "end"> {
  // comma separated, the backend splits it
  tickers?: string;
  start?: IsoDate;
  end?: IsoDate;
}

export interface RawPortfolioChartQuery extends Omit<PortfolioChartQuery, "start" | "end"> {
  start?: IsoDate;
  end?: IsoDate;
}

export interface RawPortfolioBar extends Omit<PortfolioBar, "time"> {
  time: IsoDateTime;
}

export interface RawTransactionRequest extends Omit<TransactionRequest, "time"> {
  time: IsoDateTime;
}
