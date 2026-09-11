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

| User   | Password | Portfolio                                    |
| ------ | -------- | -------------------------------------------- |
| User 1 | user1    | Diversified tech investor                    |
| User 2 | user2    | Concentrated position, later diversified     |
| User 3 | user3    | Active trader, opens and closes positions    |
| User 4 | user4    | Long-term holder, trims and closes positions |

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
