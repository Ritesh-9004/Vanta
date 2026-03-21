import type { QualityBreakdown } from "@vanta/types";

/**
 * Input signals from GitHub + registry for computing quality score.
 */
export interface QualityScoringInput {
  /** ISO date of last commit */
  last_commit_at: string;
  /** Whether the repo has CI (GitHub Actions, etc.) */
  has_ci: boolean;
  /** Whether the repo has a non-trivial test suite */
  has_tests: boolean;
  /** README byte length */
  readme_length: number;
  /** Whether an examples/ directory exists */
  has_examples: boolean;
  /** GitHub star count */
  stars: number;
  /** Total download count from the registry */
  downloads: number;
  /** Number of declared target platforms */
  declared_platforms: number;
  /** Number of declared frameworks */
  declared_frameworks: number;
  /** Ratio of open issues to total issues (0-1, lower is better) */
  open_issues_ratio: number;
}

/**
 * Compute a 0–100 quality score from GitHub signals.
 *
 * Breakdown (max 100):
 *  - Maintenance (0-20): based on last commit recency
 *  - CI & Tests  (0-20): has CI + has tests
 *  - Documentation (0-20): README quality + has examples
 *  - Popularity (0-20): stars + downloads
 *  - Compatibility (0-20): declared platforms + frameworks
 */
export function computeQualityScore(input: QualityScoringInput): {
  total: number;
  breakdown: QualityBreakdown;
} {
  const now = Date.now();
  const lastCommit = new Date(input.last_commit_at).getTime();
  const daysSinceCommit = Math.max(0, (now - lastCommit) / (1000 * 60 * 60 * 24));

  // ── Maintenance (0-20) ──
  let maintenance = 20;
  if (daysSinceCommit > 365 * 3) maintenance = 0;
  else if (daysSinceCommit > 365 * 2) maintenance = 4;
  else if (daysSinceCommit > 365) maintenance = 8;
  else if (daysSinceCommit > 180) maintenance = 12;
  else if (daysSinceCommit > 60) maintenance = 16;
  // else 20 (recent)

  // ── CI & Tests (0-20) ──
  let ci_tests = 0;
  if (input.has_ci) ci_tests += 10;
  if (input.has_tests) ci_tests += 10;

  // ── Documentation (0-20) ──
  let documentation = 0;
  // README quality: 0-10
  if (input.readme_length > 5000) documentation += 10;
  else if (input.readme_length > 2000) documentation += 7;
  else if (input.readme_length > 500) documentation += 4;
  else if (input.readme_length > 100) documentation += 2;
  // Has examples: 0-10
  if (input.has_examples) documentation += 10;

  // ── Popularity (0-20) ──
  let popularity = 0;
  // Stars: 0-10
  if (input.stars >= 1000) popularity += 10;
  else if (input.stars >= 200) popularity += 8;
  else if (input.stars >= 50) popularity += 6;
  else if (input.stars >= 10) popularity += 3;
  else if (input.stars >= 1) popularity += 1;
  // Downloads: 0-10
  if (input.downloads >= 100_000) popularity += 10;
  else if (input.downloads >= 10_000) popularity += 8;
  else if (input.downloads >= 1_000) popularity += 5;
  else if (input.downloads >= 100) popularity += 3;
  else if (input.downloads >= 1) popularity += 1;

  // ── Compatibility (0-20) ──
  let compatibility = 0;
  // Platforms declared: 0-10
  compatibility += Math.min(10, input.declared_platforms * 2);
  // Frameworks declared: 0-10
  compatibility += Math.min(10, input.declared_frameworks * 3);

  // Penalize high open issues ratio
  if (input.open_issues_ratio > 0.8) {
    maintenance = Math.max(0, maintenance - 4);
  }

  const breakdown: QualityBreakdown = {
    maintenance,
    ci_tests,
    documentation,
    popularity,
    compatibility,
  };

  const total = maintenance + ci_tests + documentation + popularity + compatibility;

  return { total: Math.min(100, total), breakdown };
}
