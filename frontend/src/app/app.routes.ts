import { Routes } from "@angular/router";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "dashboard" },
  {
    path: "auth",
    title: "Login – FinanzVisu",
    loadComponent: () => import("./pages/auth-page/auth-page").then((m) => m.AuthPage),
  },
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
    loadComponent: () => import("./pages/settings-page/settings-page").then((m) => m.SettingsPage),
  },
  { path: "**", redirectTo: "dashboard" },
];
