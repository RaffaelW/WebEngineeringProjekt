import { Component, computed, inject, Signal, signal, WritableSignal } from "@angular/core";
import type { Stats } from "../../../../../models/portfolio.d.ts";
import { PortfolioApi } from "../../services/portfolio-api";
import { firstValueFrom } from "rxjs";
import { StatCard } from "../../components/stat-card/stat-card";

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
  imports: [StatCard],
  templateUrl: "./dashboard-page.html",
  styleUrl: "./dashboard-page.scss",
})
export class DashboardPage {
  private readonly portfolioApi: PortfolioApi = inject(PortfolioApi);

  private readonly stats: WritableSignal<Stats[]> = signal<Stats[]>([]);
  protected readonly loading: WritableSignal<boolean> = signal(true);
  protected readonly error: WritableSignal<string | null> = signal(null);

  constructor() {
    this.loadStats();
  }

  private async loadStats(): Promise<void> {
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
  ]);
}
