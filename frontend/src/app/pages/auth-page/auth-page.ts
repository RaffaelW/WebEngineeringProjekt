import { HttpErrorResponse } from "@angular/common/http";
import { Component, inject, signal, WritableSignal } from "@angular/core";
import {
  FieldTree,
  form,
  hidden,
  maxLength,
  minLength,
  required,
  TreeValidationResult,
  validate,
} from "@angular/forms/signals";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import type { ApiMessage } from "../../../../../models/api.d.ts";
import { AuthCard } from "../../components/auth-card/auth-card";
import { AuthApi } from "../../services/auth-api";
import type { AuthCredentials } from "../../../../../models/auth.d.ts";

export type AuthMode = "login" | "register";

export interface AuthFormModel extends AuthCredentials {
  confirmPassword: string;
}

@Component({
  selector: "app-auth-page",
  imports: [AuthCard, MatButtonToggleModule],
  templateUrl: "./auth-page.html",
  styleUrl: "./auth-page.scss",
})
export class AuthPage {
  private readonly authApi: AuthApi = inject(AuthApi);
  private readonly router: Router = inject(Router);

  protected readonly mode: WritableSignal<AuthMode> = signal<AuthMode>("login");

  private readonly model: WritableSignal<AuthFormModel> = signal<AuthFormModel>({
    name: "",
    password: "",
    confirmPassword: "",
  });

  // Mirrors the zod schema in backend/src/auth/auth.routes.ts.
  protected readonly authForm: FieldTree<AuthFormModel> = form(
    this.model,
    (schema) => {
      required(schema.name, { message: "Username is required" });
      minLength(schema.name, 2, { message: "At least 2 characters" });
      maxLength(schema.name, 100, { message: "At most 100 characters" });

      required(schema.password, { message: "Password is required" });
      minLength(schema.password, 8, { message: "At least 8 characters" });
      maxLength(schema.password, 100, { message: "At most 100 characters" });

      // Only relevant when registering
      hidden(schema.confirmPassword, { when: () => this.mode() === "login" });
      required(schema.confirmPassword, { message: "Please repeat the password" });
      validate(schema.confirmPassword, ({ value, valueOf }) => {
        // function is called on every change,
        // value() is signal of the confirmPassword field,
        // valueOf() reads value at path
        const passwordsMatch = value() === valueOf(schema.password);
        if (passwordsMatch) return undefined;
        return { kind: "mismatch", message: "Passwords do not match" };
      });
    },
    { submission: { action: (fieldTree: FieldTree<AuthFormModel>) => this.submit(fieldTree) } },
  );

  protected switchMode(mode: AuthMode): void {
    this.mode.set(mode);
    // Drop touched state and errors but keeps the values
    this.authForm().reset();
  }

  // The backend sets the auth cookie on both routes, so success always goes straight to the dashboard.
  private async submit(fieldTree: FieldTree<AuthFormModel>): Promise<TreeValidationResult> {
    const { name, password } = fieldTree().value();
    const request =
      this.mode() === "login"
        ? this.authApi.login({ name, password })
        : this.authApi.register({ name, password });

    try {
      // turns the Observable into a Promise that unsubscribes with the first emitted value
      await firstValueFrom(request);
      await this.router.navigateByUrl("/dashboard");
      return undefined;
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 409)) {
        // 409 (name taken) belongs to the username field
        // 401 (bad credentials) to the form.
        const body: ApiMessage = err.error;
        return {
          kind: "server",
          message: body.message,
          fieldTree: err.status === 409 ? fieldTree.name : fieldTree,
        };
      }
      throw err;
    }
  }
}
