/**
 * Raw wire shapes: what the API literally sends and accepts over JSON.
 *
 * Only shapes that differ from the shared contract in /models live here.
 * The Serialize service converts between these and the shared models.
 */

/** Calendar day, `YYYY-MM-DD`. */
export type IsoDate = string;

/** Full ISO timestamp. */
export type IsoDateTime = string;
