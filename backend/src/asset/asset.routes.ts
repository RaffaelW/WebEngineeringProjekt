import { Router } from "express";
import z from "zod";
import { requireAuth } from "../auth/auth.middleware.js";
import { getAutoCompleteData } from "./asset.service.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import type { AutocompleteAsset, AutocompleteQuery } from "../../../models/asset.js";

export const router = Router();

const autoCompleteSchema = z.object({
  name: z.string().min(1).max(25),
}) satisfies z.ZodType<AutocompleteQuery>;
type AutoCompleteSchema = z.infer<typeof autoCompleteSchema>;

router
  .route("/autocomplete")
  .get(requireAuth, validateQuery(autoCompleteSchema), async (req, res) => {
    const query = req.validatedQuery as AutoCompleteSchema;
    const assets: AutocompleteAsset[] = await getAutoCompleteData(query.name);
    res.status(200).json(assets satisfies AutocompleteAsset[]);
  });
