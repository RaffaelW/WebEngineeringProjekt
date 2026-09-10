import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Router } from "express";
import z from "zod";
import { validate } from "../middleware/validation.middleware.js";
import { getUserByName } from "../user/user.service.js";
import { authCookieName, requireAuth } from "./auth.middleware.js";
import { generateAuthToken, registerUser, verifyUser } from "./auth.service.js";

export const router = Router();

const authSchema = z.object({
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
});

router.route("/register").post(validate(authSchema), async (req, res) => {
  try {
    const existingUser = await getUserByName(req.body.name);
    if (existingUser != null) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = await registerUser(req.body.name, req.body.password);

    const token = await generateAuthToken(user.id);
    res.cookie(authCookieName, token, { httpOnly: true, secure: false });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    // check for unique constraint violation error (P2002) from Prisma
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "User already exists" });
    }

    throw error;
  }
});

router
  .route("/session")
  .get(requireAuth, (req, res) => {
    res.status(200).json(req.user!);
  })
  .post(validate(authSchema), async (req, res) => {
    const user = await verifyUser(req.body.name, req.body.password);
    if (user == null) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = await generateAuthToken(user.id);
    res.cookie(authCookieName, token, { httpOnly: true, secure: false });

    res.status(200).json({ message: "Login successful" });
  })
  .delete((_req, res) => {
    res.clearCookie(authCookieName);
    res.status(200).json({ message: "Logout successful" });
  });
