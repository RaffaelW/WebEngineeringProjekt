import type { TransactionRequest } from "../../models/portfolio.d.ts";
import { populateAssetTable } from "../src/asset/asset.service.js";
import { registerUser } from "../src/auth/auth.service.js";
import { prisma } from "../src/lib/prisma.js";
import { processOrder } from "../src/portfolio/portfolio.service.js";

/**
 * Orders for demo users, one list per user in ascending order.
 *
 * They reach back to 2016 so the long chart windows show real growth. Prices are split
 * adjusted, so the share amounts of the early buys are sized to what a few thousand dollars
 * bought back then, and a sell never exceeds what the user holds at that moment.
 */
const orders = [
  // long-term holder since 2016 who trimmed the winners, still riding NVDA and TSLA
  [
    {
      ticker: "GOOGL",
      transactionType: "buy" as const,
      shares_amount: 20,
      time: new Date("2026-03-10T14:30:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "buy" as const,
      shares_amount: 15,
      time: new Date("2026-03-24T15:00:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "buy" as const,
      shares_amount: 10,
      time: new Date("2026-04-07T14:45:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "sell" as const,
      shares_amount: 20,
      time: new Date("2026-04-28T15:15:00Z"),
    },
    {
      ticker: "NVDA",
      transactionType: "buy" as const,
      shares_amount: 8,
      time: new Date("2026-05-12T14:00:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "buy" as const,
      shares_amount: 12,
      time: new Date("2026-06-02T15:30:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "sell" as const,
      shares_amount: 15,
      time: new Date("2026-06-23T14:15:00Z"),
    },
    {
      ticker: "AMZN",
      transactionType: "buy" as const,
      shares_amount: 5,
      time: new Date("2026-07-07T15:00:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "sell" as const,
      shares_amount: 10,
      time: new Date("2026-07-21T14:30:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "buy" as const,
      shares_amount: 10,
      time: new Date("2026-08-04T15:15:00Z"),
    },
    {
      ticker: "AMZN",
      transactionType: "sell" as const,
      shares_amount: 5,
      time: new Date("2026-08-18T14:00:00Z"),
    },
    {
      ticker: "NVDA",
      transactionType: "buy" as const,
      shares_amount: 6,
      time: new Date("2026-08-25T15:30:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "buy" as const,
      shares_amount: 3,
      time: new Date("2026-09-01T14:45:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "sell" as const,
      shares_amount: 10,
      time: new Date("2026-09-08T15:00:00Z"),
    },
  ],
  // early GOOGL and AMZN buyer, rotated into MSFT and NVDA, out of TSLA again
  [
    {
      ticker: "GOOGL",
      transactionType: "buy" as const,
      shares_amount: 60,
      time: new Date("2016-04-13T15:30:00Z"),
    },
    {
      ticker: "AMZN",
      transactionType: "buy" as const,
      shares_amount: 60,
      time: new Date("2016-10-12T16:00:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "buy" as const,
      shares_amount: 40,
      time: new Date("2017-08-09T16:45:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "buy" as const,
      shares_amount: 80,
      time: new Date("2018-05-16T17:30:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "sell" as const,
      shares_amount: 30,
      time: new Date("2019-02-13T18:00:00Z"),
    },
    {
      ticker: "NVDA",
      transactionType: "buy" as const,
      shares_amount: 200,
      time: new Date("2019-11-13T15:30:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "buy" as const,
      shares_amount: 30,
      time: new Date("2020-09-16T16:00:00Z"),
    },
    {
      ticker: "AMZN",
      transactionType: "sell" as const,
      shares_amount: 60,
      time: new Date("2021-04-14T16:45:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "sell" as const,
      shares_amount: 40,
      time: new Date("2022-10-12T17:30:00Z"),
    },
    {
      ticker: "NVDA",
      transactionType: "sell" as const,
      shares_amount: 100,
      time: new Date("2023-06-14T18:00:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "buy" as const,
      shares_amount: 10,
      time: new Date("2024-08-14T15:30:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "sell" as const,
      shares_amount: 30,
      time: new Date("2025-01-15T16:00:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "buy" as const,
      shares_amount: 50,
      time: new Date("2026-03-17T14:30:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "buy" as const,
      shares_amount: 20,
      time: new Date("2026-04-14T15:00:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "buy" as const,
      shares_amount: 15,
      time: new Date("2026-05-19T14:45:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "sell" as const,
      shares_amount: 50,
      time: new Date("2026-06-16T15:15:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "buy" as const,
      shares_amount: 10,
      time: new Date("2026-07-07T14:00:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "sell" as const,
      shares_amount: 15,
      time: new Date("2026-07-28T15:30:00Z"),
    },
    {
      ticker: "NVDA",
      transactionType: "buy" as const,
      shares_amount: 8,
      time: new Date("2026-08-11T14:15:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "sell" as const,
      shares_amount: 20,
      time: new Date("2026-09-02T15:00:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "sell" as const,
      shares_amount: 10,
      time: new Date("2026-09-09T14:30:00Z"),
    },
  ],
  // steady accumulator, sold everything but AAPL and NVDA before rebuilding in 2026
  [
    {
      ticker: "MSFT",
      transactionType: "buy" as const,
      shares_amount: 50,
      time: new Date("2016-08-10T15:30:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "buy" as const,
      shares_amount: 70,
      time: new Date("2017-05-10T16:00:00Z"),
    },
    {
      ticker: "NVDA",
      transactionType: "buy" as const,
      shares_amount: 250,
      time: new Date("2018-01-10T16:45:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "buy" as const,
      shares_amount: 50,
      time: new Date("2018-12-12T17:30:00Z"),
    },
    {
      ticker: "AMZN",
      transactionType: "buy" as const,
      shares_amount: 30,
      time: new Date("2019-08-14T18:00:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "buy" as const,
      shares_amount: 40,
      time: new Date("2020-06-10T15:30:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "sell" as const,
      shares_amount: 50,
      time: new Date("2021-02-10T16:00:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "sell" as const,
      shares_amount: 40,
      time: new Date("2021-11-10T16:45:00Z"),
    },
    {
      ticker: "AMZN",
      transactionType: "sell" as const,
      shares_amount: 30,
      time: new Date("2022-03-16T17:30:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "sell" as const,
      shares_amount: 50,
      time: new Date("2023-03-15T18:00:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "buy" as const,
      shares_amount: 30,
      time: new Date("2024-05-15T15:30:00Z"),
    },
    {
      ticker: "NVDA",
      transactionType: "sell" as const,
      shares_amount: 150,
      time: new Date("2025-06-11T16:00:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "buy" as const,
      shares_amount: 30,
      time: new Date("2026-03-31T15:00:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "buy" as const,
      shares_amount: 10,
      time: new Date("2026-04-21T14:30:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "sell" as const,
      shares_amount: 30,
      time: new Date("2026-05-12T15:15:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "buy" as const,
      shares_amount: 25,
      time: new Date("2026-05-26T14:00:00Z"),
    },
    {
      ticker: "NVDA",
      transactionType: "buy" as const,
      shares_amount: 5,
      time: new Date("2026-06-16T15:30:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "sell" as const,
      shares_amount: 10,
      time: new Date("2026-07-07T14:45:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "buy" as const,
      shares_amount: 15,
      time: new Date("2026-07-21T15:00:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "sell" as const,
      shares_amount: 25,
      time: new Date("2026-08-04T14:15:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "sell" as const,
      shares_amount: 15,
      time: new Date("2026-08-25T15:30:00Z"),
    },
    {
      ticker: "AMZN",
      transactionType: "buy" as const,
      shares_amount: 20,
      time: new Date("2026-09-08T14:00:00Z"),
    },
  ],
  // tiny NVDA bet in 2016 that grew into the whole portfolio, cashed out piece by piece
  [
    {
      ticker: "NVDA",
      transactionType: "buy" as const,
      shares_amount: 200,
      time: new Date("2016-03-09T15:30:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "buy" as const,
      shares_amount: 90,
      time: new Date("2016-11-09T16:00:00Z"),
    },
    {
      ticker: "AMZN",
      transactionType: "buy" as const,
      shares_amount: 50,
      time: new Date("2017-06-14T16:45:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "buy" as const,
      shares_amount: 30,
      time: new Date("2018-03-14T17:30:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "buy" as const,
      shares_amount: 150,
      time: new Date("2019-01-09T18:00:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "buy" as const,
      shares_amount: 40,
      time: new Date("2019-10-09T15:30:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "sell" as const,
      shares_amount: 45,
      time: new Date("2020-08-12T16:00:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "sell" as const,
      shares_amount: 100,
      time: new Date("2021-01-13T16:45:00Z"),
    },
    {
      ticker: "NVDA",
      transactionType: "sell" as const,
      shares_amount: 100,
      time: new Date("2021-12-15T17:30:00Z"),
    },
    {
      ticker: "AMZN",
      transactionType: "sell" as const,
      shares_amount: 50,
      time: new Date("2022-11-09T18:00:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "sell" as const,
      shares_amount: 30,
      time: new Date("2023-11-15T15:30:00Z"),
    },
    {
      ticker: "AMZN",
      transactionType: "buy" as const,
      shares_amount: 20,
      time: new Date("2024-10-16T16:00:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "sell" as const,
      shares_amount: 40,
      time: new Date("2025-08-13T16:45:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "buy" as const,
      shares_amount: 40,
      time: new Date("2026-03-10T15:00:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "buy" as const,
      shares_amount: 10,
      time: new Date("2026-04-07T14:30:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "buy" as const,
      shares_amount: 20,
      time: new Date("2026-05-05T15:15:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "buy" as const,
      shares_amount: 15,
      time: new Date("2026-06-09T14:00:00Z"),
    },
    {
      ticker: "MSFT",
      transactionType: "sell" as const,
      shares_amount: 10,
      time: new Date("2026-07-14T15:30:00Z"),
    },
    {
      ticker: "GOOGL",
      transactionType: "sell" as const,
      shares_amount: 10,
      time: new Date("2026-08-11T14:45:00Z"),
    },
    {
      ticker: "NVDA",
      transactionType: "buy" as const,
      shares_amount: 8,
      time: new Date("2026-09-01T15:00:00Z"),
    },
    {
      ticker: "AAPL",
      transactionType: "sell" as const,
      shares_amount: 20,
      time: new Date("2026-09-08T14:15:00Z"),
    },
    {
      ticker: "TSLA",
      transactionType: "sell" as const,
      shares_amount: 15,
      time: new Date("2026-09-10T15:30:00Z"),
    },
  ],
];

/**
 * Execute a user's orders with maximal parallelism.
 *
 * A sell order depends on every earlier order of the same ticker, so the orders
 * are split into waves: each wave contains only orders for distinct tickers and
 * runs in parallel, the waves themselves run sequentially.
 */
async function processUserOrders(userId: number, orders: TransactionRequest[]): Promise<void> {
  const nextWaveByIdTicker: Map<string, number> = new Map();
  const waves: TransactionRequest[][] = [];

  for (const order of orders) {
    const waveNumber: number = (nextWaveByIdTicker.get(order.ticker) ?? 0) + 1;
    nextWaveByIdTicker.set(order.ticker, waveNumber);
    (waves[waveNumber - 1] ??= []).push(order);
  }

  for (const wave of waves) {
    await Promise.all(wave.map((order) => processOrder(order, userId)));
  }
}

async function main() {
  const indices = [1, 2, 3, 4];
  const demoUsers = indices.map((i) => ({ name: `User ${i}`, password: `finanzvisu` }));
  const demoUserNames = demoUsers.map((user) => user.name);

  // Remove any demo data left by a previous or failed run, so the seed can be re-run
  await prisma.appUser.deleteMany({
    where: { name: { in: demoUserNames } },
  });

  // create users
  const users = await Promise.all(
    demoUsers.map(async (user) => await registerUser(user.name, user.password)),
  );

  // populate asset table from the alpaca API
  await populateAssetTable();

  // execute the orders of all users in parallel
  await Promise.all(indices.map((i) => processUserOrders(users[i - 1].id, orders[i - 1])));
}

try {
  await main();
} catch (error) {
  console.error("Error seeding database:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
