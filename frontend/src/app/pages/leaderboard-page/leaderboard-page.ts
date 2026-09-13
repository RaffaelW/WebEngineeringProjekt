import { CurrencyPipe, PercentPipe } from "@angular/common";
import { Component, computed, DestroyRef, inject, OnInit, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatChipListbox, MatChipListboxChange, MatChipOption } from "@angular/material/chips";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatDatepickerInputEvent, MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatTableModule } from "@angular/material/table";
import { BehaviorSubject, switchMap } from "rxjs";
import { LeaderboardEntry, LeaderboardQuery } from "../../../../../models/leaderboard";
import { LeaderboardApi } from "../../services/leaderboard-api";

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
  providers: [provideNativeDateAdapter()],
  templateUrl: "./leaderboard-page.html",
  styleUrl: "./leaderboard-page.scss",
})
export class LeaderboardPage implements OnInit {
  private readonly leaderboardApi = inject(LeaderboardApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly skeletonRows = Array.from({ length: 5 }, () => null);
  protected readonly columnsToDisplay = ["rank", "trader", "return", "invested", "profit"];
  protected readonly selectedTimeframe = signal<"all" | "year" | "month" | "week" | "custom">(
    "all",
  );

  private readonly customStartSignal = signal<Date | undefined>(this.daysAgo(30));
  private readonly customEndSignal = signal<Date | undefined>(new Date());

  protected readonly customStart = this.customStartSignal.asReadonly();
  protected readonly customEnd = this.customEndSignal.asReadonly();
  protected readonly customRangeInvalid = computed(() => {
    const start = this.customStartSignal();
    const end = this.customEndSignal();
    return !!start && !!end && start > end;
  });

  protected readonly rows = signal<(LeaderboardEntry | null)[]>(this.skeletonRows);
  // whole timeframe is the default, doesn't need to set explicitly
  private readonly timeframe = new BehaviorSubject<LeaderboardQuery>({
    start: undefined,
    end: undefined,
  });

  ngOnInit() {
    this.timeframe
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((query) => {
          // switch to loading state while the data is loading
          this.rows.set(this.skeletonRows);
          return this.leaderboardApi.getLeaderboard(query);
        }),
      )
      .subscribe({
        next: (data) => this.rows.set(data),
        error: () => this.rows.set([]),
      });
  }

  onTimeframeChange(change: MatChipListboxChange) {
    this.selectedTimeframe.set(change.value);
    if (change.value === "all") {
      return this.timeframe.next({ start: undefined, end: undefined });
    }

    if (change.value === "custom") {
      return this.emitCustomRange();
    }

    const days = {
      year: 365,
      month: 30,
      week: 7,
    };
    const timeWindowMillis = days[change.value as "year" | "month" | "week"] * 24 * 60 * 60 * 1000;

    this.timeframe.next({
      start: new Date(Date.now() - timeWindowMillis),
      end: new Date(),
    });
  }

  onStartDateChange(change: MatDatepickerInputEvent<Date>) {
    if (change.value) {
      this.customStartSignal.set(change.value);
      this.emitCustomRange();
    }
  }

  onEndDateChange(change: MatDatepickerInputEvent<Date>) {
    if (change.value) {
      this.customEndSignal.set(change.value);
      this.emitCustomRange();
    }
  }

  private emitCustomRange() {
    const start = this.customStartSignal();
    const end = this.customEndSignal();
    if (!start || !end || start > end) {
      return;
    }
    this.timeframe.next({ start, end });
  }

  private daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
}
