import type { TimeFrameKey } from "../models/history.d.ts";

const msPerMinute: number = 60 * 1000;
const msPerHour: number = 60 * msPerMinute;
const msPerDay: number = 24 * msPerHour;

export interface TimeFrameRange {
  min: number;
  max: number;
}

export const timeFrameRanges: Record<TimeFrameKey, TimeFrameRange> = {
  "1min": {
    min: msPerMinute,
    // "10 days ago until today", 9 trading days once it spans two weekends, 8640 bars
    max: 11 * msPerDay,
  },
  "1h": {
    min: msPerHour,
    // "2 years ago until today", 505 trading days, 8080 bars
    max: 732 * msPerDay,
  },
  "1d": {
    min: msPerDay,
    // every daily bar since 2016 is about 2700
    max: Infinity,
  },
  "1w": {
    min: 7 * msPerDay,
    // every weekly bar since 2016 is about 560
    max: Infinity,
  },
  "1mo": {
    min: 28 * msPerDay,
    // every monthly bar since 2016 is about 130
    max: Infinity,
  },
};

// non empty tuple, that is the shape z.enum wants
export const timeFrameKeys = Object.keys(timeFrameRanges) as [TimeFrameKey, ...TimeFrameKey[]];
