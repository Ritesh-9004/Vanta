# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-03-22

### 🎉 Initial Release

First public release of Vanta — the universal MCU package registry.

### Added

#### Web (`apps/web`)
- Homepage with live registry stats (total packages, platforms, frameworks)
- Browse all packages at `/packages` with grid and list layouts
- Package detail pages at `/packages/:name` with full metadata
- Quality badge component with color-coded 0–100 scores
- Quality breakdown chart (maintenance, CI/tests, docs, popularity, compatibility)
- Hardware compatibility chips (platforms & frameworks)
- Platform grid for filtering by MCU family
- Search bar with live query support
- Publisher display linked to GitHub owner profiles
- Responsive design with Tailwind CSS 4

#### API (`apps/api`)
- `GET /packages` — paginated package list with sorting (quality, name, updated, downloads)
- `GET /packages/stats` — registry statistics (total packages, unique platforms, unique frameworks)
- `GET /packages/:name` — full package detail with publisher info and quality breakdown
- `GET /search?q=...` — full-text search with filters (framework, platform, category, min_quality)
- PostgreSQL database with Drizzle ORM schema (packages, publishers, crawl_state tables)
- CORS support for frontend communication
- Zod-validated query parameters

#### Crawler (`apps/crawler`)
- GitHub discovery across 12 search queries (esp32, arduino, stm32, rp2040, nrf52, zephyr, micropython, platformio, etc.)
- Metadata extraction from `library.properties` (Arduino) and `idf_component.yml` (ESP-IDF)
- Version detection from manifests + GitHub releases API fallback
- Quality scoring algorithm (0–100) across 5 dimensions:
  - Maintenance (0–20): based on last commit recency
  - CI/Tests (0–20): CI pipeline and test directory detection
  - Documentation (0–20): README length and examples presence
  - Popularity (0–20): GitHub stars
  - Compatibility (0–20): number of supported platforms
- Publisher auto-creation from GitHub repository owners
- Repo structure inspection via GitHub Tree API (single request per repo)
- Crawl state tracking: skip recently-scanned repos, retry failed ones first
- 10-minute hard timeout + 60-second per-repo timeout
- Configurable via environment variables (max repos, min stars, crawl interval)
- Scheduled mode (`--schedule`) with APScheduler for continuous operation

#### Shared Packages (monorepo internal)
- `@vanta/types` — TypeScript type definitions shared across web and API (`private`, not published to npm)
- `@vanta/core` — board definitions, semver utilities, quality score helpers (`private`, not published to npm)

#### Infrastructure
- Turborepo monorepo with pnpm workspaces
- Docker Compose with PostgreSQL 16 and optional pgAdmin
- Drizzle Kit migrations
- `.env.example` templates for all apps

### Security
- All secrets loaded via environment variables (no hardcoded tokens)
- `.gitignore` excludes `.env` files, `__pycache__`, `node_modules`, sensitive PDFs
- GitHub API requests use authenticated token with minimal scopes

---

_This changelog tracks the monorepo as a whole. Individual package versions are in sync._
