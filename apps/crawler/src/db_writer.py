"""
Vanta Crawler — Database Writer
Upserts discovered packages and versions into PostgreSQL.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import psycopg
from psycopg.rows import dict_row

from .config import config
from .github_crawler import RawRepo
from .metadata_extractor import ExtractedMeta
from .quality_scorer import QualityResult

logger = logging.getLogger(__name__)


def _get_connection() -> psycopg.Connection:
    return psycopg.connect(config.DATABASE_URL, row_factory=dict_row)


def upsert_package(repo: RawRepo, meta: ExtractedMeta, quality: QualityResult) -> None:
    """Insert or update a package row. Creates publisher if needed."""
    conn = _get_connection()
    try:
        with conn.cursor() as cur:
            # Upsert publisher
            owner = repo.full_name.split("/")[0]
            cur.execute(
                """
                INSERT INTO publishers (name, display_name, avatar_url)
                VALUES (%s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    avatar_url = EXCLUDED.avatar_url
                RETURNING id
                """,
                (
                    owner,
                    owner,
                    f"https://github.com/{owner}.png",
                ),
            )
            publisher_row = cur.fetchone()
            publisher_id = publisher_row["id"] if publisher_row else None
            if not publisher_id:
                logger.error("Failed to get publisher_id for %s", owner)
                raise Exception(f"Publisher creation failed for {owner}")

            # Quality breakdown as JSON
            quality_breakdown = json.dumps(
                {
                    "maintenance": quality.maintenance,
                    "ci_tests": quality.ci_tests,
                    "documentation": quality.documentation,
                    "popularity": quality.popularity,
                    "compatibility": quality.compatibility,
                }
            )

            # Upsert package
            # Combine readme content with name/description for full-text search
            search_text = f"{meta.name} {meta.display_name} {meta.description} {meta.readme_content[:1000]}".lower()
            
            cur.execute(
                """
                INSERT INTO packages (
                    name, display_name, description, publisher_id,
                    latest_version, license,
                    repository, github_owner, github_repo,
                    stars, open_issues_count,
                    frameworks, platforms, peripherals, sensors, category,
                    quality_score, quality_breakdown,
                    has_ci, has_tests, has_examples,
                    readme_length,
                    search_text,
                    updated_at
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s,
                    %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s,
                    %s,
                    %s,
                    %s
                )
                ON CONFLICT (name) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    description = EXCLUDED.description,
                    publisher_id = EXCLUDED.publisher_id,
                    latest_version = EXCLUDED.latest_version,
                    license = EXCLUDED.license,
                    repository = EXCLUDED.repository,
                    github_owner = EXCLUDED.github_owner,
                    github_repo = EXCLUDED.github_repo,
                    stars = EXCLUDED.stars,
                    open_issues_count = EXCLUDED.open_issues_count,
                    frameworks = EXCLUDED.frameworks,
                    platforms = EXCLUDED.platforms,
                    peripherals = EXCLUDED.peripherals,
                    sensors = EXCLUDED.sensors,
                    category = EXCLUDED.category,
                    quality_score = EXCLUDED.quality_score,
                    quality_breakdown = EXCLUDED.quality_breakdown,
                    has_ci = EXCLUDED.has_ci,
                    has_tests = EXCLUDED.has_tests,
                    has_examples = EXCLUDED.has_examples,
                    readme_length = EXCLUDED.readme_length,
                    search_text = EXCLUDED.search_text,
                    updated_at = EXCLUDED.updated_at
                """,
                (
                    meta.name,
                    meta.display_name,
                    meta.description,
                    publisher_id,
                    meta.version,
                    meta.license or "unknown",
                    repo.url,
                    repo.full_name.split("/")[0],
                    repo.full_name.split("/")[1],
                    repo.stars,
                    repo.open_issues,
                    json.dumps(meta.frameworks),
                    json.dumps(meta.platforms),
                    json.dumps(meta.peripherals),
                    json.dumps(meta.sensors),
                    meta.category,
                    quality.total,
                    quality_breakdown,
                    meta.has_ci,
                    meta.has_tests,
                    meta.has_examples,
                    len(meta.readme_content),
                    search_text,
                    datetime.now(timezone.utc),
                ),
            )

            conn.commit()
            logger.info("Upserted package: %s (quality=%d)", meta.name, quality.total)

    except Exception as exc:
        conn.rollback()
        logger.error("Failed to upsert %s: %s", meta.name, exc)
        raise
    finally:
        conn.close()
