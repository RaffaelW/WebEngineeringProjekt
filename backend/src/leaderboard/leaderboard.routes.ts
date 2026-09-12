import { Router } from "express";
import z from "zod";
import type { Leaderboard, LeaderboardQuery } from "../../../models/leaderboard.d.ts";
import {
  endDateSchema,
  requireStartBeforeEnd,
  startBeforeEndError,
  startDateSchema,
} from "../lib/validation.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import { getLeaderboard } from "./leaderboard.service.js";

export const router = Router();

const schema = z
  .object({
    start: startDateSchema,
    end: endDateSchema,
  })
  .refine(requireStartBeforeEnd, startBeforeEndError) satisfies z.ZodType<LeaderboardQuery>;

type Schema = z.infer<typeof schema>;

router.route("/").get(validateQuery(schema), async (req, res) => {
  const { start, end } = req.validatedQuery as Schema;
  const leaderboard: Leaderboard = await getLeaderboard(start, end);
  res.json(leaderboard satisfies Leaderboard);
});
