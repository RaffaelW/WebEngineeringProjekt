import {
  Component,
  effect,
  EffectRef,
  output,
  OutputEmitterRef,
  signal,
  WritableSignal,
} from "@angular/core";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";

const MAX_INTERVAL_MINUTES: number = 15;
const DEFAULT_INTERVAL_MINUTES: number = 5;

@Component({
  selector: "reloader",
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: "./reloader.html",
  styleUrl: "./reloader.scss",
})
export class Reloader {
  // fired every time the interval triggers
  readonly tick: OutputEmitterRef<void> = output<void>();

  protected readonly intervalOptions: number[] = Array.from(
    { length: MAX_INTERVAL_MINUTES },
    (_, i) => i + 1,
  );
  protected readonly intervalMinutes: WritableSignal<number> = signal(DEFAULT_INTERVAL_MINUTES);

  // runs once on init and again every time intervalMinutes changes
  private readonly timer: EffectRef = effect((onCleanup) => {
    const intervalId = setInterval(
      () => {
        this.tick.emit();
      },
      this.intervalMinutes() * 60 * 1000,
    );

    // stop the old timer before the next run so the new interval starts from zero
    onCleanup(() => clearInterval(intervalId));
  });
}
