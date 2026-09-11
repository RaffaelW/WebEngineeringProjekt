import { TimeFrame } from "@prisma/client";
import { values } from "@alpacahq/alpaca-trade-api";
import type { TimeFrameKey } from "../../../models/history.d.ts";

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
    // "10 days ago until today", 9 trading days once it spans two weekends, 8640 bars
    max: 11 * msPerDay,
  },
  "1h": {
    alpaca: values.TimeFrame.Hour,
    prisma: TimeFrame.h1,
    min: msPerHour,
    // "2 years ago until today", 505 trading days, 8080 bars
    max: 732 * msPerDay,
  },
  "1d": {
    alpaca: values.TimeFrame.Day,
    prisma: TimeFrame.d1,
    min: msPerDay,
    // every daily bar since 2016 is about 2700
    max: Infinity,
  },
  "1w": {
    alpaca: values.TimeFrame.Week,
    prisma: TimeFrame.w1,
    min: 7 * msPerDay,
    // every weekly bar since 2016 is about 560
    max: Infinity,
  },
  "1mo": {
    alpaca: values.TimeFrame.Month,
    prisma: TimeFrame.mo1,
    min: 28 * msPerDay,
    // every monthly bar since 2016 is about 130
    max: Infinity,
  },
};

// non empty tuple, that is the shape z.enum wants
export const timeFrameKeys = Object.keys(timeFrames) as [TimeFrameKey, ...TimeFrameKey[]];
