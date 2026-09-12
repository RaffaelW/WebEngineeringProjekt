import { Router } from "express";
import z from "zod";
import type { AssetHistory, HistoryQuery } from "../../../models/history.d.ts";
import { requireAuth } from "../auth/auth.middleware.js";
import { timeFrameKeys } from "../lib/timeframe.js";
import { endDateSchema, startDateSchema, tickerSchema } from "../lib/validation.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import type { HistoryWindow } from "../models/history.d.ts";
import { getHistory, resolveHistoryWindow } from "./history.service.js";

export const router = Router();

const historySchema = z.object({
  ticker: tickerSchema,
  start: startDateSchema,
  end: endDateSchema,
  timeframe: z.enum(timeFrameKeys),
}) satisfies z.ZodType<HistoryQuery>;
type HistorySchema = z.infer<typeof historySchema>;

router.route("/").get(requireAuth, validateQuery(historySchema), async (req, res) => {
  const { ticker, start, end, timeframe } = req.validatedQuery as HistorySchema;
  const window: HistoryWindow = resolveHistoryWindow(timeframe, start, end);
  const bars: AssetHistory[] = await getHistory(ticker, timeframe, window.start, window.end);
  res.status(200).json(bars satisfies AssetHistory[]);
});
