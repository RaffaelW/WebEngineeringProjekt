import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { createUser } from "../user/user.service.js";

export type AuthTokenPayload = {
  id: number;
};

export async function hashPassword(password: string) {
  return await argon2.hash(password);
}

export async function registerUser(name: string, password: string) {
  const hashedPassword = await hashPassword(password);
  return await createUser(name, hashedPassword);
}

export async function verifyUser(name: string, password: string) {
  const user = await prisma.appUser.findUnique({
    where: { name },
  });

  if (!user) {
    return null;
  }

  const isMatch = await argon2.verify(user.hashPassword, password);
  if (!isMatch) {
    return null;
  }

  return user;
}

export async function generateAuthToken(userId: number) {
  const token = jwt.sign({ id: userId } as AuthTokenPayload, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
  return token;
}

export async function readAuthToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded as AuthTokenPayload;
  } catch (error) {
    console.error("Error verifying JWT:", error);
    return null;
  }
}
