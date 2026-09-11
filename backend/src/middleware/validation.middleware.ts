import { NextFunction, Request, Response } from "express";
import z, { ZodType } from "zod";
import type { ValidationErrorResponse } from "../../../models/api.js";

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ errors: z.treeifyError(result.error) } satisfies ValidationErrorResponse);
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res
        .status(400)
        .json({ errors: z.treeifyError(result.error) } satisfies ValidationErrorResponse);
    }
    req.validatedQuery = result.data as Record<string, unknown>;
    next();
  };
}
