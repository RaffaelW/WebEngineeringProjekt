import { Component, inject, Signal, signal, WritableSignal } from "@angular/core";
import { MatDividerModule } from "@angular/material/divider";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatToolbarModule } from "@angular/material/toolbar";
import { isActive, Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import type { SessionUser } from "../../../models/auth.d.ts";
import { Avatar } from "./components/avatar/avatar";
import { AuthState } from "./services/auth-state";

type NavLink = {
  path: string;
  label: string;
};

@Component({
  selector: "app-root",
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Avatar,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    MatToolbarModule,
  ],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App {
  private readonly router: Router = inject(Router);
  private readonly authState: AuthState = inject(AuthState);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);

  protected readonly onAuthPage: Signal<boolean> = isActive("/auth", this.router);
  protected readonly title: Signal<string> = signal("FinanzVisu");
  protected readonly user: Signal<SessionUser | null> = this.authState.user;

  // One link per top-level route in app.routes.ts.
  protected readonly links: NavLink[] = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/leaderboard", label: "Leaderboard" },
  ];

  protected readonly loggingOut: WritableSignal<boolean> = signal(false);

  protected async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    try {
      await this.authState.logout();
      this.router.navigate(["/auth"]);
    } catch {
      this.snackBar.open("Could not log out. Please try again.", "Dismiss");
    } finally {
      this.loggingOut.set(false);
    }
  }
}
