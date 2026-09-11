# FinanzVisu

## Prerequisites

- Node.js >= 22

## Setup

1. Clone the repository
2. Install dependencies: `npm install`

### Development Setup (optional)

For development, install [pre-commit](https://pre-commit.com/#installation) to run code quality checks before each commit:

```bash
pre-commit install
```

## Database

PostgreSQL 17 (Docker) with Prisma as ORM and migration tool.

1. Copy env: `cp .example.env .env` and adjust the values
2. Start the database: `docker compose up -d`
3. Apply migrations, generate the client and seed the DB: `npm run db:migrate && npm run db:seed`

> **Note:** Seeding fetches market data from the Alpaca API, so it requires
> `API_KEY` and `API_KEY_SECRET` to be set in `.env`.

## Development

- **Frontend:** `npm run start:frontend` (port 4200)
- **Backend:** `npm run start:backend` (port 3000)

### Demo accounts

After starting the server, you can log in with the seeded demo users:

| User   | Password   | Portfolio                                    |
| ------ | ---------- | -------------------------------------------- |
| User 1 | finanzvisu | Diversified tech investor                    |
| User 2 | finanzvisu | Concentrated position, later diversified     |
| User 3 | finanzvisu | Active trader, opens and closes positions    |
| User 4 | finanzvisu | Long-term holder, trims and closes positions |

## Available Scripts

| Command                  | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `npm run start:frontend` | Start Angular dev server (port 4200)           |
| `npm run start:backend`  | Start Express server (port 3000)               |
| `npm run build`          | Build both frontend and backend                |
| `npm run build:frontend` | Build frontend only                            |
| `npm run build:backend`  | Build backend only                             |
| `npm run format`         | Format code with Prettier                      |
| `npm run format:check`   | Check formatting without modifying             |
| `npm run db:migrate`     | Create/apply Prisma migrations                 |
| `npm run db:generate`    | Generate Prisma client                         |
| `npm run db:reset`       | Reset database, re-run migrations, and seed it |
| `npm run db:seed`        | Seed data into the current database            |
| `npm run db:studio`      | Open Prisma Studio                             |
| `npm run ng`             | Run the Angular CLI in `frontend/`             |

Arguments for the Angular CLI have to be passed after `--`, e.g.
`npm run ng -- generate component dashboard`.

## Pre-commit Hooks

This project uses [pre-commit](https://pre-commit.com/) to run checks before each commit.

Install pre-commit following the [official installation guide](https://pre-commit.com/#installation), then run:

```bash
pre-commit install
```

**Run manually:**

```bash
pre-commit run --all-files
```

**Hooks included:**

- Prettier — Format code
- ESLint — Lint TypeScript/JavaScript
- cspell — Spell checking
- yamllint — YAML linting
- markdownlint-cli2 — Markdown linting
- General checks — Trailing whitespace, line endings, large files

## Project Structure

- `frontend/` — Angular 22 app (standalone components, SCSS)
- `backend/` — Express server (ESM, TypeScript)
- `models/` — shared API contract, imported by both

### Shared models

`models/` holds every type the two sides use to talk to each other, so a change
to the contract is a compile error on both ends instead of a runtime surprise.
It is **types only** — the files are `.d.ts`, unions are `type` aliases, request
and response objects are `interface`s, and nothing in it emits code. Import
them with the explicit path (`…/models/api.d.ts`) and always as `import type` —
TypeScript refuses a plain `import` of a declaration file.

Date fields in the shared models are `Date`, never ISO strings — the models
describe the _deserialized_ shape. Each side reaches it differently:

- **backend** — the Zod schemas already transform ISO strings into `Date`, so a
  parsed request is the shared shape as-is. Each schema is pinned to its model
  with `satisfies z.ZodType<…>`, which fails the build if the two drift apart.
- **frontend** — `frontend/src/app/models/` holds the raw wire shapes (`Raw*`,
  with ISO strings) for the endpoints that carry a date, and the `Serialize`
  service converts between those and the shared models. Everything above that
  service works only with shared models.

Because `models/` sits above both workspaces, `backend/tsconfig.build.json` spans the repo root.
