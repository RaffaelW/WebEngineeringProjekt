import { Routes } from "@angular/router";
import { authGuard, userGuard } from "./guards/auth-guard";

export const routes: Routes = [
  // redirect root to /dashboard
  { path: "", pathMatch: "full", redirectTo: "dashboard" },
  {
    path: "auth",
    title: "Login – FinanzVisu",
    canActivate: [userGuard],
    loadComponent: () => import("./pages/auth-page/auth-page").then((m) => m.AuthPage),
  },
  // Every page below requires a signed in user, the guard redirects to /auth otherwise.
  // Grouping adds no path segment
  {
    path: "",
    canActivateChild: [authGuard],
    children: [
      {
        path: "dashboard",
        title: "Dashboard – FinanzVisu",
        loadComponent: () =>
          import("./pages/dashboard-page/dashboard-page").then((m) => m.DashboardPage),
      },
      {
        path: "leaderboard",
        title: "Leaderboard – FinanzVisu",
        loadComponent: () =>
          import("./pages/leaderboard-page/leaderboard-page").then((m) => m.LeaderboardPage),
      },
      {
        path: "settings",
        title: "Settings – FinanzVisu",
        loadComponent: () =>
          import("./pages/settings-page/settings-page").then((m) => m.SettingsPage),
      },
    ],
  },
  // Catch-all route, redirects to /dashboard
  { path: "**", redirectTo: "dashboard" },
];
