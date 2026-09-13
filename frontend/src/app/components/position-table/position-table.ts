import { CurrencyPipe, DecimalPipe, PercentPipe } from "@angular/common";
import { Component, computed, input, InputSignal, Signal } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { PositionTableData } from "../../pages/dashboard-page/dashboard-page";

@Component({
  selector: "position-table",
  imports: [
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    CurrencyPipe,
    DecimalPipe,
    PercentPipe,
  ],
  templateUrl: "./position-table.html",
  styleUrl: "./position-table.scss",
})
export class PositionTable {
  readonly data: InputSignal<PositionTableData> = input.required<PositionTableData>();

  protected readonly active: Signal<boolean> = computed(() => this.data().status === "active");
}
