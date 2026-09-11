import { Router } from "express";
import z from "zod";
import { requireAuth } from "../auth/auth.middleware.js";
import { endOfDay, startOfDay } from "../lib/date.js";
import type { AssetHistory, HistoryQuery } from "../../../models/history.d.ts";
import { timeFrameKeys } from "../lib/timeframe.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import type { HistoryWindow } from "../models/history.d.ts";
import { getHistory, resolveHistoryWindow } from "./history.service.js";

export const router = Router();

const historySchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(10)
    .transform((s: string) => s.toUpperCase()),
  start: z.iso
    .date()
    .transform((s: string) => startOfDay(new Date(s)))
    .optional(),
  end: z.iso
    .date()
    .transform((s: string) => endOfDay(new Date(s)))
    .optional(),
  timeframe: z.enum(timeFrameKeys),
}) satisfies z.ZodType<HistoryQuery>;
type HistorySchema = z.infer<typeof historySchema>;

router.route("/").get(requireAuth, validateQuery(historySchema), async (req, res) => {
  const { ticker, start, end, timeframe } = req.validatedQuery as HistorySchema;
  const window: HistoryWindow = resolveHistoryWindow(timeframe, start, end);
  const bars: AssetHistory[] = await getHistory(ticker, timeframe, window.start, window.end);
  res.status(200).json(bars satisfies AssetHistory[]);
});
