import { NextFunction, Request, Response } from "express";
import z, { ZodType } from "zod";

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: z.treeifyError(result.error) });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ errors: z.treeifyError(result.error) });
    }
    req.validatedQuery = result.data as Record<string, unknown>;
    next();
  };
}
