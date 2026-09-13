import { CurrencyPipe, PercentPipe } from "@angular/common";
import { Component, computed, inject, signal, WritableSignal } from "@angular/core";
import { MatChipListbox, MatChipListboxChange, MatChipOption } from "@angular/material/chips";
import { MatDatepickerInputEvent, MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatTableModule } from "@angular/material/table";
import { firstValueFrom } from "rxjs";
import type { LeaderboardEntry, LeaderboardQuery } from "../../../../../models/leaderboard.d.ts";
import { LeaderboardApi } from "../../services/leaderboard-api";

type Timeframe = "all" | "year" | "month" | "week" | "custom";

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "all", label: "All-time" },
  { value: "year", label: "Last 365 days" },
  { value: "month", label: "Last 30 days" },
  { value: "week", label: "Last 7 days" },
  { value: "custom", label: "Custom" },
];
const DAYS = { year: 365, month: 30, week: 7 } as const;
const SKELETON_ROWS: null[] = Array.from({ length: 5 }, () => null);

// same locale the date picker uses, so both show dates the same way
function formatDay(day: Date): string {
  return day.toLocaleDateString(navigator.language, { dateStyle: "medium" });
}

@Component({
  selector: "app-leaderboard-page",
  imports: [
    MatTableModule,
    MatChipListbox,
    MatChipOption,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    PercentPipe,
    CurrencyPipe,
  ],
  templateUrl: "./leaderboard-page.html",
  styleUrl: "./leaderboard-page.scss",
})
export class LeaderboardPage {
  private readonly leaderboardApi = inject(LeaderboardApi);

  protected readonly timeframes = TIMEFRAMES;
  protected readonly columnsToDisplay = ["rank", "trader", "return", "invested", "profit"];
  protected readonly selectedTimeframe = signal<Timeframe>("all");
  protected readonly range = signal<LeaderboardQuery>({ start: undefined, end: undefined });
  protected readonly rangeInvalid = computed(() => {
    const { start, end } = this.range();
    return !!start && !!end && start > end;
  });

  protected readonly rows = signal<(LeaderboardEntry | null)[]>(SKELETON_ROWS);
  // the trading days the backend clamped the requested range to, null while nothing is loaded
  protected readonly window = signal<{ start: string; end: string } | null>(null);
  protected readonly loadFailed: WritableSignal<boolean> = signal(false);
  // counts up per load, so a slow older response can't overwrite a newer one
  private requestId: number = 0;

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    if (this.rangeInvalid()) {
      return;
    }
    const requestId: number = ++this.requestId;
    this.rows.set(SKELETON_ROWS);
    this.window.set(null);
    this.loadFailed.set(false);
    try {
      const leaderboard = await firstValueFrom(this.leaderboardApi.getLeaderboard(this.range()));
      if (requestId === this.requestId) {
        this.rows.set(leaderboard.entries);
        this.window.set({ start: formatDay(leaderboard.start), end: formatDay(leaderboard.end) });
      }
    } catch {
      if (requestId === this.requestId) {
        this.rows.set([]);
        this.loadFailed.set(true);
      }
    }
  }

  onTimeframeChange(change: MatChipListboxChange) {
    const timeframe: Timeframe = change.value;
    this.selectedTimeframe.set(timeframe);
    if (timeframe === "all" || timeframe === "custom") {
      this.range.set({ start: undefined, end: undefined });
    } else {
      this.range.set({ days: DAYS[timeframe] });
    }
    this.load();
  }

  onStartDateChange(change: MatDatepickerInputEvent<Date>) {
    this.range.update((range) => ({ ...range, start: change.value ?? undefined }));
    this.load();
  }

  onEndDateChange(change: MatDatepickerInputEvent<Date>) {
    this.range.update((range) => ({ ...range, end: change.value ?? undefined }));
    this.load();
  }
}
