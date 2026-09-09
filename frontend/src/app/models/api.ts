export type IsoDate = string;

export type IsoDateTime = string;

export interface ApiMessage {
  message: string;
}

export interface ZodValidationError {
  errors: {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
}
