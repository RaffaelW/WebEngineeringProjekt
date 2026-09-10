import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { router as assetRouter } from "./asset/asset.routes.js";
import { populateAssetTable } from "./asset/asset.service.js";
import { storeToken } from "./auth/auth.middleware.js";
import { router as authRouter } from "./auth/auth.routes.js";
import { router as historyRouter } from "./history/history.routes.js";
import { router as leaderboardRouter } from "./leaderboard/leaderboard.routes.js";
import { router as portfolioRouter } from "./portfolio/portfolio.routes.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(storeToken);

app.use("/api/auth", authRouter);
app.use("/api/assets", assetRouter);
app.use("/api/history", historyRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/portfolio", portfolioRouter);

try {
  await populateAssetTable();
  console.log("Asset table ready");
} catch (error: unknown) {
  console.error("Failed to populate asset table on startup", error);
  throw error;
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
