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

## Development

- **Frontend:** `npm run start:frontend` (port 4200)
- **Backend:** `npm run start:backend` (port 3000)

## Available Scripts

| Command                  | Description                          |
| ------------------------ | ------------------------------------ |
| `npm run start:frontend` | Start Angular dev server (port 4200) |
| `npm run start:backend`  | Start Express server (port 3000)     |
| `npm run build`          | Build both frontend and backend      |
| `npm run build:frontend` | Build frontend only                  |
| `npm run build:backend`  | Build backend only                   |
| `npm run format`         | Format code with Prettier            |
| `npm run format:check`   | Check formatting without modifying   |

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
