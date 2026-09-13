import { DatePipe, DecimalPipe } from "@angular/common";
import { Component, input, InputSignal } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { OrderbookData } from "../../pages/dashboard-page/dashboard-page";

@Component({
  selector: "transaction-list",
  imports: [MatCardModule, MatIconModule, MatProgressBarModule, DatePipe, DecimalPipe],
  templateUrl: "./transaction-list.html",
  styleUrl: "./transaction-list.scss",
})
export class TransactionList {
  readonly data: InputSignal<OrderbookData> = input.required<OrderbookData>();
}
