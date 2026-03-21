import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Syne } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vanta — Universal MCU Package Registry",
  description:
    "Discover, compare, and install firmware libraries for ESP32, STM32, RP2040, nRF52, AVR and more. Quality scores, memory maps, and compatibility at a glance.",
  keywords: [
    "MCU",
    "firmware",
    "package manager",
    "ESP32",
    "STM32",
    "RP2040",
    "nRF52",
    "Arduino",
    "ESP-IDF",
    "MicroPython",
    "Zephyr",
    "embedded",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable} ${syne.variable}`}
    >
      <body className="antialiased">
        {/* ── Top Navigation ───────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md">
          <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-syne)] text-lg font-bold tracking-tight">
              <span className="text-[var(--color-accent-green)] glow-green">
                ▸
              </span>
              <span>vanta</span>
            </a>

            <div className="flex items-center gap-6 text-sm text-[var(--color-text-secondary)]">
              <a href="/packages" className="transition-colors hover:text-[var(--color-text-primary)]">
                Packages
              </a>
              <a href="/platforms" className="transition-colors hover:text-[var(--color-text-primary)]">
                Platforms
              </a>
              <a href="/docs" className="transition-colors hover:text-[var(--color-text-primary)]">
                Docs
              </a>
              <a
                href="https://github.com/Ritesh-9004/Vanta"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-[var(--color-text-primary)]"
              >
                GitHub
              </a>
            </div>
          </nav>
        </header>

        {/* ── Page Content ─────────────────────────────────── */}
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className="border-t border-[var(--color-border)] py-8 text-center text-xs text-[var(--color-text-muted)]">
          <p>
            Built with{" "}
            <span className="text-[var(--color-accent-green)]">♥</span> for the
            embedded community
          </p>
          <p className="mt-1">Vanta — Universal MCU Package Registry</p>
        </footer>
      </body>
    </html>
  );
}
