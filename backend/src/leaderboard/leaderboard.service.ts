import { AppUser } from "@prisma/client";
import {
  calculatePerformance,
  calculateStats,
  getLatestValidEnd,
  getOrderBook,
  getValidStart,
  Orderbook,
  Stats,
} from "../portfolio/portfolio.service.js";
import { getUserList } from "../user/user.service.js";

export type LeaderboardEntry = {
  user: Pick<AppUser, "id" | "name">;
  total_costs: number;
  total_gains: number;
  performance: number;
};

export type Leaderboard = LeaderboardEntry[];

/**
 * Retrieves the leaderboard of users based on their portfolio performance within a specified time frame.
 * @see calculateStats used to calculate the stats for each user
 * @param start Start date of the time frame for which to calculate the leaderboard.
 * If undefined, the earliest available date will be used.
 * @param end End date of the time frame for which to calculate the leaderboard.
 * If undefined, the date of the latest valid end will be used.
 * @returns A list of leaderboard entries sorted by performance,
 * each containing user information and their corresponding portfolio performance metrics.
 */
export async function getLeaderboard(
  start: Date | undefined,
  end: Date | undefined,
): Promise<Leaderboard> {
  const windowEnd: Date = await getLatestValidEnd(end);
  const windowStart: Date = await getValidStart(start);

  const users = await getUserList();
  const leaderboard: Leaderboard = [];

  // calculate stats for each user in parallel
  const promises = users.map(async (user) => {
    const orderbook: Orderbook = await getOrderBook(user.id);
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
    leaderboard.push(leaderboardEntry);
  });

  await Promise.all(promises);

  leaderboard.sort((a, b) => b.performance - a.performance);
  return leaderboard;
}
