import { CurrencyPipe, PercentPipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatChipListbox, MatChipListboxChange, MatChipOption } from "@angular/material/chips";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatDatepickerInputEvent, MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatTableModule } from "@angular/material/table";
import { BehaviorSubject, catchError, EMPTY, switchMap } from "rxjs";
import type {
  ApiMessage,
  ValidationErrorResponse,
  ValidationErrorTree,
} from "../../../../../models/api";
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
  private readonly chipListbox = viewChild(MatChipListbox);

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
  protected readonly errorMessage = signal<string | null>(null);
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
          this.errorMessage.set(null);
          return this.leaderboardApi.getLeaderboard(query).pipe(
            catchError((error: unknown) => {
              this.rows.set([]);
              this.errorMessage.set(this.describeError(error));
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe({
        next: (data) => {
          this.errorMessage.set(null);
          this.rows.set(data);
        },
      });
  }

  onTimeframeChange(change: MatChipListboxChange) {
    if (change.value === undefined) {
      // a deselect must never clear the selection, snap the chip back to the current timeframe
      this.chipListbox()?.writeValue(this.selectedTimeframe());
      return;
    }

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

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      const body = error.error as Partial<ApiMessage & ValidationErrorResponse>;
      if (body.message) {
        return body.message;
      }
      const issues: string[] = this.flattenErrorIssues(body.errors);
      if (issues.length > 0) {
        return issues.join(", ");
      }
      return "Invalid date range.";
    }
    return "Could not load the leaderboard.";
  }

  private flattenErrorIssues(
    tree: ValidationErrorTree | undefined,
    issues: string[] = [],
  ): string[] {
    if (!tree) {
      return issues;
    }
    issues.push(...(tree.errors ?? []));
    for (const child of Object.values(tree.properties ?? {})) {
      this.flattenErrorIssues(child, issues);
    }
    for (const child of tree.items ?? []) {
      this.flattenErrorIssues(child, issues);
    }
    return issues;
  }
}
