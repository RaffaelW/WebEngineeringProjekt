import { Router } from "express";
import z from "zod";
import { requireAuth } from "../auth/auth.middleware.js";
import { RangeError, getHistory } from "./history.service.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import { GateWayError, TickerNotFoundError } from "../lib/alpaca.js";
import { timeFrameKeys } from "../lib/timeframe.js";
import { endOfDay, startOfDay } from "../lib/date.js";

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

router.route("/").get(requireAuth, validateQuery(historySchema), async (req, res) => {
  try {
    const { ticker, start, end, timeframe } = req.query as unknown as z.infer<typeof historySchema>;
    const bars = await getHistory(ticker, timeframe, start, end);
    res.status(200).json(bars);
  } catch (error) {
    if (error instanceof TickerNotFoundError) {
      console.error("Asset not found", error);
      return res.status(404).json({ message: "Asset not found" });
    }

    if (error instanceof RangeError) {
      console.error("Invalid range for timeframe", error);
      return res.status(400).json({ message: error.message });
    }

    if (error instanceof GateWayError) {
      console.error("Failed to fetch historical data from upstream", error);
      return res.status(502).json({ message: "Failed to fetch historical data from upstream" });
    }

    console.error("Failed to load historical data", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
