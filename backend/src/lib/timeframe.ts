import { TimeFrame } from "@prisma/client";
import { values } from "@alpacahq/alpaca-trade-api";

export type TimeFrameKey = "1min" | "1h" | "1d" | "1w" | "1mo";

const msPerMinute: number = 60 * 1000;
const msPerHour: number = 60 * msPerMinute;
const msPerDay: number = 24 * msPerHour;

export type TimeFrameSpec = {
  alpaca: values.TimeFrameString;
  prisma: TimeFrame;
  min: number;
  max: number;
};

// Single source of truth for everything a timeframe implies
export const timeFrames: Record<TimeFrameKey, TimeFrameSpec> = {
  "1min": {
    alpaca: values.TimeFrame.Minute,
    prisma: TimeFrame.min1,
    min: msPerMinute,
    max: 7 * msPerDay, // 1 minute up to 7 days
  },
  "1h": {
    alpaca: values.TimeFrame.Hour,
    prisma: TimeFrame.h1,
    min: msPerHour,
    max: 30 * msPerDay, // 1 hour up to 30 days
  },
  "1d": {
    alpaca: values.TimeFrame.Day,
    prisma: TimeFrame.d1,
    min: msPerDay,
    max: 3 * 365 * msPerDay, // 1 day up to 3 years
  },
  "1w": {
    alpaca: values.TimeFrame.Week,
    prisma: TimeFrame.w1,
    min: 7 * msPerDay,
    max: Infinity, // 1 week up to unlimited
  },
  "1mo": {
    alpaca: values.TimeFrame.Month,
    prisma: TimeFrame.mo1,
    min: 28 * msPerDay,
    max: Infinity, // 4 weeks up to unlimited
  },
};

// non empty tuple, that is the shape z.enum wants
export const timeFrameKeys = Object.keys(timeFrames) as [TimeFrameKey, ...TimeFrameKey[]];
