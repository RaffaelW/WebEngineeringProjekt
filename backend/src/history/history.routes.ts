import { Router } from "express";
import z from "zod";
import { requireAuth } from "../auth/auth.middleware.js";
import { TickerNotFoundError, TimeFrameKey, getHistory, timeFrames } from "./history.service.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import { DateError } from "../lib/date.js";
import { GateWayError } from "../lib/alpaca.js";

export const router = Router();

const historySchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(10)
    .transform((s) => s.toUpperCase()),
  start: z.iso.date().transform((s) => new Date(s)),
  end: z.iso.date().transform((s) => new Date(s)),
  timeframe: z.enum(Object.keys(timeFrames) as [TimeFrameKey]),
});

router.route("/").get(requireAuth, validateQuery(historySchema), async (req, res) => {
  try {
    const { ticker, start, end, timeframe } = req.query as unknown as z.infer<typeof historySchema>;
    const bars = await getHistory(ticker, timeframe, start, end);
    res.status(200).json(bars);
  } catch (error) {
    if (error instanceof TickerNotFoundError) {
      return res.status(404).json({ message: "Asset not found" });
    }

    if (error instanceof DateError) {
      return res.status(400).json({ message: error.message });
    }

    if (error instanceof GateWayError) {
      return res.status(502).json({ message: "Failed to fetch historical data from upstream" });
    }

    console.error("Failed to load historical data", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
