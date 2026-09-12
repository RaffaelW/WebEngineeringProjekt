import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Router } from "express";
import z from "zod";
import type { ApiMessage } from "../../../models/api.d.ts";
import type { AuthCredentials, SessionUser, UpdateUserData } from "../../../models/auth.d.ts";
import { validate } from "../middleware/validation.middleware.js";
import { deleteUser, getUserByName, updateUser } from "../user/user.service.js";
import { authCookieName, requireAuth } from "./auth.middleware.js";
import { generateAuthToken, hashPassword, registerUser, verifyUser } from "./auth.service.js";

export const router = Router();

const usernameSchema = z.string().min(2).max(100);
const passwordSchema = z.string().min(8).max(100);

const authSchema = z.object({
  name: usernameSchema,
  password: passwordSchema,
}) satisfies z.ZodType<AuthCredentials>;
type AuthSchema = z.infer<typeof authSchema>;

const updateUserSchema = z
  .object({
    name: usernameSchema.optional(),
    password: passwordSchema.optional(),
  })
  .refine((data) => data.name || data.password, {
    message: "At least one of name or password must be provided",
  }) satisfies z.ZodType<UpdateUserData>;
type UpdateUserSchema = z.infer<typeof updateUserSchema>;

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

router
  .route("/me")
  .get(requireAuth, (req, res) => {
    res.status(200).json(req.user! satisfies SessionUser);
  })
  .patch(requireAuth, validate(updateUserSchema), async (req, res) => {
    const { name, password } = req.body as UpdateUserSchema;
    const hashedPassword = password ? await hashPassword(password) : undefined;

    try {
      await updateUser(req.user!.id, name, hashedPassword);
    } catch (error) {
      // check for unique constraint violation error (P2002) from Prisma
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        return res.status(409).json({ message: "User name already taken" } satisfies ApiMessage);
      }

      throw error;
    }

    res.status(200).json({ message: "User updated successfully" } satisfies ApiMessage);
  })
  .delete(requireAuth, async (req, res) => {
    await deleteUser(req.user!.id);
    res.clearCookie(authCookieName);
    res.status(200).json({ message: "User deleted successfully" } satisfies ApiMessage);
  });
