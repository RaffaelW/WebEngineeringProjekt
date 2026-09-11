import { Router } from "express";
import z from "zod";
import { requireAuth } from "../auth/auth.middleware.js";
import { endOfDay, startOfDay } from "../lib/date.js";
import type { AssetHistory } from "../../../models/history.js";
import { timeFrameKeys } from "../lib/timeframe.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import { getHistory } from "./history.service.js";

export const router = Router();

const historySchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(10)
    .transform((s: string) => s.toUpperCase()),
  start: z.iso.date().transform((s: string) => startOfDay(new Date(s))),
  end: z.iso.date().transform((s: string) => endOfDay(new Date(s))),
  timeframe: z.enum(timeFrameKeys),
});
type HistoryQuery = z.infer<typeof historySchema>;

router.route("/").get(requireAuth, validateQuery(historySchema), async (req, res) => {
  const { ticker, start, end, timeframe } = req.validatedQuery as HistoryQuery;
  const bars: AssetHistory[] = await getHistory(ticker, timeframe, start, end);
  res.status(200).json(bars satisfies AssetHistory[]);
});
