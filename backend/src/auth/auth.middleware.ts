import { NextFunction, Request, Response } from "express";
import { getUserById } from "../user/user.service.js";
import { readAuthToken } from "./auth.service.js";

export const authCookieName = "user";

export async function storeToken(req: Request, _res: Response, next: NextFunction) {
  req.user = null;

  const jwtToken = req.cookies[authCookieName];

  if (!jwtToken) {
    return next();
  }

  const authToken = await readAuthToken(jwtToken);

  if (!authToken) {
    return next();
  }

  const user = await getUserById(authToken.id);
  if (!user) {
    return next();
  }

  req.user = { id: user.id, name: user.name };

  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}
