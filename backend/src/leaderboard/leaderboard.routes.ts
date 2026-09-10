import { Router } from "express";
import z from "zod";
import { GateWayError, NoMarketDataError } from "../lib/alpaca.js";
import { DateError, endOfDay, startOfDay } from "../lib/date.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import { HoldingError } from "../portfolio/portfolio.service.js";
import { getLeaderboard } from "./leaderboard.service.js";

export const router = Router();

const schema = z
  .object({
    start: z.iso
      .date()
      .transform((s: string) => startOfDay(new Date(s)))
      .optional(),
    end: z.iso
      .date()
      .transform((s: string) => endOfDay(new Date(s)))
      .optional(),
  })
  .refine((range) => !range.start || !range.end || range.start <= range.end, {
    message: "start must not be after end",
    path: ["start"],
  });

type Schema = z.infer<typeof schema>;

router.route("/").get(validateQuery(schema), async (req, res) => {
  try {
    const { start, end } = req.query as Schema;
    const leaderboard = await getLeaderboard(start, end);
    res.json(leaderboard);
  } catch (error) {
    // a non tradeable end, an end without market data, or an orderbook that sells more than it holds
    if (
      error instanceof DateError ||
      error instanceof NoMarketDataError ||
      error instanceof HoldingError
    ) {
      return res.status(400).json({ message: error.message });
    }

    if (error instanceof GateWayError) {
      console.error("Failed to fetch market data from upstream", error);
      return res.status(502).json({ message: "Failed to fetch market data from upstream" });
    }

    console.error("Failed to calculate portfolio stats", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
