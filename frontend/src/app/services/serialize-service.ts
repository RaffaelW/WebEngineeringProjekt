import { Service } from "@angular/core";
import { HistoryQuery, AssetHistory } from "../../../../models/history";
import { LeaderboardQuery } from "../../../../models/leaderboard";
import {
  OrderbookQuery,
  Order,
  StatsQuery,
  PortfolioChartQuery,
  PortfolioBar,
  TransactionRequest,
} from "../../../../models/portfolio";
import { IsoDate, IsoDateTime } from "../models/api";
import { RawHistoryQuery, RawAssetHistory } from "../models/history";
import { RawLeaderboardQuery } from "../models/leaderboard";
import {
  RawOrderbookQuery,
  RawOrder,
  RawStatsQuery,
  RawPortfolioChartQuery,
  RawPortfolioBar,
  RawTransactionRequest,
} from "../models/portfolio";

// Converts the Raw JSON into the original Data Structures
@Service()
export class SerializeService {
  // Dates

  toIsoDate(date: Date): IsoDate {
    const year: string = String(date.getFullYear()).padStart(4, "0");
    const month: string = String(date.getMonth() + 1).padStart(2, "0");
    const day: string = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
