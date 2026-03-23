import chalk from "chalk";
import { checkRegistryHealth, getRegistryUrl } from "../core/registry.js";
import { log } from "../utils/logger.js";

export async function doctorCommand() {
  const registryUrl = getRegistryUrl();

  console.log();
  log.info(chalk.bold("Vanta Doctor"));
  log.dim(`Registry URL: ${registryUrl}`);

  const health = await checkRegistryHealth();

  if (health.ok) {
    log.success(
      `Registry reachable at ${health.url}${health.checkedPath ?? ""} (HTTP ${health.status ?? 200})`
    );
    log.info("Search/install should work.");
    return;
  }

  log.error("Registry is not reachable.");
  if (health.error) {
    log.dim(`Reason: ${health.error}`);
  }

  console.log();
  log.info("Fix options:");
  log.plain(`  ${chalk.green("1)")} Use deployed API in this shell:`);
  log.plain(
    `     ${chalk.dim('$env:VANTA_REGISTRY="https://your-api-url"')}`
  );
  log.plain(`  ${chalk.green("2)")} For local development:`);
  log.plain(`     ${chalk.dim('bun run --cwd apps/api dev')}`);
  log.plain(
    `     ${chalk.dim('$env:VANTA_REGISTRY="http://localhost:4000"')}`
  );

  process.exit(1);
}
