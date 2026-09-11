import { Service } from "@angular/core";
import type { AssetHistory, HistoryQuery } from "../../../models/history.d.ts";
import type { LeaderboardQuery } from "../../../models/leaderboard.d.ts";
import type {
  Order,
  OrderbookQuery,
  PortfolioBar,
  PortfolioChartQuery,
  StatsQuery,
  TransactionRequest,
} from "../../../models/portfolio.d.ts";
import type { IsoDate, IsoDateTime } from "./models/api.d.ts";
import type { RawAssetHistory, RawHistoryQuery } from "./models/history.d.ts";
import type { RawLeaderboardQuery } from "./models/leaderboard.d.ts";
import type {
  RawOrder,
  RawOrderbookQuery,
  RawPortfolioBar,
  RawPortfolioChartQuery,
  RawStatsQuery,
  RawTransactionRequest,
} from "./models/portfolio.d.ts";

// Converts the Raw JSON into the original Data Structures
@Service()
export class SerializeService {
  // Dates
  toIsoDate(date: Date): IsoDate {
    return date.toISOString().slice(0, 10);
  }

  toIsoDateTime(date: Date): IsoDateTime {
    return date.toISOString();
  }

  toDate(time: IsoDateTime): Date {
    return new Date(time);
  }

  private toOptionalIsoDate(date: Date | undefined): IsoDate | undefined {
    return date ? this.toIsoDate(date) : undefined;
  }

  // history
  toRawHistoryQuery(query: HistoryQuery): RawHistoryQuery {
    return {
      ticker: query.ticker,
      start: this.toIsoDate(query.start),
      end: this.toIsoDate(query.end),
      timeframe: query.timeframe,
    };
  }

  toAssetHistory(raw: RawAssetHistory): AssetHistory {
    return { ...raw, time: this.toDate(raw.time) };
  }

  // portfolio
  toRawOrderbookQuery(query: OrderbookQuery): RawOrderbookQuery {
    return {
      start: this.toOptionalIsoDate(query.start),
      end: this.toOptionalIsoDate(query.end),
    };
  }

  toOrder(raw: RawOrder): Order {
    return { ...raw, time: this.toDate(raw.time) };
  }

  toRawStatsQuery(query: StatsQuery): RawStatsQuery {
    return {
      // the backend splits the comma separated list again
      tickers: query.tickers?.join(","),
      start: this.toOptionalIsoDate(query.start),
      end: this.toOptionalIsoDate(query.end),
    };
  }

  toRawPortfolioChartQuery(query: PortfolioChartQuery): RawPortfolioChartQuery {
    return {
      timeframe: query.timeframe,
      start: this.toOptionalIsoDate(query.start),
      end: this.toOptionalIsoDate(query.end),
    };
  }

  toPortfolioBar(raw: RawPortfolioBar): PortfolioBar {
    return { ...raw, time: this.toDate(raw.time) };
  }

  toRawTransactionRequest(request: TransactionRequest): RawTransactionRequest {
    return { ...request, time: this.toIsoDateTime(request.time) };
  }

  // leaderboard
  toRawLeaderboardQuery(query: LeaderboardQuery): RawLeaderboardQuery {
    return {
      start: this.toOptionalIsoDate(query.start),
      end: this.toOptionalIsoDate(query.end),
    };
  }
}
