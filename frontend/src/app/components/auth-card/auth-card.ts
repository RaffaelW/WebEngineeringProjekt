import { Component, input, InputSignal } from "@angular/core";
import { FieldTree, FormField, FormRoot } from "@angular/forms/signals";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { AuthFormModel, AuthMode } from "../../pages/auth-page/auth-page";

@Component({
  selector: "auth-card",
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: "./auth-card.html",
  styleUrl: "./auth-card.scss",
})
export class AuthCard {
  readonly mode: InputSignal<AuthMode> = input.required<AuthMode>();
  readonly authForm: InputSignal<FieldTree<AuthFormModel>> =
    input.required<FieldTree<AuthFormModel>>();
}
