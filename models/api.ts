/**
 * Envelope shapes every endpoint can answer with, regardless of the resource.
 */

export interface ApiMessage {
  message: string;
}

/**
 * The shape z.treeifyError produces: the issues of one node in `errors`, the
 * issues of its children nested under `properties` (objects) or `items` (arrays).
 */
export interface ValidationErrorTree {
  errors: string[];
  properties?: Record<string, ValidationErrorTree | undefined>;
  items?: (ValidationErrorTree | undefined)[];
}

/**
 * Body of a 400 from the validation middleware.
 */
export interface ValidationErrorResponse {
  errors: ValidationErrorTree;
}
