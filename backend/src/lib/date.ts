import { fetchMarketClock, fetchTradingDays, MarketClock } from "./alpaca.js";

export class DateError extends Error {}

export function startOfDay(time: Date): Date {
  const day: Date = new Date(time);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

export function endOfDay(time: Date): Date {
  const day: Date = new Date(time);
  day.setUTCHours(23, 59, 59, 999);
  return day;
}

/**
 * start of the day a number of calendar days before time
 */
export function daysBefore(time: Date, days: number): Date {
  const day: Date = startOfDay(time);
  day.setUTCDate(day.getUTCDate() - days);
  return day;
}

export async function isTradeDay(date: Date): Promise<boolean> {
  const day: Date = startOfDay(date);
  const rawTradeDays: Date[] = await fetchTradingDays(day, day);
  const msTradeDays: number[] = rawTradeDays.map((time: Date) => startOfDay(time).getTime());

  return msTradeDays.includes(day.getTime());
}

/**
 * a window this wide always contains a trading day, even across the longest holiday breaks
 */
const WINDOW_DAYS: number = 7;

/**
 * the trading days of the WINDOW_DAYS leading up to date, in ascending order
 */
async function fetchRecentTradingDays(date: Date): Promise<Date[]> {
  const lowLimit: Date = new Date(date);
  lowLimit.setUTCDate(lowLimit.getUTCDate() - WINDOW_DAYS);

  const tradingDays: Date[] = await fetchTradingDays(lowLimit, date);

  if (tradingDays.length === 0) {
    throw new DateError(
      `No trading day between ${startOfDay(lowLimit).toISOString()} and ${startOfDay(date).toISOString()}`,
    );
  }

  return tradingDays;
}

/**
 * Latest trading day which already produced market data. Today's session is still
 * empty before the opening bell, in that case the previous trading day is the
 * newest one that can be priced.
 */
export async function getLatestTradedDay(date: Date): Promise<Date> {
  const tradingDays: Date[] = await fetchRecentTradingDays(date);
  const clock: MarketClock = await fetchMarketClock();

  // ascending order, so the most recent trading day is the last one
  const latest: Date = tradingDays[tradingDays.length - 1];
  // the market being closed with its next open on the latest trading day means it is still ahead
  const beforeOpeningBell: boolean =
    !clock.isOpen && startOfDay(clock.nextOpen).getTime() === startOfDay(latest).getTime();

  if (!beforeOpeningBell) {
    return latest;
  }

  const previous: Date | undefined = tradingDays.at(-2);
  if (!previous) {
    throw new DateError(`No traded day before ${startOfDay(latest).toISOString()}`);
  }

  return previous;
}

/**
 * Earliest trading day at or after date. Unlike getLatestTradedDay this needs no market
 * clock, a window starting there only needs the session's first bar.
 */
export async function getNextTradingDay(date: Date): Promise<Date> {
  const highLimit: Date = new Date(date);
  highLimit.setUTCDate(highLimit.getUTCDate() + WINDOW_DAYS);

  const tradingDays: Date[] = await fetchTradingDays(date, highLimit);

  if (tradingDays.length === 0) {
    throw new DateError(
      `No trading day between ${startOfDay(date).toISOString()} and ${startOfDay(highLimit).toISOString()}`,
    );
  }

  // ascending order, so the earliest trading day is the first one
  return tradingDays[0];
}

/**
 * Check if the market is currently open.
 * @returns A promise that resolves to a boolean indicating if the market is open.
 */
export async function isMarketOpen(): Promise<boolean> {
  // the market clock has no history, this can only answer for the current moment
  return (await fetchMarketClock()).isOpen;
}
