/**
 * Backend-only shapes derived from the shared contract in /models.
 */

import type { HistoryQuery } from "../../../models/history.d.ts";

/** The bounds of a history query with the optional ones filled in. */
export interface HistoryWindow extends Pick<HistoryQuery, "start" | "end"> {
  start: Date;
  end: Date;
}
