import { fetchTradingDays } from "./alpaca.js";

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

export async function isTradeDay(date: Date): Promise<boolean> {
  const day: Date = startOfDay(date);
  const rawTradeDays: Date[] = await fetchTradingDays(day, day);
  const msTradeDays: number[] = rawTradeDays.map((time: Date) => startOfDay(time).getTime());

  return msTradeDays.includes(day.getTime());
}
