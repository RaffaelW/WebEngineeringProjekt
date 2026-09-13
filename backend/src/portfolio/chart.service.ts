import { getHistory } from "../history/history.service.js";
import { getHolding, getStocksByStatus, Holding } from "./portfolio.service.js";
import type { AssetHistory, TimeFrameKey } from "../../../models/history.d.ts";
import type { Order, Orderbook, PortfolioBar } from "../../../models/portfolio.d.ts";

/**
 * every ticker priced on the shared timeline, gaps filled so a sum never silently drops a holding
 */
function alignToTimeline(timeline: Date[], bars: AssetHistory[]): number[] {
  const byTime: Map<number, AssetHistory> = new Map();
  for (const bar of bars) {
    byTime.set(bar.time.getTime(), bar);
  }

  // before the first bar there is no close to carry yet, so the earliest open stands in
  // critical: with no bars at all the ticker never traded here and every stamp prices at nothing
  let lastKnownPrice: number = bars.at(0)?.open ?? 0;

  const prices: number[] = [];
  for (const time of timeline) {
    const bar: AssetHistory | undefined = byTime.get(time.getTime());

    // a stamp this ticker did not trade on keeps the price it last closed at
    if (bar !== undefined) {
      lastKnownPrice = bar.close;
    }

    prices.push(lastKnownPrice);
  }

  return prices;
}

/**
 * one grid every ticker is priced on, the union of the stamps they each traded on
 */
function buildTimeline(histories: Map<string, AssetHistory[]>): Date[] {
  const stamps: Set<number> = new Set();

  for (const bars of histories.values()) {
    for (const bar of bars) {
      stamps.add(bar.time.getTime());
    }
  }

  return [...stamps].sort((a: number, b: number) => a - b).map((time: number) => new Date(time));
}

/**
 * every ticker that can carry shares somewhere inside the window: held when it opens, or traded in it
 *
 * a position sold off before start never shows up on a bar, so its history is never fetched
 */
function tickersInWindow(orders: Orderbook, start: Date): string[] {
  const before: Orderbook = orders.filter((order: Order) => order.time.getTime() < start.getTime());
  const inside: Orderbook = orders.filter(
    (order: Order) => order.time.getTime() >= start.getTime(),
  );

  const tickers: Set<string> = new Set(getStocksByStatus(before, "active"));
  for (const order of inside) {
    tickers.add(order.ticker);
  }

  return [...tickers];
}

/**
 * Calculate what the portfolio was worth on every bar of the window, one candle per period.
 *
 * A bar covers the time up to the next stamp on the timeline and closes at its end, so the shares
 * counted on it are the ones held after every order placed before the next bar. value is those
 * shares at the close of the bar, invested what was paid for them, gain the distance between the two.
 */
export async function calculatePortfolioChart(
  orderbook: Orderbook,
  timeframe: TimeFrameKey,
  start: Date,
  end: Date,
): Promise<PortfolioBar[]> {
  // an order after the window cannot change what was held inside it, orders before start open
  // the position the first bar starts with
  const orders: Orderbook = orderbook.filter(
    (order: Order) => order.time.getTime() <= end.getTime(),
  );

  const tickers: string[] = tickersInWindow(orders, start);

  if (tickers.length === 0) {
    return [];
  }

  // a ticker sold off before the window weighs nothing on any bar, its orders need no replay
  const relevant: Orderbook = orders.filter((order: Order) => tickers.includes(order.ticker));

  const histories: Map<string, AssetHistory[]> = new Map();
  for (const ticker of tickers) {
    //TODO: optimize batch fetching
    histories.set(ticker, await getHistory(ticker, timeframe, start, end));
  }

  const timeline: Date[] = buildTimeline(histories);

  if (timeline.length === 0) {
    return [];
  }

  const prices: Map<string, number[]> = new Map();
  for (const ticker of tickers) {
    prices.set(ticker, alignToTimeline(timeline, histories.get(ticker) ?? []));
  }

  // the orderbook is ascending, so one cursor walks it in step with the timeline
  let holdings: Map<string, Holding> = new Map();
  let next: number = 0;

  const chart: PortfolioBar[] = [];
  for (const [bar, time] of timeline.entries()) {
    // the last bar owns every remaining order, they are already bounded by end
    const boundary: number = timeline[bar + 1]?.getTime() ?? Infinity;

    const due: Orderbook = [];
    while (next < relevant.length && relevant[next].time.getTime() < boundary) {
      due.push(relevant[next]);
      next++;
    }

    // replayed on top of what the previous bar held, so shares and cost basis carry over
    if (due.length > 0) {
      holdings = await getHolding(due, holdings);
    }

    let value: number = 0;
    let invested: number = 0;
    for (const [ticker, holding] of holdings) {
      value += holding.shares * (prices.get(ticker)?.[bar] ?? 0);
      invested += holding.investedMoney;
    }

    chart.push({ time, value, gain: value - invested, invested });
  }

  return chart;
}
