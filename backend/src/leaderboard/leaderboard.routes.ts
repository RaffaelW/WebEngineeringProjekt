import { Router } from "express";
import z from "zod";
import { endOfDay, startOfDay } from "../lib/date.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import { getLeaderboard } from "./leaderboard.service.js";
import type { Leaderboard, LeaderboardQuery } from "../../../models/leaderboard.js";

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
  }) satisfies z.ZodType<LeaderboardQuery>;
type Schema = z.infer<typeof schema>;
router.route("/").get(validateQuery(schema), async (req, res) => {
  const { start, end } = req.validatedQuery as Schema;
  const leaderboard: Leaderboard = await getLeaderboard(start, end);
  res.json(leaderboard satisfies Leaderboard);
});
