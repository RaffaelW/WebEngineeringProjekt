import { Component, inject, Signal, signal } from "@angular/core";
import { MatTabsModule } from "@angular/material/tabs";
import { MatToolbarModule } from "@angular/material/toolbar";
import { isActive, Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

type NavLink = {
  path: string;
  label: string;
};

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatTabsModule],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App {
  private readonly router: Router = inject(Router);

  protected readonly onAuthPage: Signal<boolean> = isActive("/auth", this.router);
  protected readonly title: Signal<string> = signal("FinanzVisu");

  // One tab per top-level route in app.routes.ts.
  protected readonly links: NavLink[] = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/leaderboard", label: "Leaderboard" },
    { path: "/settings", label: "Settings" },
  ];
}
