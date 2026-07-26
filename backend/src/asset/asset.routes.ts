import { Router } from "express";
import z from "zod";
import { requireAuth } from "../auth/auth.middleware.js";
import { getAutoCompleteData, populateAssetTable } from "./asset.service.js";
import { validateQuery } from "../middleware/validation.middleware.js";

export const router = Router();

const autoCompleteSchema = z.object({
  name: z.string().min(1).max(25),
});

router
  .route("/autocomplete")
  .get(requireAuth, validateQuery(autoCompleteSchema), async (req, res) => {
    const assets = await getAutoCompleteData(req.query.name as string);
    res.status(200).json(assets);
  });

router.route("/populate").post(requireAuth, async (_req, res) => {
  await populateAssetTable();
  res.status(200).json({ message: "Asset table populated" });
});
