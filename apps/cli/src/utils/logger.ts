import chalk from "chalk";

export function bannerText() {
  const title = chalk.bold.cyan("VANTA") + " " + chalk.bold("CLI");
  const subtitle = chalk.dim("Universal MCU package manager");
  const line = chalk.cyan("─".repeat(44));
  return `\n${line}\n${title}\n${subtitle}\n${line}`;
}

export function printBanner() {
  console.log(bannerText());
}

export const log = {
  info: (msg: string) => console.log(chalk.blue("ℹ") + " " + msg),
  success: (msg: string) => console.log(chalk.green("✓") + " " + chalk.green(msg)),
  warn: (msg: string) => console.log(chalk.yellow("⚠") + " " + chalk.yellow(msg)),
  error: (msg: string) => console.error(chalk.red("✗") + " " + chalk.red(msg)),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  plain: (msg: string) => console.log(msg),
};

/** Build a quality bar like ████████░░ 82 */
export function qualityBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  const bar = chalk.green("█".repeat(filled)) + chalk.dim("░".repeat(empty));
  const color =
    score >= 80 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;
  return `${bar} ${color(String(score))}`;
}

/** Pad a string to a fixed width */
export function pad(str: string, width: number): string {
  return str.length >= width ? str.slice(0, width) : str + " ".repeat(width - str.length);
}
