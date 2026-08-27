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
