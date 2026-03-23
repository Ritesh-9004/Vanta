<div align="center">
  <h1>📦 VantaPM - Universal MCU Package Manager & Registry</h1>

 <!-- Tech stack -->
<img alt="Version" src="https://img.shields.io/badge/version-0.2.1-blue?style=for-the-badge" />
<img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" />
<img alt="Language" src="https://img.shields.io/badge/language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img alt="Runtime" src="https://img.shields.io/badge/runtime-Bun-f9f1e1?style=for-the-badge&logo=bun&logoColor=black" />
<img alt="Framework" src="https://img.shields.io/badge/framework-Next.js_15-black?style=for-the-badge&logo=next.js&logoColor=white" />
<img alt="Crawler" src="https://img.shields.io/badge/crawler-Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
<img alt="Database" src="https://img.shields.io/badge/database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" />

<br/>

<!-- Status -->
<a href="https://github.com/Ritesh-9004/Vantapm/stargazers">
  <img alt="Stars" src="https://img.shields.io/github/stars/Ritesh-9004/Vantapm?style=for-the-badge&logo=github&color=yellow" />
</a>
<a href="https://github.com/Ritesh-9004/Vantapm/issues">
  <img alt="Issues" src="https://img.shields.io/github/issues/Ritesh-9004/Vantapm?style=for-the-badge&logo=github&color=red" />
</a>
<a href="https://vantapm.vercel.app">
  <img alt="Registry" src="https://img.shields.io/badge/registry-live-brightgreen?style=for-the-badge&logo=vercel&logoColor=white" />
</a>
<a href="https://vantapm.onrender.com/health">
  <img alt="API" src="https://img.shields.io/badge/API-live-brightgreen?style=for-the-badge&logo=render&logoColor=white" />
</a>

</div>


---
### Manage, publish, and discover libraries for microcontrollers (MCUs) — ESP32, STM32, Arduino, and more.
---
## Getting Started

- **End users (recommended):** Download the prebuilt CLI binary from [GitHub Releases](https://github.com/Ritesh-9004/Vantapm/releases). No Node.js, Bun, Docker, or repo clone required.
- **Contributors/maintainers:** Use the monorepo setup below to run the web app, API, crawler, and database locally.

---

## End User CLI Setup

### 1. Download the CLI binary

Go to [Releases](https://github.com/Ritesh-9004/Vantapm/releases) and download the latest asset for your OS:

- **Windows:** `vanta.exe`
- **macOS:** `vanta`
- **Linux:** `vanta-linux`

> **Note:** Binaries are built and attached automatically via [GitHub Actions](.github/workflows/release.yml) whenever a new tag (e.g. `v0.2.1`) is pushed.

### 2. Add it to your PATH

**Windows:** Place `vanta.exe` in a folder such as `C:\Tools\vanta\` and add that folder to your PATH.

**macOS/Linux:**
```bash
chmod +x vanta
sudo mv vanta /usr/local/bin/vanta
```

### 3. Use the CLI
```bash
vanta doctor
vanta init
vanta search bme280 --platform esp32
vanta install bblanchon/ArduinoJson
vanta list
```

---

## Architecture
```
Vantapm/
├── .github/
│   └── workflows/
│       └── release.yml     → Builds and uploads CLI binaries on tag push
├── apps/
│   ├── cli/                → Vanta CLI (search, install, init, doctor)
│   ├── web/                → Registry website (Next.js 15, Tailwind CSS)
│   ├── api/                → REST API (Hono, Bun, Drizzle ORM)
│   └── crawler/            → GitHub auto-indexer (Python, PyGithub)
├── packages/
│   ├── types/              → Shared TypeScript types
│   └── core/               → Business logic (boards, semver, quality)
├── docker-compose.yml      → PostgreSQL + pgAdmin
└── turbo.json              → Turborepo orchestration
```

## Tech Stack

| Component | Stack |
|-----------|-------|
| **Web** | Next.js 15 · React 19 · Tailwind CSS 4 · Lucide Icons |
| **API** | Hono · Bun · Drizzle ORM · PostgreSQL 16 · Zod |
| **Crawler** | Python 3.10+ · PyGithub · httpx · APScheduler · psycopg3 |
| **Monorepo** | Turborepo · pnpm workspaces |
---

## Features

- **Browse & search** real embedded libraries crawled from GitHub
- **Quality scores (0–100)** auto-computed from maintenance, docs, tests, popularity, and compatibility
- **Hardware compatibility matrix** — platforms and frameworks per package
- **Publisher info** — linked to GitHub owner profiles
- **Version detection** — from manifests (`library.properties`, `idf_component.yml`) and GitHub releases
- **Framework awareness** — Arduino, ESP-IDF, MicroPython, Zephyr, bare-metal

---

## Contributor Setup (Monorepo)

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 10
- [Bun](https://bun.sh/) (for the API)
- [Python](https://www.python.org/) ≥ 3.10 (for the crawler)
- [Docker](https://www.docker.com/) (optional — only required for local PostgreSQL)

### Quick Start

#### 1. Clone & install
```bash
git clone https://github.com/Ritesh-9004/Vantapm.git
cd Vantapm
pnpm install
```

#### 2. Configure the database

**Option A — Local PostgreSQL via Docker:**
```bash
docker compose up -d
```
This spins up PostgreSQL 16 on port `5432` (user: `postgres`, password: `dev`, database: `vanta`).

**Option B — Hosted database (e.g. Neon):**
Skip Docker and set `DATABASE_URL` in `apps/api/.env` to your connection string.

#### 3. Set up environment variables
```bash
# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.example apps/web/.env.local

# Crawler (requires a GitHub token)
cp apps/crawler/.env.example apps/crawler/.env
# Edit apps/crawler/.env and add your GitHub token
```

> **GitHub Token:** Create a [Personal Access Token (Classic)](https://github.com/settings/tokens) with the following scopes: `public_repo`, `read:org`, `read:user`.

#### 4. Push the database schema
```bash
pnpm db:push
```

#### 5. Seed the database (one-time crawler run)
```bash
cd apps/crawler
pip install -r requirements.txt
python main.py
```

The crawler discovers up to 50 MCU libraries from GitHub per run (configurable) and auto-stops after 10 minutes.

#### 6. Start local services
```bash
# From the repo root
pnpm dev
```

This starts:
- **Web** → [http://localhost:3000](http://localhost:3000)
- **API** → [http://localhost:4000](http://localhost:4000)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/packages` | List packages (paginated, with publisher info) |
| `GET` | `/packages/stats` | Registry stats (total packages, platforms, frameworks) |
| `GET` | `/packages/:name` | Package detail (full metadata, quality breakdown) |
| `GET` | `/search?q=...` | Full-text search across packages |

---

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

---

## Crawler Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_TOKEN` | — | **Required.** GitHub PAT for API access |
| `MAX_REPOS_PER_RUN` | `50` | Max repos to process per crawl |
| `MIN_STARS` | `5` | Minimum stars to index a repo |
| `CRAWL_INTERVAL_HOURS` | `6` | Re-crawl interval in scheduler mode |
| `RESCAN_SUCCESS_AFTER_HOURS` | `24` | Skip repos scanned within this window |

To run continuously, use the `--schedule` flag:
```bash
python main.py --schedule
```

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

---

## License

[MIT](LICENSE)
