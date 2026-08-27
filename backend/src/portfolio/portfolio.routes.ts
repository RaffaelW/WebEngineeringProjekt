import { Router } from "express";
import z from "zod";
import { getOrderBook, NotATradeDayError, Orderbook, processOrder } from "./portfolio.service.js";
import { TransactionType } from "@prisma/client";
import { requireAuth } from "../auth/auth.middleware.js";
import { validate, validateQuery } from "../middleware/validation.middleware.js";
import { endOfDay, startOfDay } from "../lib/date.js";
import { GateWayError, TickerNotFoundError } from "../lib/alpaca.js";

export const router = Router();

const portfolioSchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(10)
    .transform((s: string) => s.toUpperCase()),
  transactionType: z.enum(TransactionType),
  shares_amount: z.int().positive(),
  time: z.iso.datetime().transform((s) => new Date(s)),
});

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

router.route("/transaction").post(requireAuth, validate(portfolioSchema), async (req, res) => {
  try {
    const order = req.body as z.infer<typeof portfolioSchema>;

    await processOrder(order, req.user!.id);
    res.status(201).json({ message: "Transaction created" });
  } catch (error) {
    if (error instanceof TickerNotFoundError) {
      return res.status(404).json({ message: "Asset not found" });
    }

    if (error instanceof NotATradeDayError) {
      return res.status(400).json({ message: error.message });
    }

    if (error instanceof GateWayError) {
      console.error("Failed to fetch market calendar from upstream", error);
      return res.status(502).json({ message: "Failed to fetch market calendar from upstream" });
    }

    console.error("Failed to process order", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
