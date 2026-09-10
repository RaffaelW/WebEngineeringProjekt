import { Router } from "express";
import z from "zod";
import { endOfDay, startOfDay } from "../lib/date.js";
import { validateQuery } from "../middleware/validation.middleware.js";
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
  const { start, end } = req.query as Schema;
  const leaderboard = await getLeaderboard(start, end);
  res.json(leaderboard);
});
