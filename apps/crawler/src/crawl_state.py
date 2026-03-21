"""
Vanta Crawler — Crawl State
Persists per-repo crawl outcomes to support smarter reruns.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import psycopg
from psycopg.rows import dict_row

from .config import config
from .github_crawler import RawRepo

logger = logging.getLogger(__name__)


def _get_connection() -> psycopg.Connection:
    return psycopg.connect(config.DATABASE_URL, row_factory=dict_row)


def ensure_crawl_state_table() -> None:
    """Create crawl_state table if it doesn't exist."""
    conn = _get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS crawl_state (
                    repo_full_name TEXT PRIMARY KEY,
                    last_status TEXT NOT NULL CHECK (last_status IN ('success', 'failed')),
                    last_success_at TIMESTAMPTZ,
                    last_error_at TIMESTAMPTZ,
                    last_error TEXT,
                    retry_count INTEGER NOT NULL DEFAULT 0,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_crawl_state_status_error
                ON crawl_state(last_status, last_error_at DESC)
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_crawl_state_success
                ON crawl_state(last_success_at DESC)
                """
            )
        conn.commit()
    finally:
        conn.close()


def _load_state_map() -> dict[str, dict]:
    conn = _get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    repo_full_name,
                    last_status,
                    last_success_at,
                    retry_count
                FROM crawl_state
                """
            )
            rows = cur.fetchall()
            return {row["repo_full_name"]: row for row in rows}
    finally:
        conn.close()


def prepare_repo_queue(repos: list[RawRepo]) -> tuple[list[RawRepo], dict[str, int]]:
    """
    Build crawl queue with persisted awareness:
      - failed repos prioritized first (optional)
      - recently successful repos skipped until rescan window expires
    """
    ensure_crawl_state_table()
    state_map = _load_state_map()

    cutoff = datetime.now(timezone.utc) - timedelta(
        hours=config.RESCAN_SUCCESS_AFTER_HOURS
    )

    failed: list[tuple[RawRepo, int]] = []
    fresh_or_retryable: list[RawRepo] = []
    skipped_recent_success = 0

    for repo in repos:
        state = state_map.get(repo.full_name)
        if not state:
            fresh_or_retryable.append(repo)
            continue

        status = state.get("last_status")
        retry_count = int(state.get("retry_count") or 0)

        if status == "failed":
            failed.append((repo, retry_count))
            continue

        last_success_at = state.get("last_success_at")
        if last_success_at and last_success_at > cutoff:
            skipped_recent_success += 1
            continue

        fresh_or_retryable.append(repo)

    failed.sort(key=lambda item: item[1], reverse=True)
    failed_repos = [repo for repo, _ in failed]

    if config.RETRY_FAILED_FIRST:
        queue = failed_repos + fresh_or_retryable
    else:
        queue = fresh_or_retryable + failed_repos

    metrics = {
        "discovered": len(repos),
        "failed_priority": len(failed_repos),
        "skipped_recent_success": skipped_recent_success,
        "queued": len(queue),
    }

    logger.info(
        "Queue prepared: discovered=%d queued=%d failed_priority=%d skipped_recent_success=%d",
        metrics["discovered"],
        metrics["queued"],
        metrics["failed_priority"],
        metrics["skipped_recent_success"],
    )

    return queue, metrics


def mark_repo_success(repo_full_name: str) -> None:
    """Mark repo crawl success and reset retry count."""
    conn = _get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO crawl_state (
                    repo_full_name,
                    last_status,
                    last_success_at,
                    last_error,
                    retry_count,
                    updated_at
                )
                VALUES (%s, 'success', NOW(), NULL, 0, NOW())
                ON CONFLICT (repo_full_name) DO UPDATE SET
                    last_status = 'success',
                    last_success_at = NOW(),
                    last_error = NULL,
                    retry_count = 0,
                    updated_at = NOW()
                """,
                (repo_full_name,),
            )
        conn.commit()
    finally:
        conn.close()


def mark_repo_failure(repo_full_name: str, error_message: str) -> None:
    """Mark repo crawl failure and increment retry count."""
    trimmed_error = (error_message or "unknown error")[:2000]
    conn = _get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO crawl_state (
                    repo_full_name,
                    last_status,
                    last_error_at,
                    last_error,
                    retry_count,
                    updated_at
                )
                VALUES (%s, 'failed', NOW(), %s, 1, NOW())
                ON CONFLICT (repo_full_name) DO UPDATE SET
                    last_status = 'failed',
                    last_error_at = NOW(),
                    last_error = EXCLUDED.last_error,
                    retry_count = crawl_state.retry_count + 1,
                    updated_at = NOW()
                """,
                (repo_full_name, trimmed_error),
            )
        conn.commit()
    finally:
        conn.close()
