import type { Leaderboard, LeaderboardEntry } from "../../../models/leaderboard.d.ts";
import type { Orderbook, Stats } from "../../../models/portfolio.d.ts";
import {
  calculatePerformance,
  calculateStats,
  getLatestValidEnd,
  getOrderBook,
  getValidStart,
} from "../portfolio/portfolio.service.js";
import { getUserList } from "../user/user.service.js";

/**
 * Retrieves the leaderboard of users based on their portfolio performance within a specified time frame.
 * @see calculateStats used to calculate the stats for each user
 * @param start Start date of the time frame for which to calculate the leaderboard.
 * If undefined, the earliest available date will be used.
 * @param end End date of the time frame for which to calculate the leaderboard.
 * If undefined, the date of the latest valid end will be used.
 * @returns The trading days the ranking was clamped to and the leaderboard entries sorted by
 * performance, each containing user information and their corresponding portfolio performance metrics.
 */
export async function getLeaderboard(
  start: Date | undefined,
  end: Date | undefined,
): Promise<Leaderboard> {
  const windowStart: Date = await getValidStart(start);
  const windowEnd: Date = await getLatestValidEnd(end);

  const users = await getUserList();
  const entries: LeaderboardEntry[] = [];

  // calculate stats for each user in parallel
  const promises = users.map(async (user) => {
    // all earlier orders are needed to calculate stats because data about
    // previously bought stocks is needed to calculate realized gains
    const orderbook: Orderbook = await getOrderBook(user.id, undefined, windowEnd);
    // Get unique tickers from the orderbook
    const tickers = [...new Set(orderbook.map((order) => order.ticker))];

    const stats: Stats[] = await calculateStats(orderbook, tickers, windowEnd, windowStart);

    const totalCosts = stats.reduce((acc, stat) => acc + stat.total_costs, 0);
    const totalGains = stats.reduce((acc, stat) => {
      const unrealizedGains = stat.current_value - stat.invested_money;
      return acc + unrealizedGains + stat.realized_gains;
    }, 0);
    const leaderboardEntry: LeaderboardEntry = {
      user,
      total_costs: totalCosts,
      total_gains: totalGains,
      performance: calculatePerformance(totalCosts, totalGains),
    };
    entries.push(leaderboardEntry);
  });

  await Promise.all(promises);

  entries.sort((a, b) => b.performance - a.performance);

  // the window the ranking actually used, so the client can show where a bound was clamped to
  return { start: windowStart, end: windowEnd, entries };
}
