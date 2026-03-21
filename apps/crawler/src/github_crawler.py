"""
Vanta Crawler — GitHub Discovery
Searches GitHub for MCU libraries via the official REST API.

Ethical crawling policy
───────────────────────
• robots.txt does NOT apply here — we use GitHub's official REST API, not
  HTML scraping. GitHub explicitly allows API access under their ToS:
  https://docs.github.com/en/site-policy/github-terms/github-terms-of-service

• We DO respect GitHub's rate limits:
    - 5,000 core requests / hour  (authenticated)
    - 30  search requests / minute
  If we approach the limit we sleep until the reset window opens.

• We add a polite inter-request delay (POLITE_DELAY_SECONDS) between every
  search call so we never burst the secondary rate limit (undocumented but
  triggers HTTP 403 "secondary rate limit exceeded").

• Exponential backoff on transient errors, capped at MAX_BACKOFF_SECONDS.
"""

from __future__ import annotations

import logging
import time
import math
from dataclasses import dataclass
from datetime import datetime, timezone

from github import Github, RateLimitExceededException, GithubException
from github.Repository import Repository

from .config import config

logger = logging.getLogger(__name__)

# ── Ethical crawl constants ────────────────────────────────────────────────
POLITE_DELAY_SECONDS: float = 3.0   # wait between search queries (30 req/min limit)
RATE_LIMIT_BUFFER: int = 100        # pause if remaining requests drop below this
MAX_BACKOFF_SECONDS: float = 120.0  # exponential backoff ceiling


def _wait_for_rate_limit(gh: Github, resource: str = "search") -> None:
    """Block until GitHub rate limit resets if we're running low."""
    try:
        limits = gh.get_rate_limit()
        bucket = getattr(limits, resource)
        if bucket.remaining < RATE_LIMIT_BUFFER:
            reset_ts = bucket.reset.replace(tzinfo=timezone.utc).timestamp()
            wait = max(reset_ts - time.time() + 5, 0)
            logger.warning(
                "Rate limit low (%d remaining on '%s'). Sleeping %.0fs until reset.",
                bucket.remaining, resource, wait,
            )
            time.sleep(wait)
    except Exception as exc:
        logger.debug("Could not check rate limit: %s", exc)


def _log_rate_status(gh: Github) -> None:
    """Log current quota. Informational only."""
    try:
        limits = gh.get_rate_limit()
        logger.info(
            "GitHub quota — core: %d/%d  search: %d/%d",
            limits.core.remaining, limits.core.limit,
            limits.search.remaining, limits.search.limit,
        )
    except Exception:
        pass


@dataclass
class RawRepo:
    """Minimal snapshot of a GitHub repository."""

    full_name: str
    name: str
    description: str
    url: str
    clone_url: str
    stars: int
    forks: int
    open_issues: int
    license: str | None
    language: str | None
    topics: list[str]
    default_branch: str
    created_at: datetime
    updated_at: datetime
    pushed_at: datetime
    has_wiki: bool
    archived: bool


def _repo_to_raw(repo: Repository) -> RawRepo:
    return RawRepo(
        full_name=repo.full_name,
        name=repo.name,
        description=repo.description or "",
        url=repo.html_url,
        clone_url=repo.clone_url,
        stars=repo.stargazers_count,
        forks=repo.forks_count,
        open_issues=repo.open_issues_count,
        license=repo.license.spdx_id if repo.license else None,
        language=repo.language,
        topics=repo.get_topics(),
        default_branch=repo.default_branch,
        created_at=repo.created_at,
        updated_at=repo.updated_at,
        pushed_at=repo.pushed_at,
        has_wiki=repo.has_wiki,
        archived=repo.archived,
    )


def discover_repos() -> list[RawRepo]:
    """
    Run all configured search queries against GitHub's API and return a
    deduplicated list of repos that meet the minimum star threshold.

    Rate-limiting strategy (layered):
      1. Check quota BEFORE every search call — sleep if below buffer.
      2. Sleep POLITE_DELAY_SECONDS AFTER every search call.
      3. On RateLimitExceededException: sleep until reset + 5s, retry once.
      4. On other GithubException: exponential backoff, up to 3 attempts.
    """
    gh = Github(
        config.GITHUB_TOKEN,
        per_page=100,
        user_agent="vanta-crawler/1.0 (https://github.com/vanta-registry)",
    )

    _log_rate_status(gh)

    seen: set[str] = set()
    results: list[RawRepo] = []
    per_query_limit = max(
        1,
        math.ceil(config.MAX_REPOS_PER_RUN / len(config.SEARCH_QUERIES)),
    )

    for query_idx, query in enumerate(config.SEARCH_QUERIES, start=1):
        if len(results) >= config.MAX_REPOS_PER_RUN:
            logger.info(
                "Reached MAX_REPOS_PER_RUN cap (%d). Stopping discovery.",
                config.MAX_REPOS_PER_RUN,
            )
            break

        full_query = f"{query} stars:>={config.MIN_STARS} archived:false"
        logger.info("[%d/%d] Searching: %s", query_idx, len(config.SEARCH_QUERIES), full_query)

        # Layer 1: pre-flight rate limit check
        _wait_for_rate_limit(gh, resource="search")

        backoff = 2.0
        attempt = 0

        while attempt < 3:
            try:
                repos = gh.search_repositories(
                    query=full_query, sort="stars", order="desc"
                )
                count = 0
                for repo in repos:
                    if len(results) >= config.MAX_REPOS_PER_RUN:
                        break
                    if repo.full_name in seen or repo.archived:
                        continue
                    seen.add(repo.full_name)
                    results.append(_repo_to_raw(repo))
                    count += 1
                    if count >= per_query_limit:
                        break

                logger.info("  → %d new repos (running total: %d)", count, len(results))
                break  # success

            except RateLimitExceededException:
                logger.warning("Rate limit exceeded. Waiting for reset…")
                _wait_for_rate_limit(gh, resource="search")
                attempt += 1

            except GithubException as exc:
                wait = min(backoff, MAX_BACKOFF_SECONDS)
                logger.warning(
                    "GitHub error (attempt %d/3): %s — backing off %.0fs",
                    attempt + 1, exc, wait,
                )
                time.sleep(wait)
                backoff *= 2
                attempt += 1

            except Exception as exc:
                logger.error("Unexpected error on '%s': %s — skipping query.", query, exc)
                break

        # Layer 2: polite delay between every search query
        if query_idx < len(config.SEARCH_QUERIES):
            logger.debug("Polite delay: %.1fs", POLITE_DELAY_SECONDS)
            time.sleep(POLITE_DELAY_SECONDS)

    _log_rate_status(gh)
    logger.info("Discovery complete: %d unique repos", len(results))
    return results
