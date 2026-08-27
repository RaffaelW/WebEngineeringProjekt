import { Router } from "express";
import z from "zod";
import { getOrderBook, Orderbook } from "./portfolio.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import { endOfDay, startOfDay } from "../lib/date.js";

export const router = Router();

const orderbookSchema = z
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

/**
 * Returns every transaction every made in ascending order of one user,
 * optionally limited to the given range, by default the whole orderbook
 */
router.route("/orderbook").get(requireAuth, validateQuery(orderbookSchema), async (req, res) => {
  const { start, end } = req.query as unknown as z.infer<typeof orderbookSchema>;

  const orderbook: Orderbook = await getOrderBook(req.user!.id, start, end);
  res.status(200).json(orderbook);
});
