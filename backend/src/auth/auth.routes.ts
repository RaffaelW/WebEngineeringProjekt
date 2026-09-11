import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Router } from "express";
import z from "zod";
import { validate } from "../middleware/validation.middleware.js";
import { getUserByName } from "../user/user.service.js";
import { authCookieName, requireAuth } from "./auth.middleware.js";
import { generateAuthToken, registerUser, verifyUser } from "./auth.service.js";
import type { AuthCredentials, SessionUser } from "../../../models/auth.js";
import type { ApiMessage } from "../../../models/api.js";

export const router = Router();

const authSchema = z.object({
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
}) satisfies z.ZodType<AuthCredentials>;
type AuthSchema = z.infer<typeof authSchema>;

router.route("/register").post(validate(authSchema), async (req, res) => {
  try {
    const { name, password } = req.body as AuthSchema;

    const existingUser = await getUserByName(name);
    if (existingUser != null) {
      return res.status(409).json({ message: "User already exists" } satisfies ApiMessage);
    }

    const user = await registerUser(name, password);

    const token = await generateAuthToken(user.id);
    res.cookie(authCookieName, token, { httpOnly: true, secure: false });

    res.status(201).json({ message: "User registered successfully" } satisfies ApiMessage);
  } catch (error) {
    // check for unique constraint violation error (P2002) from Prisma
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "User already exists" } satisfies ApiMessage);
    }

    throw error;
  }
});

router
  .route("/session")
  .get(requireAuth, (req, res) => {
    res.status(200).json(req.user! satisfies SessionUser);
  })
  .post(validate(authSchema), async (req, res) => {
    const { name, password } = req.body as AuthSchema;

    const user = await verifyUser(name, password);
    if (user == null) {
      return res.status(401).json({ message: "Invalid credentials" } satisfies ApiMessage);
    }

    const token = await generateAuthToken(user.id);
    res.cookie(authCookieName, token, { httpOnly: true, secure: false });

    res.status(200).json({ message: "Login successful" } satisfies ApiMessage);
  })
  .delete((_req, res) => {
    res.clearCookie(authCookieName);
    res.status(200).json({ message: "Logout successful" } satisfies ApiMessage);
  });
