import { HttpClient } from "@angular/common/http";
import { inject, Service } from "@angular/core";
import { map, Observable } from "rxjs";
import type { ApiMessage } from "../../../../models/api.d.ts";
import type {
  HoldingsQuery,
  Orderbook,
  OrderbookQuery,
  PortfolioBar,
  PortfolioChartQuery,
  Stats,
  StatsQuery,
  TransactionRequest,
} from "../../../../models/portfolio.d.ts";
import type { RawOrder, RawPortfolioBar } from "../models/portfolio.d.ts";
import { API_BASE_URL, toHttpParams } from "./api";
import { SerializeService } from "./serialize-service.js";

@Service()
export class PortfolioApi {
  private readonly http = inject(HttpClient);
  private readonly serializer = inject(SerializeService);
  private readonly baseUrl = `${API_BASE_URL}/portfolio`;

  /** GET /api/portfolio/orderbook — every order in ascending order, optionally limited to a range */
  getOrderbook(query: OrderbookQuery = {}): Observable<Orderbook> {
    return this.http
      .get<RawOrder[]>(`${this.baseUrl}/orderbook`, {
        params: toHttpParams(this.serializer.toRawOrderbookQuery(query)),
      })
      .pipe(
        map(
          // map command for Observable
          (orders: RawOrder[]) =>
            // map elements of array
            orders.map((order: RawOrder) => this.serializer.toOrder(order)),
        ),
      );
  }

  /** GET /api/portfolio/holdings — tickers by status, without a status every ticker ever traded */
  getHoldings(query: HoldingsQuery = {}): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/holdings`, {
      params: toHttpParams(query),
    });
  }

  /** GET /api/portfolio/stats — statistics per ticker, without tickers every ticker ever held */
  getStats(query: StatsQuery = {}): Observable<Stats[]> {
    return this.http.get<Stats[]>(`${this.baseUrl}/stats`, {
      params: toHttpParams(this.serializer.toRawStatsQuery(query)),
    });
  }

  /** GET /api/portfolio/chart — one candle per period for the portfolio as a whole */
  getChart(query: PortfolioChartQuery): Observable<PortfolioBar[]> {
    return this.http
      .get<RawPortfolioBar[]>(`${this.baseUrl}/chart`, {
        params: toHttpParams(this.serializer.toRawPortfolioChartQuery(query)),
      })
      .pipe(
        map(
          // map command for Observable
          (bars: RawPortfolioBar[]) =>
            // map elements of array
            bars.map((bar: RawPortfolioBar) => this.serializer.toPortfolioBar(bar)),
        ),
      );
  }

  /** POST /api/portfolio/transaction — places a buy or sell order, 201 on success */
  createTransaction(request: TransactionRequest): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(
      `${this.baseUrl}/transaction`,
      this.serializer.toRawTransactionRequest(request),
    );
  }
}
