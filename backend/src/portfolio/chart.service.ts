import { getHistory } from "../history/history.service.js";
import { getHolding, Holding } from "./portfolio.service.js";
import type { AssetHistory, TimeFrameKey } from "../../../models/history.js";
import type { Orderbook, PortfolioBar } from "../../../models/portfolio.js";

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
 * an open position with the price its ticker carried on every bar of the timeline, so summing a
 * bar is a walk over the positions instead of a lookup per ticker
 */
type WeightedPosition = {
  shares: number;
  prices: number[];
};

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
 * Calculate what the position held today was worth across the window, one candle per period.
 */
export async function calculatePortfolioChart(
  orderbook: Orderbook,
  timeframe: TimeFrameKey,
  start: Date,
  end: Date,
): Promise<PortfolioBar[]> {
  // shares and cost basis are facts of the whole history, the window only bounds the prices
  const holdings: Map<string, Holding> = await getHolding(orderbook);

  // a position already sold off weighs nothing
  const held: Map<string, Holding> = new Map(
    [...holdings].filter(([, holding]: [string, Holding]) => holding.shares > 0),
  );

  if (held.size === 0) {
    return [];
  }

  const invested: number = [...held.values()].reduce(
    (total: number, holding: Holding) => total + holding.investedMoney,
    0,
  );

  const histories: Map<string, AssetHistory[]> = new Map();
  for (const [ticker] of held) {
    //TODO: optimize batch fetching
    histories.set(ticker, await getHistory(ticker, timeframe, start, end));
  }

  const timeline: Date[] = buildTimeline(histories);

  if (timeline.length === 0) {
    return [];
  }

  const positions: WeightedPosition[] = [];
  for (const [ticker, holding] of held) {
    positions.push({
      shares: holding.shares,
      prices: alignToTimeline(timeline, histories.get(ticker) ?? []),
    });
  }

  return timeline.map((time: Date, bar: number) => {
    let value: number = 0;

    for (const position of positions) {
      value += position.shares * position.prices[bar];
    }

    return { time, value, gain: value - invested, invested };
  });
}
