import type { Package, PackageSummary, PaginatedResponse } from "@vanta/types";

/** Registry base URL — override with VANTA_REGISTRY env var */
const REGISTRY_URL =
  process.env.VANTA_REGISTRY ?? "https://vantapm.onrender.com";

export function getRegistryUrl(): string {
  return REGISTRY_URL;
}

export async function checkRegistryHealth(): Promise<{
  ok: boolean;
  url: string;
  checkedPath?: string;
  status?: number;
  error?: string;
}> {
  const candidates = ["/health", "/"];

  for (const path of candidates) {
    try {
      const response = await fetch(`${REGISTRY_URL}${path}`);
      if (response.ok) {
        return {
          ok: true,
          url: REGISTRY_URL,
          checkedPath: path,
          status: response.status,
        };
      }

      if (path === "/") {
        return {
          ok: false,
          url: REGISTRY_URL,
          checkedPath: path,
          status: response.status,
          error: `Registry responded with HTTP ${response.status}`,
        };
      }
    } catch (error: any) {
      if (path === "/") {
        return {
          ok: false,
          url: REGISTRY_URL,
          checkedPath: path,
          error: error?.message ?? "Unknown network error",
        };
      }
    }
  }

  return {
    ok: false,
    url: REGISTRY_URL,
    error: "Unable to verify registry connectivity",
  };
}

/**
 * Search the registry for packages.
 */
export async function searchPackages(
  query: string,
  filters?: { platform?: string; framework?: string }
): Promise<PaginatedResponse<PackageSummary> & { query: string }> {
  const params = new URLSearchParams({ q: query });
  if (filters?.platform) params.set("platform", filters.platform);
  if (filters?.framework) params.set("framework", filters.framework);

  let res: Response;
  try {
    res = await fetch(`${REGISTRY_URL}/search?${params}`);
  } catch {
    throw new Error(
      `Unable to connect to registry at ${REGISTRY_URL}. If developing locally, start API (bun run --cwd apps/api dev) and set VANTA_REGISTRY (PowerShell: $env:VANTA_REGISTRY=\"http://localhost:4000\").`
    );
  }
  if (!res.ok) {
    throw new Error(
      `Registry unreachable (${res.status}). Is the API running at ${REGISTRY_URL}?`
    );
  }
  return res.json();
}

/**
 * Get full details for a specific package.
 */
export async function getPackage(name: string): Promise<Package> {
  let res: Response;
  try {
    res = await fetch(`${REGISTRY_URL}/packages/${encodeURIComponent(name)}`);
  } catch {
    throw new Error(
      `Unable to connect to registry at ${REGISTRY_URL}. If developing locally, start API (bun run --cwd apps/api dev) and set VANTA_REGISTRY (PowerShell: $env:VANTA_REGISTRY=\"http://localhost:4000\").`
    );
  }
  if (res.status === 404) {
    throw new Error(
      `Package "${name}" not found in registry. Try: vanta search ${name}`
    );
  }
  if (!res.ok) {
    throw new Error(`Registry error (${res.status}) fetching "${name}".`);
  }
  return res.json();
}

/**
 * Download a tarball to a local path.
 * Returns the byte length written.
 */
export async function downloadTarball(
  tarballUrl: string,
  destPath: string
): Promise<number> {
  const res = await fetch(tarballUrl);
  if (!res.ok) {
    throw new Error(`Failed to download tarball: ${res.status} ${tarballUrl}`);
  }
  const buffer = await res.arrayBuffer();
  await Bun.write(destPath, buffer);
  return buffer.byteLength;
}
