#!/usr/bin/env bun
import { Command } from "commander";
import { searchCommand } from "./commands/search.js";
import { installCommand } from "./commands/install.js";
import { initCommand } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { doctorCommand } from "./commands/doctor.js";
import { printBanner } from "./utils/logger.js";

const program = new Command();

if (
  process.argv.length <= 2 ||
  process.argv.includes("--help") ||
  process.argv.includes("-h") ||
  process.argv[2] === "help"
) {
  printBanner();
}

program
  .name("vanta")
  .description("Universal MCU package manager")
  .version("0.2.1");

program.showHelpAfterError();
program.showSuggestionAfterError();
program.addHelpText(
  "after",
  `\nExamples:\n  $ vanta init\n  $ vanta doctor\n  $ vanta search wifi --platform esp32\n  $ vanta install bblanchon/ArduinoJson\n  $ vanta list\n`
);

program
  .command("init")
  .description("Initialize a new vanta project")
  .action(initCommand);

program
  .command("search <query>")
  .description("Search the vanta registry")
  .option("-p, --platform <platform>", "Filter by platform (esp32, stm32, rp2040)")
  .option("-f, --framework <framework>", "Filter by framework (arduino, espidf)")
  .action(searchCommand);

program
  .command("install [packages...]")
  .alias("i")
  .description("Install packages")
  .action(installCommand);

program
  .command("list")
  .alias("ls")
  .description("List installed packages")
  .action(listCommand);

program
  .command("doctor")
  .description("Check registry/API connectivity and environment")
  .action(doctorCommand);

program.parse();
