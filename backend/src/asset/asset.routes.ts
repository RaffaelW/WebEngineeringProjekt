import { Router } from "express";
import z from "zod";
import { requireAuth } from "../auth/auth.middleware.js";
import { AutoCompleteType, getAutoCompleteData, populateAssetTable } from "./asset.service.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import { GateWayError } from "../lib/alpaca.js";

export const router = Router();

const autoCompleteSchema = z.object({
  name: z.string().min(1).max(25),
});

router
  .route("/autocomplete")
  .get(requireAuth, validateQuery(autoCompleteSchema), async (req, res) => {
    try {
      const assets: AutoCompleteType[] = await getAutoCompleteData(req.query.name as string);
      res.status(200).json(assets);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

router.route("/populate").post(requireAuth, async (_req, res) => {
  try {
    await populateAssetTable();
    res.status(200).json({ message: "Asset table populated" });
  } catch (error: unknown) {
    if (error instanceof GateWayError) {
      console.error("Failed to fetch assets from upstream", error);
      return res.status(502).json({ message: "Failed to fetch assets from upstream" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});
