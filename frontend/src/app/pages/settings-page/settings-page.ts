import { HttpErrorResponse } from "@angular/common/http";
import { Component, inject, signal, WritableSignal } from "@angular/core";
import {
  FieldTree,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
  TreeValidationResult,
  validate,
} from "@angular/forms/signals";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDialog } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import type { ApiMessage } from "../../../../../models/api.d.ts";
import { AuthApi } from "../../services/auth-api";
import { AuthState } from "../../services/auth-state";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

interface UsernameModel {
  name: string;
}

interface PasswordModel {
  password: string;
  confirmPassword: string;
}

@Component({
  selector: "app-settings-page",
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: "./settings-page.html",
  styleUrl: "./settings-page.scss",
})
export class SettingsPage {
  private readonly authApi: AuthApi = inject(AuthApi);
  private readonly authState: AuthState = inject(AuthState);
  private readonly router: Router = inject(Router);
  private readonly dialog: MatDialog = inject(MatDialog);

  protected readonly usernameSuccess = signal<string | null>(null);
  protected readonly passwordSuccess = signal<string | null>(null);
  protected readonly accountError = signal<string | null>(null);
  // Disables the account buttons while a logout or delete request is in flight.
  protected readonly accountPending = signal<boolean>(false);

  private readonly usernameModel: WritableSignal<UsernameModel> = signal<UsernameModel>({
    name: this.authState.user()?.name ?? "",
  });

  // Mirrors the zod schema in backend/src/auth/auth.routes.ts.
  protected readonly usernameForm: FieldTree<UsernameModel> = form(
    this.usernameModel,
    (schema) => {
      required(schema.name, { message: "Username is required" });
      minLength(schema.name, 2, { message: "At least 2 characters" });
      maxLength(schema.name, 100, { message: "At most 100 characters" });
    },
    { submission: { action: (fieldTree) => this.submitUsername(fieldTree) } },
  );

  private readonly passwordModel: WritableSignal<PasswordModel> = signal<PasswordModel>({
    password: "",
    confirmPassword: "",
  });

  protected readonly passwordForm: FieldTree<PasswordModel> = form(
    this.passwordModel,
    (schema) => {
      required(schema.password, { message: "Password is required" });
      minLength(schema.password, 8, { message: "At least 8 characters" });
      maxLength(schema.password, 100, { message: "At most 100 characters" });

      required(schema.confirmPassword, { message: "Please repeat the password" });
      validate(schema.confirmPassword, ({ value, valueOf }) => {
        const passwordsMatch = value() === valueOf(schema.password);
        if (passwordsMatch) return undefined;
        return { kind: "mismatch", message: "Passwords do not match" };
      });
    },
    { submission: { action: (fieldTree) => this.submitPassword(fieldTree) } },
  );

  protected async submitUsername(
    fieldTree: FieldTree<UsernameModel>,
  ): Promise<TreeValidationResult> {
    this.usernameSuccess.set(null);
    const { name } = fieldTree().value();

    try {
      await this.authState.updateUsername(name);
      this.usernameSuccess.set("Username updated");
      return undefined;
    } catch (err: unknown) {
      //409 handled as error to the name field, all other errors are handled as error to the form
      // this way it can be display
      const nameTaken = err instanceof HttpErrorResponse && err.status === 409;
      return {
        kind: "server",
        message: this.errorMessage(err),
        fieldTree: nameTaken ? fieldTree.name : fieldTree,
      };
    }
  }

  protected async submitPassword(
    fieldTree: FieldTree<PasswordModel>,
  ): Promise<TreeValidationResult> {
    this.passwordSuccess.set(null);
    const { password } = fieldTree().value();

    try {
      await firstValueFrom(this.authApi.update({ password }));
      // password unsuccessfully updated, return error
    } catch (err: unknown) {
      return { kind: "server", message: this.errorMessage(err), fieldTree };
    }
    // password successfully updated, reset form and show success message
    this.passwordModel.set({ password: "", confirmPassword: "" });
    fieldTree().reset();
    this.passwordSuccess.set("Password updated");
    return undefined;
  }

  protected async logout(): Promise<void> {
    this.accountError.set(null);
    this.accountPending.set(true);

    try {
      await this.authState.logout();
      await this.router.navigateByUrl("/auth");
    } catch (err: unknown) {
      this.accountError.set(this.errorMessage(err));
    } finally {
      this.accountPending.set(false);
    }
  }

  protected async deleteAccount(): Promise<void> {
    const confirmed = await this.confirmDeletion();
    if (!confirmed) {
      return;
    }

    this.accountError.set(null);
    this.accountPending.set(true);

    try {
      await this.authState.deleteAccount();
      await this.router.navigateByUrl("/auth");
    } catch (err: unknown) {
      this.accountError.set(this.errorMessage(err));
    } finally {
      this.accountPending.set(false);
    }
  }

  private errorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body: ApiMessage = err.error;
      if (body?.message) {
        return body.message;
      }
    }
    return "Something went wrong, please try again.";
  }

  private async confirmDeletion(): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmDeleteDialog);
    return (await firstValueFrom(dialogRef.afterClosed())) ?? false;
  }
}
