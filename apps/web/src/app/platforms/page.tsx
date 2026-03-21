import Link from "next/link";

type FamilySection = {
  id: string;
  family: string;
  description: string;
  packageFilter: string;
  frameworks: string[];
  variants: Array<{
    name: string;
    specs: string;
  }>;
};

const FAMILIES: FamilySection[] = [
  {
    id: "esp32",
    family: "ESP32 family",
    description: "Wi-Fi/Bluetooth MCU family by Espressif.",
    packageFilter: "esp32",
    frameworks: ["Arduino", "ESP-IDF", "MicroPython"],
    variants: [
      { name: "ESP32-S2", specs: "1× Xtensa LX7 @ 240MHz, USB OTG, Wi-Fi" },
      { name: "ESP32-S3", specs: "2× Xtensa LX7 @ 240MHz, vector instructions, Wi-Fi + BLE 5" },
      { name: "ESP32-C3", specs: "1× RISC-V @ 160MHz, Wi-Fi + BLE 5" },
      { name: "ESP32-C6", specs: "1× RISC-V, Wi-Fi 6 + BLE 5 + 802.15.4" },
      { name: "ESP32-H2", specs: "1× RISC-V, BLE 5 + 802.15.4 (Thread/Zigbee), no Wi-Fi" },
      { name: "ESP32-P4", specs: "High-performance dual-core RISC-V + AI/graphics acceleration" },
    ],
  },
  {
    id: "stm32",
    family: "STM32 family",
    description: "ARM Cortex-M MCU family by STMicroelectronics.",
    packageFilter: "stm32",
    frameworks: ["STM32 HAL", "Arduino (selected boards)", "Zephyr"],
    variants: [
      { name: "STM32F1", specs: "Cortex-M3, mainstream control" },
      { name: "STM32F4", specs: "Cortex-M4, DSP + floating point" },
      { name: "STM32H7", specs: "Cortex-M7, high performance" },
      { name: "STM32L4", specs: "Cortex-M4, ultra-low power" },
    ],
  },
  {
    id: "rp2040",
    family: "RP2040",
    description: "Dual-core Cortex-M0+ MCU used in Raspberry Pi Pico boards.",
    packageFilter: "rp2040",
    frameworks: ["Pico SDK", "Arduino", "MicroPython", "Zephyr"],
    variants: [
      { name: "RP2040", specs: "2× Cortex-M0+ @ 133MHz, PIO blocks, 264KB SRAM" },
    ],
  },
  {
    id: "nrf52",
    family: "nRF52",
    description: "Bluetooth Low Energy MCU family by Nordic Semiconductor.",
    packageFilter: "nrf52",
    frameworks: ["nRF5 SDK", "Zephyr", "Arduino (selected boards)"],
    variants: [
      { name: "nRF52832", specs: "Cortex-M4 + BLE 5" },
      { name: "nRF52840", specs: "Cortex-M4F + BLE 5 + USB + 802.15.4" },
    ],
  },
  {
    id: "avr",
    family: "AVR",
    description: "Classic 8-bit MCU family (ATmega / ATtiny).",
    packageFilter: "avr",
    frameworks: ["Arduino", "Bare-metal"],
    variants: [
      { name: "ATmega328P", specs: "8-bit AVR, 32KB Flash, Arduino Uno class" },
      { name: "ATmega2560", specs: "8-bit AVR, 256KB Flash, Arduino Mega class" },
    ],
  },
  {
    id: "samd",
    family: "SAMD",
    description: "Microchip Cortex-M0+/M4 family for modern Arduino-class boards.",
    packageFilter: "samd",
    frameworks: ["Arduino", "Bare-metal", "Zephyr (selected boards)"],
    variants: [
      { name: "SAMD21", specs: "Cortex-M0+ low power" },
      { name: "SAMD51", specs: "Cortex-M4F higher performance" },
    ],
  },
];

async function getPlatformPackageCount(platform: string): Promise<number> {
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  try {
    const url = new URL(`${api}/packages`);
    url.searchParams.set("page", "1");
    url.searchParams.set("per_page", "1");
    url.searchParams.set("platform", platform);

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return 0;

    const data = await response.json();
    return Number(data?.total || 0);
  } catch {
    return 0;
  }
}

export default async function PlatformsPage() {
  const counts = await Promise.all(
    FAMILIES.map((family) => getPlatformPackageCount(family.packageFilter))
  );

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold">Browse by hardware</h1>
        <p className="mt-2 max-w-3xl text-[var(--color-text-secondary)]">
          Pick your MCU family and jump straight to compatible libraries. If you have an ESP32-S3,
          STM32, RP2040, nRF52, AVR, or SAMD target, start here.
        </p>
      </section>

      <div className="space-y-6">
        {FAMILIES.map((family, index) => {
          const packageCount = counts[index] ?? 0;

          return (
          <section key={family.id} className="card-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-[family-name:var(--font-syne)] text-2xl font-semibold">
                  {family.family}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{family.description}</p>
              </div>

              <div className="text-right">
                <p className="font-[family-name:var(--font-mono)] text-2xl font-semibold text-[var(--color-accent-green)]">
                  {packageCount.toLocaleString()}
                </p>
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">packages</p>
                <Link
                  href={`/packages?platform=${family.packageFilter}`}
                  className="mt-2 inline-block rounded-md border border-[var(--color-accent-green)] px-3 py-1.5 text-xs text-[var(--color-accent-green)] hover:bg-[var(--color-bg-hover)]"
                >
                  View filtered packages
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
                  Framework support
                </p>
                <div className="flex flex-wrap gap-2">
                  {family.frameworks.map((framework) => (
                    <span
                      key={`${family.id}-${framework}`}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-secondary)]"
                    >
                      {framework}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
                  Chips and specs
                </p>
                <ul className="space-y-2">
                  {family.variants.map((variant) => (
                    <li
                      key={`${family.id}-${variant.name}`}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5"
                    >
                      <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-text-primary)]">
                        {variant.name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{variant.specs}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
          );
        })}
      </div>
    </div>
  );
}
