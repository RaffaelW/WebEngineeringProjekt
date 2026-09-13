import { formatCurrency } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import {
  Component,
  computed,
  effect,
  inject,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import type { ApiMessage } from "../../../../../models/api.d.ts";
import type { AssetHistory, TimeFrameKey } from "../../../../../models/history.d.ts";
import type {
  Order,
  PortfolioBar,
  Stats,
  TransactionType,
} from "../../../../../models/portfolio.d.ts";
import type { AutocompleteAsset } from "../../../../../models/asset.d.ts";
import { HistoryApi } from "../../services/history-api";
import { PortfolioApi } from "../../services/portfolio-api";
import { firstValueFrom } from "rxjs";
import { Chart } from "../../components/chart/chart";
import { PositionTable } from "../../components/position-table/position-table";
import { Reloader } from "../../components/reloader/reloader";
import { TransactionArea } from "../../components/transaction-area/transaction-area";
import { StatCard } from "../../components/stat-card/stat-card";
import { TransactionList } from "../../components/transaction-list/transaction-list";
import {
  allowedTimeframesFor,
  fallbackTimeframe,
  WindowKey,
  windowStart,
} from "../../lib/timeframe";

// everything the user picks in the transaction area
export interface TransactionSelection {
  asset: AutocompleteAsset | null;
  dateTime: Date;
  transactionType: TransactionType;
  shares: number;
}

export interface TransactionAreaConfig {
  defaultSelection: () => TransactionSelection;
  latestOrderTime: () => Date;
  maxQueryLength: number;
}

export interface ChartPoint {
  time: Date;
  value: number;
}

export interface ChartData {
  title: string;
  points: ChartPoint[];
  emptyMessage: string;
  loading: boolean;
  error: string | null;
  window: WindowKey;
  timeframe: TimeFrameKey;
  allowedTimeframes: Record<TimeFrameKey, boolean>;
}

// everything the transaction list draws
export interface OrderbookData {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

export type PositionStatus = "active" | "closed";

export interface PositionRow {
  ticker: string;
  name: string;
  shares: number;
  // invested_money / shares, 0 once the position is closed
  avgBuyPrice: number;
  // current_value / shares, 0 once the position is closed
  price: number;
  invested: number;
  value: number;
  // current_value - invested_money
  unrealized: number;
  realized: number;
  totalCosts: number;
  performance: number;
}

export interface PositionTableData {
  title: string;
  icon: string;
  status: PositionStatus;
  rows: PositionRow[];
  loading: boolean;
  error: string | null;
}

export type StatKind = "currency" | "percent";

export interface StatCardData {
  label: string;
  icon: string;
  value: number;
  kind: StatKind;
  // color the value green/red depending on its sign
  signed: boolean;
  tooltip: string;
}

@Component({
  selector: "app-dashboard-page",
  imports: [Chart, PositionTable, Reloader, TransactionArea, StatCard, TransactionList],
  templateUrl: "./dashboard-page.html",
  styleUrl: "./dashboard-page.scss",
})
export class DashboardPage {
  private readonly portfolioApi: PortfolioApi = inject(PortfolioApi);
  private readonly historyApi: HistoryApi = inject(HistoryApi);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);

  private readonly stats: WritableSignal<Stats[]> = signal<Stats[]>([]);
  protected readonly loading: WritableSignal<boolean> = signal(true);
  protected readonly error: WritableSignal<string | null> = signal(null);

  protected readonly window: WritableSignal<WindowKey> = signal<WindowKey>("3M");
  protected readonly timeframe: WritableSignal<TimeFrameKey> = signal<TimeFrameKey>("1d");

  protected readonly bars: WritableSignal<PortfolioBar[]> = signal<PortfolioBar[]>([]);
  protected readonly chartLoading: WritableSignal<boolean> = signal(true);
  protected readonly chartError: WritableSignal<string | null> = signal(null);

  protected readonly asset: WritableSignal<AutocompleteAsset | null> =
    signal<AutocompleteAsset | null>(null);
  protected readonly assetWindow: WritableSignal<WindowKey> = signal<WindowKey>("3M");
  protected readonly assetTimeframe: WritableSignal<TimeFrameKey> = signal<TimeFrameKey>("1d");
  protected readonly assetBars: WritableSignal<AssetHistory[]> = signal<AssetHistory[]>([]);
  protected readonly assetChartLoading: WritableSignal<boolean> = signal(false);
  protected readonly assetChartError: WritableSignal<string | null> = signal(null);

  protected readonly orders: WritableSignal<Order[]> = signal<Order[]>([]);
  protected readonly ordersLoading: WritableSignal<boolean> = signal(true);
  protected readonly ordersError: WritableSignal<string | null> = signal(null);

  // one counter per load function, so a slow older response can't overwrite a newer one
  private readonly requestIds: {
    stats: number;
    chart: number;
    assetChart: number;
    orderbook: number;
  } = {
    stats: 0,
    chart: 0,
    assetChart: 0,
    orderbook: 0,
  };

  private readonly allowedTimeframes: Signal<Record<TimeFrameKey, boolean>> = computed(() =>
    allowedTimeframesFor(this.window(), new Date()),
  );

  private readonly assetAllowedTimeframes: Signal<Record<TimeFrameKey, boolean>> = computed(() =>
    allowedTimeframesFor(this.assetWindow(), new Date()),
  );

  protected readonly chartData: Signal<ChartData> = computed<ChartData>(() => ({
    title: "Portfolio",
    points: this.bars(),
    emptyMessage: "No data for this window",
    loading: this.chartLoading(),
    error: this.chartError(),
    window: this.window(),
    timeframe: this.timeframe(),
    allowedTimeframes: this.allowedTimeframes(),
  }));

  protected readonly assetChartData: Signal<ChartData> = computed<ChartData>(() => {
    const asset: AutocompleteAsset | null = this.asset();
    return {
      title: asset ? `${asset.name} (${asset.ticker})` : "Asset",
      points: this.assetBars().map((bar: AssetHistory) => ({ time: bar.time, value: bar.close })),
      emptyMessage: asset
        ? "No data for this window"
        : "Pick an asset in the transaction card to see its price",
      loading: this.assetChartLoading(),
      error: this.assetChartError(),
      window: this.assetWindow(),
      timeframe: this.assetTimeframe(),
      allowedTimeframes: this.assetAllowedTimeframes(),
    };
  });

  protected readonly orderbookData: Signal<OrderbookData> = computed<OrderbookData>(() => ({
    orders: this.orders(),
    loading: this.ordersLoading(),
    error: this.ordersError(),
  }));

  protected readonly activePositions: Signal<PositionTableData> = computed<PositionTableData>(
    () => ({
      title: "Open positions",
      icon: "work",
      status: "active",
      rows: this.stats()
        .filter((stat: Stats) => stat.shares > 0)
        .map((stat: Stats) => this.toPositionRow(stat))
        .sort((a: PositionRow, b: PositionRow) => b.value - a.value),
      loading: this.loading(),
      error: this.error(),
    }),
  );

  protected readonly closedPositions: Signal<PositionTableData> = computed<PositionTableData>(
    () => ({
      title: "Closed positions",
      icon: "work_history",
      status: "closed",
      rows: this.stats()
        .filter((stat: Stats) => stat.shares === 0)
        .map((stat: Stats) => this.toPositionRow(stat))
        .sort((a: PositionRow, b: PositionRow) => b.realized - a.realized),
      loading: this.loading(),
      error: this.error(),
    }),
  );

  protected readonly transactionConfig: TransactionAreaConfig = {
    defaultSelection: () => this.defaultSelection(),
    latestOrderTime: () => this.latestOrderTime(),
    maxQueryLength: 25,
  };
  // selection of the transaction area
  protected readonly selection: WritableSignal<TransactionSelection> = signal(
    this.transactionConfig.defaultSelection(),
  );

  constructor() {
    this.onReload();

    // an asset picked in the transaction form also shows up in the asset chart,
    // clearing the form leaves the chart alone
    effect(() => {
      const picked: AutocompleteAsset | null = this.selection().asset;
      if (picked !== null && picked.ticker !== untracked(this.asset)?.ticker) {
        this.onAssetChange(picked);
      }
    });
  }

  protected onReload(): void {
    this.loadStats();
    this.loadChart();
    this.loadOrderbook();
    if (this.asset() !== null) {
      this.loadAssetChart();
    }
  }

  protected onWindowChange(window: WindowKey): void {
    this.window.set(window);
    this.timeframe.set(fallbackTimeframe(this.timeframe(), this.allowedTimeframes()));
    this.loadChart();
  }

  protected onTimeframeChange(timeframe: TimeFrameKey): void {
    this.timeframe.set(timeframe);
    this.loadChart();
  }

  private onAssetChange(asset: AutocompleteAsset): void {
    this.asset.set(asset);
    this.loadAssetChart();
  }

  protected onAssetWindowChange(window: WindowKey): void {
    this.assetWindow.set(window);
    this.assetTimeframe.set(
      fallbackTimeframe(this.assetTimeframe(), this.assetAllowedTimeframes()),
    );
    this.loadAssetChart();
  }

  protected onAssetTimeframeChange(timeframe: TimeFrameKey): void {
    this.assetTimeframe.set(timeframe);
    this.loadAssetChart();
  }

  // market data is delayed by 15 minutes, so this is the latest time an order can be placed at
  private latestOrderTime(): Date {
    return new Date(Date.now() - 15 * 60 * 1000);
  }
  private defaultSelection(): TransactionSelection {
    return { asset: null, dateTime: this.latestOrderTime(), transactionType: "buy", shares: 1 };
  }

  protected async onSubmit(): Promise<void> {
    const { asset, transactionType, shares, dateTime } = this.selection();
    if (!asset) {
      return;
    }

    try {
      const result: ApiMessage = await firstValueFrom(
        this.portfolioApi.createTransaction({
          ticker: asset.ticker,
          transactionType,
          shares_amount: shares,
          time: dateTime,
        }),
      );
      this.snackBar.open(result.message, undefined, { duration: 4000 });
      this.loadStats();
      this.loadChart();
      this.loadOrderbook();
    } catch (error) {
      this.snackBar.open(this.transactionErrorMessage(error), "Close", {
        panelClass: "snackbar-error",
      });
    }
  }

  // the backend answers failed orders
  private transactionErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body: unknown = error.error;
      if (typeof body === "object" && body !== null) {
        if ("message" in body && typeof body.message === "string") {
          return body.message;
        }
        // zod validation failure, see ValidationErrorResponse
        if ("errors" in body) {
          return "Invalid transaction";
        }
      }
    }
    return "Transaction failed";
  }

  private async loadStats(): Promise<void> {
    const requestId: number = ++this.requestIds.stats;
    this.loading.set(true);
    this.error.set(null);
    try {
      const stats: Stats[] = await firstValueFrom(this.portfolioApi.getStats());
      if (requestId === this.requestIds.stats) {
        this.stats.set(stats);
      }
    } catch {
      if (requestId === this.requestIds.stats) {
        this.error.set("Could not load portfolio");
      }
    } finally {
      if (requestId === this.requestIds.stats) {
        this.loading.set(false);
      }
    }
  }

  private async loadChart(): Promise<void> {
    const requestId: number = ++this.requestIds.chart;
    this.chartLoading.set(true);
    this.chartError.set(null);

    try {
      const end: Date = new Date();
      const bars: PortfolioBar[] = await firstValueFrom(
        this.portfolioApi.getChart({
          timeframe: this.timeframe(),
          start: windowStart(this.window(), end),
          end,
        }),
      );
      if (requestId === this.requestIds.chart) {
        this.bars.set(bars);
      }
    } catch {
      if (requestId === this.requestIds.chart) {
        this.chartError.set("Could not load chart");
      }
    } finally {
      if (requestId === this.requestIds.chart) {
        this.chartLoading.set(false);
      }
    }
  }

  private async loadAssetChart(): Promise<void> {
    const requestId: number = ++this.requestIds.assetChart;
    const asset: AutocompleteAsset | null = this.asset();
    this.assetChartError.set(null);

    // nothing picked, nothing to draw
    if (asset === null) {
      this.assetBars.set([]);
      this.assetChartLoading.set(false);
      return;
    }

    this.assetChartLoading.set(true);
    try {
      const end: Date = new Date();
      const bars: AssetHistory[] = await firstValueFrom(
        this.historyApi.getHistory({
          ticker: asset.ticker,
          timeframe: this.assetTimeframe(),
          start: windowStart(this.assetWindow(), end),
          end,
        }),
      );
      if (requestId === this.requestIds.assetChart) {
        this.assetBars.set(bars);
      }
    } catch (error) {
      if (requestId === this.requestIds.assetChart) {
        this.assetChartError.set(this.assetChartErrorMessage(error));
      }
    } finally {
      if (requestId === this.requestIds.assetChart) {
        this.assetChartLoading.set(false);
      }
    }
  }

  // the backend answers 404 for unknown tickers and 400 for a window the timeframe can't cover
  private assetChartErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return "Asset not found";
      }
      if (error.status === 400) {
        return "Window not supported for this timeframe";
      }
    }
    return "Could not load chart";
  }

  private async loadOrderbook(): Promise<void> {
    const requestId: number = ++this.requestIds.orderbook;
    this.ordersLoading.set(true);
    this.ordersError.set(null);
    try {
      const orders: Order[] = await firstValueFrom(this.portfolioApi.getOrderbook());
      if (requestId === this.requestIds.orderbook) {
        this.orders.set(orders.reverse());
      }
    } catch {
      if (requestId === this.requestIds.orderbook) {
        this.ordersError.set("Could not load orderbook");
      }
    } finally {
      if (requestId === this.requestIds.orderbook) {
        this.ordersLoading.set(false);
      }
    }
  }

  private toPositionRow(stat: Stats): PositionRow {
    const open: boolean = stat.shares > 0;
    return {
      ticker: stat.ticker,
      name: stat.name,
      shares: stat.shares,
      avgBuyPrice: open ? stat.invested_money / stat.shares : 0,
      price: open ? stat.current_value / stat.shares : 0,
      invested: stat.invested_money,
      value: stat.current_value,
      unrealized: stat.current_value - stat.invested_money,
      realized: stat.realized_gains,
      totalCosts: stat.total_costs,
      performance: stat.performance,
    };
  }

  // Possibly outsource to backend
  // market worth of the open positions, invested + return - realized
  private readonly portfolioValue = computed(() =>
    this.stats().reduce((acc, stat) => acc + stat.current_value, 0),
  );

  private readonly investedValue = computed(() =>
    this.stats().reduce((acc, stat) => acc + stat.invested_money, 0),
  );

  private readonly realizedGains = computed(() =>
    this.stats().reduce((acc, stat) => acc + stat.realized_gains, 0),
  );

  private readonly totalCosts = computed(() =>
    this.stats().reduce((acc, stat) => acc + stat.total_costs, 0),
  );

  private readonly totalReturn = computed(() =>
    this.stats().reduce((acc, stat) => {
      const unrealizedGains = stat.current_value - stat.invested_money;
      return acc + unrealizedGains + stat.realized_gains;
    }, 0),
  );

  private readonly performance = computed(() =>
    this.totalCosts() === 0 ? 0 : this.totalReturn() / this.totalCosts(),
  );

  // cache the cards so they are no recomputed on every change detection cycle
  protected readonly cards: Signal<StatCardData[]> = computed<StatCardData[]>(() => [
    {
      label: "Portfolio value",
      icon: "account_balance",
      value: this.portfolioValue(),
      kind: "currency",
      signed: false,
      tooltip: "Market worth of the shares still held",
    },
    {
      label: "Invested value",
      icon: "account_balance_wallet",
      value: this.investedValue(),
      kind: "currency",
      signed: false,
      tooltip: "What the shares still held were bought for",
    },
    {
      label: "Return",
      icon: "euro",
      value: this.totalReturn(),
      kind: "currency",
      signed: true,
      tooltip: "Unrealized gain of open positions plus realized gains of closed ones",
    },
    {
      label: "Realized gains",
      icon: "savings",
      value: this.realizedGains(),
      kind: "currency",
      signed: true,
      tooltip: "Profit and loss of shares already sold",
    },
    {
      label: "Performance",
      icon: "trending_up",
      value: this.performance(),
      kind: "percent",
      signed: true,
      tooltip: `Return divided by the total costs, every buy ever made: ${formatCurrency(this.totalCosts(), "de", "€", "EUR")}`,
    },
  ]);
}
