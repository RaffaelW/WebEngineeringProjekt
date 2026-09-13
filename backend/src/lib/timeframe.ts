import { values } from "@alpacahq/alpaca-trade-api";
import { TimeFrame } from "@prisma/client";
import type { TimeFrameKey } from "../../../models/history.d.ts";
import { TimeFrameRange, timeFrameRanges } from "../../../lib/timeframe.js";

export * from "../../../lib/timeframe.js";

export interface TimeFrameSpec extends TimeFrameRange {
  alpaca: values.TimeFrameString;
  prisma: TimeFrame;
}

/**
 * Single source of truth for everything a timeframe implies
 */
export const timeFrames: Record<TimeFrameKey, TimeFrameSpec> = {
  "1min": {
    ...timeFrameRanges["1min"],
    alpaca: values.TimeFrame.Minute,
    prisma: TimeFrame.min1,
  },
  "1h": {
    ...timeFrameRanges["1h"],
    alpaca: values.TimeFrame.Hour,
    prisma: TimeFrame.h1,
  },
  "1d": {
    ...timeFrameRanges["1d"],
    alpaca: values.TimeFrame.Day,
    prisma: TimeFrame.d1,
  },
  "1w": {
    ...timeFrameRanges["1w"],
    alpaca: values.TimeFrame.Week,
    prisma: TimeFrame.w1,
  },
  "1mo": {
    ...timeFrameRanges["1mo"],
    alpaca: values.TimeFrame.Month,
    prisma: TimeFrame.mo1,
  },
};
