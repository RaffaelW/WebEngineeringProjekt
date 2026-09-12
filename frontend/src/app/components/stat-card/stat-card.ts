import { CurrencyPipe, PercentPipe } from "@angular/common";
import { Component, input, InputSignal } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { StatCardData } from "../../pages/dashboard-page/dashboard-page";

@Component({
  selector: "stat-card",
  imports: [MatCardModule, MatIconModule, MatProgressBarModule, CurrencyPipe, PercentPipe],
  templateUrl: "./stat-card.html",
  styleUrl: "./stat-card.scss",
})
export class StatCard {
  readonly data: InputSignal<StatCardData> = input.required<StatCardData>();
  readonly loading: InputSignal<boolean> = input(false);
  readonly error: InputSignal<string | null> = input<string | null>(null);
}
