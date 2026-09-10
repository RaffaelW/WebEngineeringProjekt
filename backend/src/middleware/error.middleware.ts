import { NextFunction, Request, Response } from "express";
import { RangeError } from "../history/history.service.js";
import { GateWayError, NoMarketDataError, TickerNotFoundError } from "../lib/alpaca.js";
import { DateError } from "../lib/date.js";
import { HoldingError } from "../portfolio/portfolio.service.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: "Not Found" });
}

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction) {
  // The _next parameter is unused, but we include it to satisfy the Express error handler signature
  void _next;

  if (error instanceof GateWayError) {
    console.error("Failed to fetch market data from upstream", error);
    return res.status(502).json({ message: "Failed to fetch market data from upstream" });
  }

  if (error instanceof TickerNotFoundError) {
    console.error("Asset not found", error);
    return res.status(404).json({ message: "Asset not found" });
  }

  if (error instanceof NoMarketDataError) {
    console.error("No market data available", error);
    return res.status(400).json({ message: "No market data available" });
  }

  if (error instanceof HoldingError) {
    console.error("Invalid holding operation", error);
    return res.status(400).json({ message: "Invalid holding operation" });
  }

  if (error instanceof RangeError || error instanceof DateError) {
    console.error("Invalid range or date", error);
    return res.status(400).json({ message: error.message });
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error" });
}
