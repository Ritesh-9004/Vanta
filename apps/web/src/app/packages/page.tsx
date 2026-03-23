import { SearchBar } from "@/components/SearchBar";
import { FeaturedPackages } from "@/components/FeaturedPackages";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function PackagesPage() {
  const categories = ["all", "sensor", "display", "communication", "iot", "motor", "audio", "ai", "security", "power", "filesystem", "protocol", "storage", "utility"];
  const frameworks = ["arduino", "espidf", "micropython", "zephyr", "stm32hal", "picoSDK"];
  const platforms = ["esp32", "esp32s3", "esp32c3", "esp32c6", "stm32", "rp2040", "nrf52", "avr", "samd"];
  const qualityBands = [
    { label: "90-100", min: 90 },
    { label: "70-89", min: 70 },
    { label: "50-69", min: 50 },
    { label: "0-49", min: 0 },
  ];

  const categoryLabel: Record<string, string> = {
    all: "All packages",
    sensor: "Sensors",
    display: "Displays",
    communication: "Communication",
    iot: "IOT / Cloud",
    motor: "Motor / Actuator",
    audio: "Audio / DSP",
    ai: "AI / TinyML",
    security: "Security",
    power: "Power Mgmt",
    filesystem: "File Systems",
    protocol: "Protocol",
    storage: "Storage",
    utility: "Utility",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold">
          Packages
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Browse the registry with live filters and quality-driven ranking.
        </p>
      </div>

      <SearchBar />

      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="card-surface h-fit p-4 lg:sticky lg:top-20">
          <div className="space-y-6">
            <section>
              <p className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
                Category
              </p>
              <div className="space-y-1.5 text-sm">
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    href={cat === "all" ? "/packages" : `/packages?category=${cat}`}
                    className="block rounded-md px-2.5 py-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                  >
                    {categoryLabel[cat]}
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
                Framework
              </p>
              <div className="space-y-1.5 text-sm">
                {frameworks.map((framework) => (
                  <Link
                    key={framework}
                    href={`/packages?framework=${framework}`}
                    className="block rounded-md px-2.5 py-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                  >
                    {framework === "espidf" ? "ESP-IDF" : framework}
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
                Target chip
              </p>
              <div className="space-y-1.5 text-sm">
                {platforms.map((platform) => (
                  <Link
                    key={platform}
                    href={`/packages?platform=${platform}`}
                    className="block rounded-md px-2.5 py-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                  >
                    {platform.toUpperCase()}
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
                Quality
              </p>
              <div className="space-y-1.5 text-sm">
                {qualityBands.map((band) => (
                  <Link
                    key={band.label}
                    href={`/packages?min_quality=${band.min}`}
                    className="block rounded-md px-2.5 py-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                  >
                    {band.label}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </aside>

        <section>
          <Suspense
            fallback={
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-sm text-[var(--color-text-muted)]">
                Loading packages...
              </div>
            }
          >
            <FeaturedPackages limit={30} layout="list" />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
