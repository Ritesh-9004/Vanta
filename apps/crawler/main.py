"""
Vanta Crawler — Main Entry Point
Runs discovery → extraction → scoring → DB write pipeline.
Can be executed as a one-shot or scheduled via APScheduler.
"""

from __future__ import annotations

import asyncio
import logging
import sys
import time

from apscheduler.schedulers.blocking import BlockingScheduler

from src.config import config
from src.crawl_state import prepare_repo_queue, mark_repo_failure, mark_repo_success
from src.github_crawler import discover_repos
from src.metadata_extractor import extract_metadata
from src.quality_scorer import compute_quality
from src.db_writer import upsert_package

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("vanta.crawler")


async def crawl_pipeline() -> None:
    """Full crawl: discover → extract → score → write (with timeouts)."""
    start_time = time.time()
    max_crawl_duration = 10 * 60  # 10 minute hard limit
    
    logger.info("=== Starting crawl pipeline ===")

    # 1. Discover repos from GitHub
    discovered_repos = discover_repos()
    logger.info("Phase 1 complete: %d repos discovered", len(discovered_repos))

    repos, _ = prepare_repo_queue(discovered_repos)

    # 2-4. For each repo: extract metadata, score, write
    success = 0
    errors = 0
    timeouts = 0
    processed = 0
    for repo in repos:
        # Check if we've exceeded total crawl time
        elapsed = time.time() - start_time
        if elapsed > max_crawl_duration:
            logger.warning(
                "Crawl timeout: exceeded %.0f seconds. Stopping processing.",
                max_crawl_duration,
            )
            break
        
        if processed >= config.MAX_REPOS_PER_RUN:
            logger.info(
                "Reached MAX_REPOS_PER_RUN cap (%d). Stopping processing.",
                config.MAX_REPOS_PER_RUN,
            )
            break
        
        try:
            # Per-repo timeout: 60 seconds max
            meta = await asyncio.wait_for(extract_metadata(repo), timeout=60.0)
            quality = compute_quality(repo, meta)
            upsert_package(repo, meta, quality)
            mark_repo_success(repo.full_name)
            success += 1
        except asyncio.TimeoutError:
            timeouts += 1
            logger.warning("Timeout processing %s (>60s). Marking as failed.", repo.full_name)
            mark_repo_failure(repo.full_name, "extract_metadata timeout (>60s)")
        except Exception as exc:
            errors += 1
            logger.error("Failed processing %s: %s", repo.full_name, exc)
            mark_repo_failure(repo.full_name, str(exc))
        finally:
            processed += 1

    elapsed = time.time() - start_time
    logger.info(
        "=== Crawl complete (%.1fs): %d processed, %d success, %d errors, %d timeouts ===",
        elapsed,
        processed,
        success,
        errors,
        timeouts,
    )


def run_once() -> None:
    """Execute a single crawl run."""
    asyncio.run(crawl_pipeline())


def run_scheduled() -> None:
    """Run crawls on a schedule using APScheduler."""
    scheduler = BlockingScheduler()
    scheduler.add_job(
        run_once,
        "interval",
        hours=config.CRAWL_INTERVAL_HOURS,
        id="vanta_crawl",
        name="Vanta GitHub Crawl",
    )
    # Run immediately on start, then on schedule
    run_once()
    logger.info(
        "Scheduler started — next crawl in %d hours", config.CRAWL_INTERVAL_HOURS
    )
    scheduler.start()


if __name__ == "__main__":
    if "--schedule" in sys.argv:
        run_scheduled()
    else:
        run_once()
