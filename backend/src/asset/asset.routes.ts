import { Router } from "express";
import z from "zod";
import { requireAuth } from "../auth/auth.middleware.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import { AutoCompleteType, getAutoCompleteData } from "./asset.service.js";

export const router = Router();

const autoCompleteSchema = z.object({
  name: z.string().min(1).max(25),
});

type AutoCompleteQuery = z.infer<typeof autoCompleteSchema>;

router
  .route("/autocomplete")
  .get(requireAuth, validateQuery(autoCompleteSchema), async (req, res) => {
    const query = req.validatedQuery as AutoCompleteQuery;
    const assets: AutoCompleteType[] = await getAutoCompleteData(query.name);
    res.status(200).json(assets);
  });
