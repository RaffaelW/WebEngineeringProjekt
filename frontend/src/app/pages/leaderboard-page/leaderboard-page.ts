import { CurrencyPipe, PercentPipe } from "@angular/common";
import { Component, DestroyRef, inject, OnInit, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatChipListbox, MatChipListboxChange, MatChipOption } from "@angular/material/chips";
import { MatTableModule } from "@angular/material/table";
import { BehaviorSubject, switchMap } from "rxjs";
import { LeaderboardEntry, LeaderboardQuery } from "../../../../../models/leaderboard";
import { LeaderboardApi } from "../../services/leaderboard-api";

@Component({
  selector: "app-leaderboard-page",
  imports: [MatTableModule, MatChipListbox, MatChipOption, PercentPipe, CurrencyPipe],
  templateUrl: "./leaderboard-page.html",
  styleUrl: "./leaderboard-page.scss",
})
export class LeaderboardPage implements OnInit {
  private readonly leaderboardApi = inject(LeaderboardApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly skeletonRows = Array.from({ length: 5 }, () => null);
  protected readonly columnsToDisplay = ["rank", "trader", "return", "invested", "profit"];

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
    if (change.value === "all") {
      return this.timeframe.next({ start: undefined, end: undefined });
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
}
