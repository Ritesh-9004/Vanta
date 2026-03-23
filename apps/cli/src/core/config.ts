import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import TOML from "@iarna/toml";
import { findProjectRoot } from "../utils/paths.js";

export interface VantaConfig {
  project: {
    name: string;
    version: string;
  };
  target: {
    board: string;
    chip: string;
    framework: string;
    language?: string;
    firmware_target?: string;
  };
  dependencies: Record<string, string>;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function tomlKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
}

export function serializeConfig(config: VantaConfig): string {
  const dependencies = config.dependencies ?? {};
  const dependencyEntries = Object.entries(dependencies);

  const lines: string[] = [
    "[project]",
    `name = ${tomlString(config.project.name)}`,
    `version = ${tomlString(config.project.version)}`,
    "",
    "[target]",
    `board = ${tomlString(config.target.board)}`,
    `chip = ${tomlString(config.target.chip)}`,
    `framework = ${tomlString(config.target.framework)}`,
  ];

  if (config.target.language) {
    lines.push(`language = ${tomlString(config.target.language)}`);
  }
  if (config.target.firmware_target) {
    lines.push(`firmware_target = ${tomlString(config.target.firmware_target)}`);
  }

  lines.push("", "[dependencies]");
  for (const [name, version] of dependencyEntries) {
    lines.push(`${tomlKey(name)} = ${tomlString(version)}`);
  }

  return `${lines.join("\n")}\n`;
}

/**
 * Read vanta.toml from the project root.
 * Returns null if not found.
 */
export function readConfig(cwd = process.cwd()): VantaConfig | null {
  const root = findProjectRoot(cwd);
  if (!root) return null;
  const configPath = join(root, "vanta.toml");
  if (!existsSync(configPath)) return null;
  const content = readFileSync(configPath, "utf-8");
  const parsed = TOML.parse(content) as unknown as VantaConfig;
  // Ensure dependencies section exists
  if (!parsed.dependencies) parsed.dependencies = {};
  return parsed;
}

/**
 * Write a VantaConfig back to vanta.toml
 */
export function writeConfig(config: VantaConfig, cwd = process.cwd()) {
  const root = findProjectRoot(cwd) ?? cwd;
  const configPath = join(root, "vanta.toml");
  writeFileSync(configPath, serializeConfig(config));
}

/**
 * Add a dependency to vanta.toml [dependencies]
 */
export function addDependency(name: string, version: string, cwd = process.cwd()) {
  const config = readConfig(cwd);
  if (!config) throw new Error("No vanta.toml found. Run `vanta init` first.");
  config.dependencies[name] = `^${version}`;
  writeConfig(config, cwd);
}
