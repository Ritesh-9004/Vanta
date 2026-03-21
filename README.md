# 📦 Vanta

**Universal MCU Package Manager & Registry**

Find, install, and publish firmware libraries for any microcontroller — ESP32, STM32, RP2040, nRF52, and more.

Like [pub.dev](https://pub.dev) (discovery) + [npm](https://www.npmjs.com) (workflow) — but purpose-built for embedded firmware.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![Python](https://img.shields.io/badge/python-3.10%2B-blue)

---

## Architecture

```
vanta/
├── apps/
│   ├── web/         → Registry website (Next.js 15, Tailwind CSS)
│   ├── api/         → REST API (Hono, Bun, Drizzle ORM)
│   └── crawler/     → GitHub auto-indexer (Python, PyGithub)
├── packages/
│   ├── types/       → Shared TypeScript types
│   └── core/        → Business logic (boards, semver, quality)
├── docker-compose.yml → PostgreSQL + pgAdmin
└── turbo.json        → Turborepo orchestration
```

| Component | Tech Stack |
|-----------|------------|
| **Web** | Next.js 15 · React 19 · Tailwind CSS 4 · Lucide Icons |
| **API** | Hono · Bun · Drizzle ORM · PostgreSQL 16 · Zod |
| **Crawler** | Python 3.10+ · PyGithub · httpx · APScheduler · psycopg3 |
| **Monorepo** | Turborepo · pnpm workspaces |

## Features

- **Browse & search** real embedded libraries crawled from GitHub
- **Quality scores (0–100)** auto-computed from maintenance, docs, tests, popularity, compatibility
- **Hardware compatibility matrix** — platforms & frameworks per package
- **Publisher info** — linked to GitHub owner profiles
- **Version detection** — from manifests (`library.properties`, `idf_component.yml`) and GitHub releases
- **Framework awareness** — Arduino, ESP-IDF, MicroPython, Zephyr, bare-metal

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 10
- [Bun](https://bun.sh/) (for the API)
- [Python](https://www.python.org/) ≥ 3.10 (for the crawler)
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/Ritesh-9004/Vanta.git
cd vanta
pnpm install
```

### 2. Start the database

```bash
docker compose up -d
```

This spins up PostgreSQL 16 on port `5432` (user: `postgres`, password: `dev`, database: `vanta`).

### 3. Set up environment variables

```bash
# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.example apps/web/.env.local

# Crawler (requires a GitHub token)
cp apps/crawler/.env.example apps/crawler/.env
# Then edit apps/crawler/.env and add your GitHub token
```

> **GitHub Token**: Create a [Personal Access Token (Classic)](https://github.com/settings/tokens) with scopes: `public_repo`, `read:org`, `read:user`.

### 4. Push the database schema

```bash
pnpm db:push
```

### 5. Run the crawler (one-time seed)

```bash
cd apps/crawler
pip install -r requirements.txt
python main.py
```

The crawler discovers up to 50 MCU libraries from GitHub per run (configurable). It auto-stops after 10 minutes maximum.

### 6. Start the dev server

```bash
# From the repo root
pnpm dev
```

This starts:
- **Web** → [http://localhost:3000](http://localhost:3000)
- **API** → [http://localhost:4000](http://localhost:4000)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/packages` | List packages (paginated, with publisher info) |
| `GET` | `/packages/stats` | Registry stats (total packages, platforms, frameworks) |
| `GET` | `/packages/:name` | Package detail (full metadata, quality breakdown) |
| `GET` | `/search?q=...` | Full-text search across packages |

## Project Scripts

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Production build
pnpm lint         # TypeScript type checking
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Drizzle Studio (DB browser)
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Run pending migrations
```

## Crawler Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_TOKEN` | — | **Required.** GitHub PAT for API access |
| `MAX_REPOS_PER_RUN` | `50` | Max repos to process per crawl |
| `MIN_STARS` | `5` | Minimum stars to consider a repo |
| `CRAWL_INTERVAL_HOURS` | `6` | Re-crawl interval (scheduler mode) |
| `RESCAN_SUCCESS_AFTER_HOURS` | `24` | Skip recently-scanned repos |

Run with `--schedule` flag for continuous mode:
```bash
python main.py --schedule
```

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE)
