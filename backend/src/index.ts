import cors from "cors";
import express from "express";

import { prisma } from "./lib/prisma.js";

interface DummyInput {
  name: string;
  balance?: number;
}

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// POST /api/dummy — create a dummy
app.post("/api/dummy", (req, res, next) => {
  const { name, balance } = req.body as DummyInput;
  prisma.dummy
    .create({ data: { name, balance } })
    .then((row) => res.status(201).json(row))
    .catch(next);
});

// GET /api/dummy/:id — get a dummy
app.get("/api/dummy/:id", (req, res, next) => {
  prisma.dummy
    .findUnique({ where: { id: req.params.id } })
    .then((row) => (row ? res.json(row) : res.status(404).json({ error: "Dummy not found" })))
    .catch(next);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
