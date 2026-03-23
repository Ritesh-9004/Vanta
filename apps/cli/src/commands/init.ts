import { select, input } from "@inquirer/prompts";
import { writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { join, basename, resolve } from "path";
import chalk from "chalk";
import { log } from "../utils/logger.js";
import { writeConfig, type VantaConfig } from "../core/config.js";

const MCU_FAMILIES = [
  { name: "ESP32", value: "esp32" },
  { name: "STM32", value: "stm32" },
  { name: "RP2040 / RP2350", value: "rp" },
  { name: "AVR", value: "avr" },
  { name: "nRF52", value: "nrf52" },
];

const BOARDS = [
  { name: "ESP32-DevKitC-V4", value: "esp32-devkitc-v4", chip: "esp32" },
  { name: "ESP32-S3-DevKitC-1", value: "esp32-s3-devkitc-1", chip: "esp32s3" },
  { name: "ESP32-C3-DevKitM-1", value: "esp32-c3-devkitm-1", chip: "esp32c3" },
  { name: "ESP32-S2-Saola-1", value: "esp32-s2-saola-1", chip: "esp32s2" },
  { name: "ESP32-C6-DevKitC-1", value: "esp32-c6-devkitc-1", chip: "esp32c6" },
  { name: "STM32 Nucleo-F446RE", value: "nucleo-f446re", chip: "stm32" },
  { name: "Raspberry Pi Pico", value: "rpi-pico", chip: "rp2040" },
  { name: "Raspberry Pi Pico 2", value: "rpi-pico2", chip: "rp2350" },
  { name: "Arduino Uno R3", value: "arduino-uno", chip: "avr" },
  { name: "Arduino Nano ESP32", value: "arduino-nano-esp32", chip: "esp32s3" },
  { name: "Adafruit Feather nRF52840", value: "feather-nrf52840", chip: "nrf52" },
];

const FRAMEWORKS = [
  { name: "Arduino", value: "arduino" },
  { name: "ESP-IDF", value: "espidf" },
  { name: "MicroPython", value: "micropython" },
  { name: "Zephyr RTOS", value: "zephyr" },
  { name: "STM32 HAL", value: "stm32hal" },
  { name: "Pico SDK", value: "picoSDK" },
  { name: "Bare Metal", value: "bare-metal" },
];

const LANGUAGES = [
  { name: "C", value: "c" },
  { name: "C++", value: "cpp" },
  { name: "Python", value: "python" },
  { name: "Rust", value: "rust" },
];

function mapChipToFamily(chip: string) {
  if (chip.startsWith("esp32")) return "esp32";
  if (chip.startsWith("stm32")) return "stm32";
  if (chip.startsWith("rp")) return "rp";
  if (chip.startsWith("avr")) return "avr";
  if (chip.startsWith("nrf")) return "nrf52";
  return "esp32";
}

export async function initCommand() {
  const cwd = process.cwd();

  console.log();
  log.info("Initializing new vanta project...\n");

  // Project name — default to folder name
  const defaultName = basename(cwd).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const projectName = await input({
    message: "Project name:",
    default: defaultName,
  });

  const projectDirInput = await input({
    message: "Project folder:",
    default: projectName,
  });
  const requestedPath = resolve(cwd, projectDirInput);
  let projectRoot = requestedPath;

  // If user gives an existing directory, create project inside it.
  // Example: D:\\Desktop\\Projects -> D:\\Desktop\\Projects\\my-app
  if (existsSync(requestedPath) && statSync(requestedPath).isDirectory()) {
    projectRoot = join(requestedPath, projectName);
  }

  if (existsSync(join(projectRoot, "vanta.toml"))) {
    log.warn(`vanta.toml already exists in ${projectRoot}`);
    return;
  }

  if (existsSync(projectRoot)) {
    if (!statSync(projectRoot).isDirectory()) {
      log.error(`Project folder path is not a directory: ${projectRoot}`);
      return;
    }
  } else {
    mkdirSync(projectRoot, { recursive: true });
  }

  const mcuFamily = await select({
    message: "Target MCU family:",
    choices: MCU_FAMILIES,
  });

  const boardsForFamily = BOARDS.filter((b) => mapChipToFamily(b.chip) === mcuFamily);

  // Target board
  const boardChoice = await select({
    message: "Target board:",
    choices: boardsForFamily.map((b) => ({ name: b.name, value: b.value })),
  });
  const board = BOARDS.find((b) => b.value === boardChoice)!;

  // Framework
  const framework = await select({
    message: "Framework:",
    choices: FRAMEWORKS.map((f) => ({ name: f.name, value: f.value })),
  });

  const language = framework === "micropython"
    ? "python"
    : await select({
        message: "Primary language:",
        choices: LANGUAGES.filter((l) => l.value !== "python"),
      });

  const firmwareTrack = await select({
    message: "Firmware target:",
    choices: [
      { name: "Stable", value: "stable" },
      { name: "Latest", value: "latest" },
      { name: "Custom version", value: "custom" },
    ],
  });

  const firmwareTarget = firmwareTrack === "custom"
    ? await input({
        message: "Enter firmware version/tag:",
        default: "latest",
      })
    : firmwareTrack;

  // Build config
  const config: VantaConfig = {
    project: {
      name: projectName,
      version: "0.1.0",
    },
    target: {
      board: board.value,
      chip: board.chip,
      framework,
      language,
      firmware_target: firmwareTarget,
    },
    dependencies: {},
  };

  // Write vanta.toml
  writeConfig(config, projectRoot);
  log.success("Created vanta.toml");

  // Create src/main.cpp if it doesn't exist
  const srcDir = join(projectRoot, "src");
  if (!existsSync(srcDir)) {
    mkdirSync(srcDir, { recursive: true });
    const mainContent = framework === "arduino"
      ? `#include <Arduino.h>\n\nvoid setup() {\n  Serial.begin(115200);\n  Serial.println("Hello from ${projectName}!");\n}\n\nvoid loop() {\n  // your code here\n}\n`
      : framework === "espidf"
        ? `#include <stdio.h>\n#include "freertos/FreeRTOS.h"\n#include "freertos/task.h"\n\nvoid app_main(void) {\n    printf("Hello from ${projectName}!\\n");\n    while (1) {\n        vTaskDelay(pdMS_TO_TICKS(1000));\n    }\n}\n`
        : language === "c"
          ? `// ${projectName} — main entry point\n\nint main(void) {\n  return 0;\n}\n`
          : language === "python"
            ? `print("Hello from ${projectName}!")\n`
            : language === "rust"
              ? `fn main() {\n    println!("Hello from ${projectName}!");\n}\n`
              : `// ${projectName} — main entry point\n\nint main() {\n    return 0;\n}\n`;
    const ext = framework === "espidf"
      ? "c"
      : language === "c"
        ? "c"
        : language === "python"
          ? "py"
          : language === "rust"
            ? "rs"
            : "cpp";
    writeFileSync(join(srcDir, `main.${ext}`), mainContent);
    log.success(`Created src/main.${ext}`);
  }

  // Create .gitignore
  if (!existsSync(join(projectRoot, ".gitignore"))) {
    writeFileSync(
      join(projectRoot, ".gitignore"),
      `.vanta/\nbuild/\n*.o\n*.elf\n*.bin\n*.hex\n.DS_Store\n`
    );
    log.success("Created .gitignore");
  }

  // Create .vanta/ directory
  mkdirSync(join(projectRoot, ".vanta", "packages"), { recursive: true });

  console.log();
  log.info(`Project created at ${chalk.cyan(projectRoot)}`);
  log.info(
    `Next: ${chalk.green("vanta search <query>")} to find libraries, then ${chalk.green("vanta install <package>")} to add them.`
  );
}
