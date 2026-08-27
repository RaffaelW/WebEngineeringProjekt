import { Router } from "express";
import { getOrderBook, Orderbook } from "./portfolio.service.js";
import { requireAuth } from "../auth/auth.middleware.js";

export const router = Router();

/**
 * Returns every transaction every made in ascending order of one user
 */
router.route("/orderbook").get(requireAuth, async (req, res) => {
  const orderbook: Orderbook = await getOrderBook(req.user!.id);
  res.status(200).json(orderbook);
});
