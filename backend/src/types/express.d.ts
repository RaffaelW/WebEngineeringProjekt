declare namespace Express {
  export interface Request {
    user?: { id: bigint; name: string } | null;
  }
}
