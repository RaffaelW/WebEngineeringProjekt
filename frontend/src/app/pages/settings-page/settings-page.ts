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
} from "@angular/forms/signals";
import { MatDialog } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import type { ApiMessage } from "../../../../../models/api.d.ts";
import { AuthApi } from "../../services/auth-api";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

interface UsernameModel {
  name: string;
}

interface PasswordModel {
  password: string;
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
  private readonly router: Router = inject(Router);
  private readonly dialog: MatDialog = inject(MatDialog);

  protected readonly usernameSuccess = signal<string | null>(null);
  protected readonly passwordSuccess = signal<string | null>(null);

  private readonly usernameModel: WritableSignal<UsernameModel> = signal<UsernameModel>({
    name: "",
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
  });

  protected readonly passwordForm: FieldTree<PasswordModel> = form(
    this.passwordModel,
    (schema) => {
      required(schema.password, { message: "Password is required" });
      minLength(schema.password, 8, { message: "At least 8 characters" });
      maxLength(schema.password, 100, { message: "At most 100 characters" });
    },
    { submission: { action: (fieldTree) => this.submitPassword(fieldTree) } },
  );

  protected async submitUsername(
    fieldTree: FieldTree<UsernameModel>,
  ): Promise<TreeValidationResult> {
    this.usernameSuccess.set(null);
    const { name } = fieldTree().value();

    try {
      await firstValueFrom(this.authApi.update({ name }));
      this.usernameSuccess.set("Username updated");
      return undefined;
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        const body: ApiMessage = err.error;
        return { kind: "server", message: body.message, fieldTree: fieldTree.name };
      }
      throw err;
    }
  }

  protected async submitPassword(
    fieldTree: FieldTree<PasswordModel>,
  ): Promise<TreeValidationResult> {
    this.passwordSuccess.set(null);
    const { password } = fieldTree().value();

    await firstValueFrom(this.authApi.update({ password }));
    this.passwordSuccess.set("Password updated");
    return undefined;
  }

  protected async logout(): Promise<void> {
    try {
      await firstValueFrom(this.authApi.logout());
    } finally {
      await this.router.navigateByUrl("/auth");
    }
  }

  protected async deleteAccount(): Promise<void> {
    const confirmed = await this.confirmDeletion();
    if (!confirmed) {
      return;
    }

    try {
      await firstValueFrom(this.authApi.delete());
    } finally {
      await this.router.navigateByUrl("/auth");
    }
  }

  private async confirmDeletion(): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmDeleteDialog);
    return (await firstValueFrom(dialogRef.afterClosed())) ?? false;
  }
}
