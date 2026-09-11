/**
 * GET /api/assets/autocomplete
 */

export interface AutocompleteQuery {
  name: string;
}

export interface AutocompleteAsset {
  name: string;
  ticker: string;
  exchange: string;
}
