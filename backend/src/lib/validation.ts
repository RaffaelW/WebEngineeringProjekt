/**
 * Shared zod validation schemas
 */

import z from "zod";
import { endOfDay, startOfDay } from "./date.js";

export const requireStartBeforeEnd = (range: { start?: Date; end?: Date }) => {
  return !range.start || !range.end || range.start <= range.end;
};
export const startBeforeEndError = { message: "start must not be after end", path: ["start"] };

export const tickerSchema = z
  .string()
  .min(1)
  .max(10)
  .transform((s: string) => s.toUpperCase());

export const startDateSchema = z.iso
  .date()
  .transform((s: string) => startOfDay(new Date(s)))
  .optional();

export const endDateSchema = z.iso
  .date()
  .transform((s: string) => endOfDay(new Date(s)))
  .optional();
