import { populateAssetTable } from "../src/asset/asset.service.js";
import { registerUser } from "../src/auth/auth.service.js";
import { prisma } from "../src/lib/prisma.js";
import type { transactionOrder } from "../src/portfolio/portfolio.service.js";
import { processOrder } from "../src/portfolio/portfolio.service.js";

/**
 * Orders for demo users
 */
const orders = [
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
  [
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
  [
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
  [
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
async function processUserOrders(userId: number, orders: transactionOrder[]): Promise<void> {
  const nextWaveByIdTicker: Map<string, number> = new Map();
  const waves: transactionOrder[][] = [];

  for (const order of orders) {
    const waveNumber: number = (nextWaveByIdTicker.get(order.ticker) ?? 0) + 1;
    nextWaveByIdTicker.set(order.ticker, waveNumber);
    (waves[waveNumber - 1] ??= []).push(order);
  }

  for (const wave of waves) {
    await Promise.all(wave.map((order: transactionOrder) => processOrder(order, userId)));
  }
}

async function main() {
  const indices = [1, 2, 3, 4];
  const demoUsers = indices.map((i) => ({ name: `User ${i}`, password: `user${i}` }));
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
