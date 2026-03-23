import { SearchBar } from "@/components/SearchBar";
import { PlatformGrid } from "@/components/PlatformGrid";
import { FeaturedPackages } from "@/components/FeaturedPackages";
import { StatsBar } from "@/components/StatsBar";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* ── Hero Section ─────────────────────────────────── */}
      <section className="flex flex-col items-center pt-12 text-center">
        <h1 className="font-[family-name:var(--font-syne)] text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
          <span className="text-[var(--color-accent-green)] glow-green">
            vanta
          </span>{" "}
          install anything.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--color-text-secondary)]">
          The universal package registry for microcontrollers. Discover
          libraries with quality scores, memory maps, and instant compatibility
          checks — across every major MCU platform.
        </p>

        {/* Search */}
        <div className="mt-8 w-full max-w-xl">
          <SearchBar />
        </div>

        {/* Quick-install hint */}
        <div className="mt-4 flex items-center gap-2 font-[family-name:var(--font-mono)] text-sm text-[var(--color-text-muted)]">
          <span className="text-[var(--color-accent-green)]">$</span>
          <code>vanta install &lt;library&gt;</code>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────── */}
      <StatsBar />

      {/* ── Platform Grid ────────────────────────────────── */}
      <section>
        <h2 className="mb-6 font-[family-name:var(--font-syne)] text-2xl font-semibold">
          Supported Platforms
        </h2>
        <PlatformGrid />
      </section>

      {/* ── Featured / Top Rated ─────────────────────────── */}
      <section>
        <h2 className="mb-6 font-[family-name:var(--font-syne)] text-2xl font-semibold">
          Top Rated Packages
        </h2>
        <Suspense
          fallback={
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-sm text-[var(--color-text-muted)]">
              Loading packages...
            </div>
          }
        >
          <FeaturedPackages />
        </Suspense>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section className="grid gap-6 sm:grid-cols-3">
        {[
          {
            step: "01",
            title: "Search",
            desc: "Find libraries by name, platform, peripheral, or category. Every package has a quality score.",
          },
          {
            step: "02",
            title: "Compare",
            desc: "Check compatibility matrices, memory footprints, and dependency trees before you commit.",
          },
          {
            step: "03",
            title: "Install",
            desc: "One command to add to your project. Lock files ensure reproducible builds.",
          },
        ].map((item) => (
          <div key={item.step} className="card-surface p-6">
            <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-accent-green)]">
              {item.step}
            </span>
            <h3 className="mt-2 font-[family-name:var(--font-syne)] text-lg font-semibold">
              {item.title}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {item.desc}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
