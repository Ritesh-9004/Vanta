import { CompatChips } from "@/components/CompatChips";
import { MemoryWidget } from "@/components/MemoryWidget";
import { QualityBreakdown } from "@/components/QualityBreakdown";
import { VersionList } from "@/components/VersionList";
import { CompatMatrix } from "@/components/CompatMatrix";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  let pkg;
  try {
    const res = await fetch(`${api}/packages/${name}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      notFound();
    }
    pkg = await res.json();
  } catch (error) {
    console.error(`Failed to fetch package ${name}:`, error);
    notFound();
  }

  // Provide fallback values if fields are missing from real data
  const qualityBreakdown =
    pkg.quality_breakdown || {
      maintenance: 0,
      ci_tests: 0,
      documentation: 0,
      popularity: 0,
      compatibility: 0,
    };

  // Fallback version list from versions array if available
  const versions = pkg.versions || [];

  // Fallback compatibility list from compatibility array if available
  const compatibility = pkg.compatibility || [];

  // Fallback dependencies list if available
  const dependencies = pkg.dependencies || [];

  const displayPublisher = pkg.publisher?.display_name || pkg.publisher?.name || pkg.publisher_name || pkg.github_owner || "unknown";

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_170px] lg:items-start">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-accent-green)]">●</span>
            <h1 className="font-[family-name:var(--font-syne)] text-5xl font-bold tracking-tight">
              {pkg.name}
            </h1>
          </div>

          <p className="text-2xl text-[var(--color-text-secondary)]">
            v{pkg.latest_version} — published by{" "}
            <span className="text-[var(--color-accent-green)]">{displayPublisher}</span>
          </p>

          <div className="flex flex-wrap gap-2">
            {pkg.platforms && <CompatChips platforms={pkg.platforms} />}
            {pkg.frameworks?.map((framework: string) => (
              <span
                key={framework}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-xs uppercase text-[var(--color-text-secondary)]"
              >
                {framework}
              </span>
            ))}
          </div>

          <p className="max-w-4xl text-3xl leading-relaxed text-[var(--color-text-secondary)]">
            {pkg.description}
          </p>
        </div>

        <aside className="card-surface p-6 text-center">
          <div className="text-7xl font-bold text-[var(--color-accent-green)]">
            {pkg.quality_score}
          </div>
          <p className="mt-2 text-sm uppercase tracking-widest text-[var(--color-text-muted)]">
            quality score
          </p>
          <p className="mt-4 text-xl text-[var(--color-text-secondary)]">
            ♥ {pkg.stars?.toLocaleString() || 0} likes
          </p>
        </aside>
      </section>

      <section className="card-surface p-6">
        <h2 className="mb-4 font-[family-name:var(--font-mono)] text-sm uppercase tracking-widest text-[var(--color-accent-green)]">
          Install
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {["esp32pm", "Arduino IDE", "ESP-IDF", "PlatformIO"].map((option) => (
            <span
              key={option}
              className="rounded-md border border-[var(--color-border)] px-3 py-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-secondary)]"
            >
              {option}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
          <code className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-accent-green)]">
            esp32pm install {pkg.name}
          </code>
          <button
            type="button"
            className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)]"
          >
            copy
          </button>
        </div>
      </section>

      <section className="space-y-6">
        {compatibility.length > 0 && (
          <section className="card-surface p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-[family-name:var(--font-syne)] text-xl font-semibold">
                ESP32 Variant Compatibility
              </h2>
              <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                CI-tested on real hardware + QEMU emulation
              </p>
            </div>
            <CompatMatrix rows={compatibility} />
          </section>
        )}

        {pkg.memory && (
          <section className="card-surface p-6">
            <h2 className="mb-4 font-[family-name:var(--font-syne)] text-xl font-semibold">
              Memory Footprint
            </h2>
            <MemoryWidget memory={pkg.memory} />
          </section>
        )}

        <section className="card-surface p-6">
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-xl font-semibold">
            Quality Score Breakdown
          </h2>
          <QualityBreakdown breakdown={qualityBreakdown} total={pkg.quality_score} />
        </section>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {versions.length > 0 && (
          <section className="card-surface p-6">
            <h3 className="mb-4 font-[family-name:var(--font-syne)] text-lg font-semibold">
              Version History
            </h3>
            <VersionList versions={versions} />
          </section>
        )}

        <section className="space-y-6">
          {dependencies.length > 0 && (
            <section className="card-surface p-6">
              <h3 className="mb-3 font-[family-name:var(--font-syne)] text-lg font-semibold">
                Dependencies
              </h3>
              <ul className="space-y-2">
                {dependencies.map((dep: { name: string; version?: string }) => (
                  <li key={dep.name} className="flex items-center justify-between">
                    <a
                      href={`/packages/${dep.name}`}
                      className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-accent-blue)] hover:underline"
                    >
                      {dep.name}
                    </a>
                    {dep.version && (
                      <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-text-muted)]">
                        {dep.version}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card-surface p-6">
            <h3 className="mb-3 font-[family-name:var(--font-syne)] text-lg font-semibold">
              Links
            </h3>
            <ul className="space-y-2 text-sm">
              {pkg.repository && (
                <li>
                  <a
                    href={pkg.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent-blue)] hover:underline"
                  >
                    GitHub Repository →
                  </a>
                </li>
              )}
              {pkg.homepage && (
                <li>
                  <a
                    href={pkg.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent-blue)] hover:underline"
                  >
                    Official Website →
                  </a>
                </li>
              )}
              {pkg.repository && (
                <li>
                  <a
                    href={`${pkg.repository}/issues`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent-blue)] hover:underline"
                  >
                    Report Issue →
                  </a>
                </li>
              )}
            </ul>
          </section>
        </section>
      </section>
    </div>
  );
}
