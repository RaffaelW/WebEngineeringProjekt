import {
  Component,
  inject,
  input,
  InputSignal,
  model,
  ModelSignal,
  output,
  OutputEmitterRef,
  Signal,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatCardModule } from "@angular/material/card";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatTimepickerModule } from "@dhutaryan/ngx-mat-timepicker";
import { catchError, debounceTime, map, Observable, of, switchMap } from "rxjs";
import type { AutocompleteAsset } from "../../../../../models/asset.d.ts";
import type {
  TransactionAreaConfig,
  TransactionSelection,
} from "../../pages/dashboard-page/dashboard-page";
import { AssetApi } from "../../services/asset-api";

@Component({
  selector: "transaction-area",
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: "./transaction-area.html",
  styleUrl: "./transaction-area.scss",
})
export class TransactionArea {
  private readonly SEARCH_DEBOUNCE_MS: number = 300;

  private readonly assetApi: AssetApi = inject(AssetApi);

  // owned by the parent page, edited here
  readonly selection: ModelSignal<TransactionSelection> = model.required<TransactionSelection>();

  readonly config: InputSignal<TransactionAreaConfig> = input.required<TransactionAreaConfig>();

  // fired when the user confirms the transaction
  readonly submit: OutputEmitterRef<void> = output<void>();

  // holds either the typed text or the selected asset
  protected readonly assetControl = new FormControl<string | AutocompleteAsset>("", {
    nonNullable: true,
  });

  // autocomplete suggestions for the text the user is typing:
  protected readonly options: Signal<AutocompleteAsset[]> = toSignal(
    this.assetControl.valueChanges.pipe(
      map((value) => this.toSearchQuery(value)),
      debounceTime(this.SEARCH_DEBOUNCE_MS),
      // if asset selected return empty array as suggestion
      switchMap((query) => this.fetchSuggestions(query)),
    ),
    // empty array of suggestions
    { initialValue: [] },
  );

  private toSearchQuery(value: string | AutocompleteAsset): string | AutocompleteAsset {
    // selected asset is not searchable
    if (typeof value !== "string") {
      return value;
    }
    return value.trim().slice(0, this.config().maxQueryLength);
  }

  // an empty query or a failed request show no suggestions
  private fetchSuggestions(query: string | AutocompleteAsset): Observable<AutocompleteAsset[]> {
    // if asset selected no need for suggestions
    if (typeof query !== "string") {
      // returns Observable of empty array
      return of([]);
    }
    return this.assetApi.autocomplete({ name: query }).pipe(catchError(() => of([])));
  }

  protected patch(changes: Partial<TransactionSelection>): void {
    this.selection.update((selection) => ({ ...selection, ...changes }));
  }

  protected displayAsset(value: AutocompleteAsset | string): string {
    return typeof value === "string" ? value : value.name;
  }

  protected onAssetSelected(asset: AutocompleteAsset): void {
    this.patch({ asset });
  }

  protected resetAssetSelected(): void {
    this.patch({ asset: null });
  }

  protected onDateChange(date: Date | null): void {
    if (!date) {
      return;
    }
    const current: Date = this.selection().dateTime;
    this.patch({
      dateTime: new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        current.getHours(),
        current.getMinutes(),
      ),
    });
  }

  protected onTimeChange(time: Date | null): void {
    if (!time) {
      return;
    }
    const current: Date = this.selection().dateTime;
    this.patch({
      dateTime: new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate(),
        time.getHours(),
        time.getMinutes(),
      ),
    });
  }

  protected onSharesChange(value: number): void {
    this.patch({ shares: Number.isFinite(value) ? Math.floor(value) : 0 });
  }

  // the backend only accepts whole, positive share amounts
  protected canSubmit(): boolean {
    const { asset, shares } = this.selection();
    return asset !== null && Number.isInteger(shares) && shares >= 1;
  }

  protected onSubmit(): void {
    this.submit.emit();
    this.selection.set(this.config().defaultSelection());
    this.assetControl.setValue("");
  }
}
