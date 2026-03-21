import type { Platform, Framework, MemoryFootprint } from "@vanta/types";

export interface BoardDefinition {
  id: string;
  name: string;
  platform: Platform;
  frameworks: Framework[];
  flash_kb: number;
  ram_kb: number;
  cpu: string;
  frequency_mhz: number;
}

export const BOARDS: BoardDefinition[] = [
  // ─── ESP32 family ────────────────────────────
  {
    id: "esp32-devkitc-v4",
    name: "ESP32 DevKitC V4",
    platform: "esp32",
    frameworks: ["arduino", "espidf", "micropython"],
    flash_kb: 4096,
    ram_kb: 520,
    cpu: "Xtensa LX6 dual-core",
    frequency_mhz: 240,
  },
  {
    id: "esp32s2-devkitm-1",
    name: "ESP32-S2 DevKitM-1",
    platform: "esp32s2",
    frameworks: ["arduino", "espidf", "micropython"],
    flash_kb: 4096,
    ram_kb: 320,
    cpu: "Xtensa LX7 single-core",
    frequency_mhz: 240,
  },
  {
    id: "esp32s3-devkitc-1",
    name: "ESP32-S3 DevKitC-1",
    platform: "esp32s3",
    frameworks: ["arduino", "espidf", "micropython"],
    flash_kb: 8192,
    ram_kb: 512,
    cpu: "Xtensa LX7 dual-core",
    frequency_mhz: 240,
  },
  {
    id: "esp32c3-devkitm-1",
    name: "ESP32-C3 DevKitM-1",
    platform: "esp32c3",
    frameworks: ["arduino", "espidf", "micropython"],
    flash_kb: 4096,
    ram_kb: 400,
    cpu: "RISC-V single-core",
    frequency_mhz: 160,
  },
  {
    id: "esp32c6-devkitc-1",
    name: "ESP32-C6 DevKitC-1",
    platform: "esp32c6",
    frameworks: ["arduino", "espidf"],
    flash_kb: 4096,
    ram_kb: 512,
    cpu: "RISC-V single-core",
    frequency_mhz: 160,
  },
  {
    id: "esp32h2-devkitm-1",
    name: "ESP32-H2 DevKitM-1",
    platform: "esp32h2",
    frameworks: ["espidf"],
    flash_kb: 4096,
    ram_kb: 320,
    cpu: "RISC-V single-core",
    frequency_mhz: 96,
  },
  {
    id: "esp32p4-function-ev",
    name: "ESP32-P4 Function EV Board",
    platform: "esp32p4",
    frameworks: ["espidf"],
    flash_kb: 16384,
    ram_kb: 768,
    cpu: "RISC-V dual-core HP + LP",
    frequency_mhz: 400,
  },

  // ─── STM32 family ────────────────────────────
  {
    id: "stm32f411-blackpill",
    name: "STM32F411 BlackPill",
    platform: "stm32",
    frameworks: ["arduino", "stm32hal", "zephyr"],
    flash_kb: 512,
    ram_kb: 128,
    cpu: "ARM Cortex-M4",
    frequency_mhz: 100,
  },
  {
    id: "stm32f103-bluepill",
    name: "STM32F103 BluePill",
    platform: "stm32",
    frameworks: ["arduino", "stm32hal"],
    flash_kb: 64,
    ram_kb: 20,
    cpu: "ARM Cortex-M3",
    frequency_mhz: 72,
  },

  // ─── Raspberry Pi Pico family ────────────────
  {
    id: "rp2040-pico",
    name: "Raspberry Pi Pico",
    platform: "rp2040",
    frameworks: ["arduino", "picoSDK", "micropython"],
    flash_kb: 2048,
    ram_kb: 264,
    cpu: "ARM Cortex-M0+ dual-core",
    frequency_mhz: 133,
  },
  {
    id: "rp2040-pico-w",
    name: "Raspberry Pi Pico W",
    platform: "rp2040",
    frameworks: ["arduino", "picoSDK", "micropython"],
    flash_kb: 2048,
    ram_kb: 264,
    cpu: "ARM Cortex-M0+ dual-core",
    frequency_mhz: 133,
  },

  // ─── Nordic nRF52 family ─────────────────────
  {
    id: "nrf52840-dk",
    name: "nRF52840 DK",
    platform: "nrf52",
    frameworks: ["arduino", "zephyr"],
    flash_kb: 1024,
    ram_kb: 256,
    cpu: "ARM Cortex-M4F",
    frequency_mhz: 64,
  },
];

export function getBoardByName(id: string): BoardDefinition | undefined {
  return BOARDS.find((b) => b.id === id);
}

export function getBoardsByPlatform(platform: Platform): BoardDefinition[] {
  return BOARDS.filter((b) => b.platform === platform);
}
