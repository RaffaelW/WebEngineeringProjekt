import { Component, computed, input, InputSignal, Signal } from "@angular/core";

@Component({
  selector: "app-avatar",
  imports: [],
  templateUrl: "./avatar.html",
  styleUrl: "./avatar.scss",
})
export class Avatar {
  readonly name: InputSignal<string> = input.required<string>();
  readonly label: InputSignal<string> = input<string>("User avatar");
  readonly button: InputSignal<boolean> = input(true);

  protected readonly initial: Signal<string> = computed(() => this.name().charAt(0).toUpperCase());
}
