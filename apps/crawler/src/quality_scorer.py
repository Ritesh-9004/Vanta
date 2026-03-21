"""
Vanta Crawler — Quality Scorer
Computes a 0-100 quality score from repo + extracted metadata signals.
Mirrors the TypeScript implementation in @vanta/core.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from .github_crawler import RawRepo
from .metadata_extractor import ExtractedMeta

logger = logging.getLogger(__name__)


@dataclass
class QualityResult:
    total: int
    maintenance: int
    ci_tests: int
    documentation: int
    popularity: int
    compatibility: int


def compute_quality(repo: RawRepo, meta: ExtractedMeta) -> QualityResult:
    """
    Score breakdown (each 0-20, total 0-100):
      - maintenance: recency of commits (heavily weighted for recency)
      - ci_tests: has CI + has tests
      - documentation: README length + has examples
      - popularity: stars + downloads (future)
      - compatibility: # platforms × # frameworks
    
    Key tuning:
      - Abandoned repos (2+ years) get harsh penalty
      - Recent activity (< 30 days) gets max
      - Popularity now bins more conservatively
      - Total can range from ~15 (abandoned) to 100 (excellent)
    """

    # ── Maintenance (0-20, HEAVILY WEIGHTED FOR RECENCY) ────────────────────────────────
    # This is the single most important quality signal:
    # - Recent (< 7 days): 20
    # - Regular (< 90 days): 16  
    # - Stale (< 365 days): 8
    # - Old (< 730 days/2 yrs): 3
    # - Abandoned (2+ years): 0
    now = datetime.now(timezone.utc)
    days_since_push = (now - repo.pushed_at.replace(tzinfo=timezone.utc)).days
    if days_since_push <= 7:
        maintenance = 20
    elif days_since_push <= 30:
        maintenance = 18
    elif days_since_push < 90:
        maintenance = 14
    elif days_since_push < 180:
        maintenance = 10
    elif days_since_push < 365:
        maintenance = 6
    elif days_since_push < 730:  # 2 years
        maintenance = 2
    else:  # 2+ years abandoned
        maintenance = 0

    # ── CI & Tests (0-20) ─────────────────────────────────
    # These are important but secondary to maintenance
    ci_tests = 0
    if meta.has_ci:
        ci_tests += 8
    if meta.has_tests:
        ci_tests += 12

    # ── Documentation (0-20) ──────────────────────────────
    # Substantial documentation is important for library usage
    readme_len = len(meta.readme_content)
    if readme_len > 5000:
        documentation = 16
    elif readme_len > 2000:
        documentation = 13
    elif readme_len > 800:
        documentation = 10
    elif readme_len > 200:
        documentation = 6
    else:
        documentation = 2

    # Examples are highly valued (libraries should show how to use them)
    if meta.has_examples:
        documentation = min(documentation + 4, 20)

    # ── Popularity (0-20) ─────────────────────────────────
    # More conservative on popularity — quality isn't just about stargazers
    stars = repo.stars
    if stars >= 1000:
        popularity = 18
    elif stars >= 300:
        popularity = 14
    elif stars >= 100:
        popularity = 11
    elif stars >= 30:
        popularity = 7
    elif stars >= 10:
        popularity = 4
    else:
        popularity = 1

    # Cap at 20 (downloads bonus reserved for future)
    popularity = min(popularity, 20)

    # ── Compatibility (0-20) ──────────────────────────────────
    # More platforms/frameworks = wider applicability = higher score
    plat_count = len(set(meta.platforms) - {"unknown"})
    fw_count = len(set(meta.frameworks) - {"bare-metal"})
    
    # Score: up to 12 for platforms, up to 8 for frameworks
    compat_score = min(plat_count * 3, 12) + min(fw_count * 4, 8)
    compatibility = min(compat_score, 20)

    total = maintenance + ci_tests + documentation + popularity + compatibility

    result = QualityResult(
        total=total,
        maintenance=maintenance,
        ci_tests=ci_tests,
        documentation=documentation,
        popularity=popularity,
        compatibility=compatibility,
    )
    logger.debug(
        "Quality for %s: %d (M=%d CI=%d D=%d P=%d C=%d)",
        repo.name,
        total,
        maintenance,
        ci_tests,
        documentation,
        popularity,
        compatibility,
    )
    return result
