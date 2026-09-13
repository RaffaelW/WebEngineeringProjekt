import { HttpErrorResponse } from "@angular/common/http";
import { Component, computed, inject, Signal, signal, WritableSignal } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import type { ApiMessage } from "../../../../../models/api.d.ts";
import type { Stats, TransactionType } from "../../../../../models/portfolio.d.ts";
import type { AutocompleteAsset } from "../../../../../models/asset.d.ts";
import { PortfolioApi } from "../../services/portfolio-api";
import { firstValueFrom } from "rxjs";
import { Chart } from "../../components/chart/chart";
import { SearchArea } from "../../components/search-area/search-area";
import { StatCard } from "../../components/stat-card/stat-card";

// everything the user picks in the search area
export interface TransactionSelection {
  asset: AutocompleteAsset | null;
  dateTime: Date;
  transactionType: TransactionType;
  shares: number;
}

export interface SearchAreaConfig {
  defaultSelection: () => TransactionSelection;
  latestOrderTime: () => Date;
  maxQueryLength: number;
}

export type StatKind = "currency" | "percent";

export interface StatCardData {
  label: string;
  icon: string;
  value: number;
  kind: StatKind;
  // color the value green/red depending on its sign
  signed: boolean;
}

@Component({
  selector: "app-dashboard-page",
  imports: [Chart, SearchArea, StatCard],
  templateUrl: "./dashboard-page.html",
  styleUrl: "./dashboard-page.scss",
})
export class DashboardPage {
  private readonly portfolioApi: PortfolioApi = inject(PortfolioApi);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);

  private readonly stats: WritableSignal<Stats[]> = signal<Stats[]>([]);
  protected readonly loading: WritableSignal<boolean> = signal(true);
  protected readonly error: WritableSignal<string | null> = signal(null);

  protected readonly searchConfig: SearchAreaConfig = {
    defaultSelection: () => this.defaultSelection(),
    latestOrderTime: () => this.latestOrderTime(),
    maxQueryLength: 25,
  };
  // selection of the search area, not wired into the queries yet
  protected readonly selection: WritableSignal<TransactionSelection> = signal(
    this.searchConfig.defaultSelection(),
  );

  constructor() {
    this.loadStats();
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
    this.loading.set(true);
    this.error.set(null);
    try {
      const stats: Stats[] = await firstValueFrom(this.portfolioApi.getStats());
      this.stats.set(stats);
    } catch {
      this.error.set("Could not load portfolio");
    } finally {
      this.loading.set(false);
    }
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
    },
    {
      label: "Invested value",
      icon: "account_balance_wallet",
      value: this.investedValue(),
      kind: "currency",
      signed: false,
    },
    {
      label: "Return",
      icon: "euro",
      value: this.totalReturn(),
      kind: "currency",
      signed: true,
    },
    {
      label: "Realized gains",
      icon: "savings",
      value: this.realizedGains(),
      kind: "currency",
      signed: true,
    },
    {
      label: "Performance",
      icon: "trending_up",
      value: this.performance(),
      kind: "percent",
      signed: true,
    },
  ]);
}
