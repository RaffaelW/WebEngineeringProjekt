import { TransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type Order = {
  name: string;
  ticker: string;
  transactionType: TransactionType;
  time: Date;
  shares_amount: number;
};

export type Orderbook = Order[];

/**
 * return every order of the user in ascending order
 */
export async function getOrderBook(userId: number): Promise<Orderbook> {
  type transactionType = {
    transactionType: TransactionType;
    time: Date;
    shares_amount: number;
    asset: {
      name: string;
      ticker: string;
    };
  };

  const transactions: transactionType[] = await prisma.portfolioTransaction.findMany({
    where: { appUserId: userId },
    select: {
      transactionType: true,
      time: true,
      shares_amount: true,
      asset: { select: { name: true, ticker: true } },
    },
    orderBy: { time: "asc" },
  });

  return transactions.map((transaction) => ({
    name: transaction.asset.name,
    ticker: transaction.asset.ticker,
    transactionType: transaction.transactionType,
    time: transaction.time,
    shares_amount: transaction.shares_amount,
  }));
}
