"""
Vanta Crawler — Metadata Extractor
Inspects repo files to detect platforms, frameworks, peripherals, and manifest data.
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass, field

import httpx

from .config import config
from .github_crawler import RawRepo

logger = logging.getLogger(__name__)

RAW_URL = "https://raw.githubusercontent.com/{full_name}/{branch}/{path}"

# ── Polite HTTP settings ───────────────────────────────────────────────────
# raw.githubusercontent.com is a CDN — no robots.txt blocks API consumers,
# but we still delay between fetches to avoid hammering the CDN.
_HTTP_DELAY_SECONDS: float = 0.5   # between each file fetch within a repo
_HTTP_TIMEOUT: float = 10.0        # per-request timeout


@dataclass
class ExtractedMeta:
    """Structured metadata extracted from a repo's files."""

    name: str = ""
    display_name: str = ""
    description: str = ""
    version: str = "0.0.0"
    license: str | None = None
    category: str = "other"
    platforms: list[str] = field(default_factory=list)
    frameworks: list[str] = field(default_factory=list)
    peripherals: list[str] = field(default_factory=list)
    sensors: list[str] = field(default_factory=list)
    dependencies: dict[str, str] = field(default_factory=dict)
    readme_content: str = ""
    has_ci: bool = False
    has_tests: bool = False
    has_examples: bool = False


async def _fetch_file(client: httpx.AsyncClient, full_name: str, branch: str, path: str) -> str | None:
    url = RAW_URL.format(full_name=full_name, branch=branch, path=path)
    try:
        resp = await client.get(url, follow_redirects=True, timeout=_HTTP_TIMEOUT)
        await asyncio.sleep(_HTTP_DELAY_SECONDS)  # polite delay after every fetch
        if resp.status_code == 200:
            return resp.text
    except httpx.HTTPError:
        pass
    return None


def _detect_platforms(text: str, topics: list[str]) -> list[str]:
    combined = (text + " " + " ".join(topics)).lower()
    found = []
    for platform, keywords in config.PLATFORM_INDICATORS.items():
        if any(kw in combined for kw in keywords):
            found.append(platform)
    return found or ["unknown"]


def _detect_frameworks(text: str, topics: list[str], files_found: list[str]) -> list[str]:
    combined = (text + " " + " ".join(topics) + " " + " ".join(files_found)).lower()
    found = []
    for framework, keywords in config.FRAMEWORK_INDICATORS.items():
        if keywords and any(kw.lower() in combined for kw in keywords):
            found.append(framework)
    return found or ["bare-metal"]


_CATEGORY_PATTERNS: dict[str, list[str]] = {
    "connectivity": ["wifi", "bluetooth", "ble", "mqtt", "http", "websocket", "tcp", "udp", "lora", "zigbee", "thread", "espnow", "mesh"],
    "sensor": ["sensor", "imu", "accelerometer", "gyroscope", "magnetometer", "temperature", "humidity", "pressure", "bme", "bmp", "mpu"],
    "display": ["display", "lcd", "oled", "tft", "lvgl", "epaper", "e-ink", "ili9341", "ssd1306", "st7789"],
    "motor": ["motor", "servo", "stepper", "pwm", "bldc", "esc"],
    "storage": ["sd card", "flash", "eeprom", "spiffs", "littlefs", "fatfs", "nvs"],
    "protocol": ["modbus", "can", "i2c", "spi", "uart", "rs485", "dmx", "onewire", "1-wire"],
    "audio": ["audio", "i2s", "dac", "codec", "mp3", "wav", "microphone"],
    "security": ["crypto", "tls", "ssl", "encryption", "aes", "rsa", "ecdsa", "secure boot"],
    "system": ["rtos", "ota", "bootloader", "watchdog", "power management", "sleep", "deep sleep"],
    "camera": ["camera", "ov2640", "ov5640", "esp32-cam"],
}


def _detect_category(text: str) -> str:
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for cat, keywords in _CATEGORY_PATTERNS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[cat] = score
    if scores:
        return max(scores, key=scores.get)  # type: ignore[arg-type]
    return "other"


async def extract_metadata(repo: RawRepo) -> ExtractedMeta:
    """Fetch key files from a repo and extract structured metadata."""
    meta = ExtractedMeta()
    meta.name = repo.name.lower().replace(" ", "-")
    meta.display_name = repo.name.replace("-", " ").replace("_", " ").title()
    meta.description = repo.description
    meta.license = repo.license

    async with httpx.AsyncClient() as client:
        # Attempt to fetch manifest files
        files_checked: list[str] = []
        version_found_in_manifest = False

        # library.properties (Arduino)
        lib_props = await _fetch_file(client, repo.full_name, repo.default_branch, "library.properties")
        if lib_props:
            files_checked.append("library.properties")
            for line in lib_props.splitlines():
                if line.startswith("name="):
                    meta.display_name = line.split("=", 1)[1].strip()
                elif line.startswith("version="):
                    meta.version = line.split("=", 1)[1].strip()
                    version_found_in_manifest = True
                elif line.startswith("sentence="):
                    meta.description = meta.description or line.split("=", 1)[1].strip()
                elif line.startswith("category="):
                    meta.category = line.split("=", 1)[1].strip().lower()
                elif line.startswith("architectures="):
                    archs = line.split("=", 1)[1].strip().lower().split(",")
                    for arch in archs:
                        arch = arch.strip()
                        if arch in config.PLATFORM_INDICATORS:
                            meta.platforms.append(arch)

        # idf_component.yml (ESP-IDF)
        idf_yml = await _fetch_file(client, repo.full_name, repo.default_branch, "idf_component.yml")
        if idf_yml:
            files_checked.append("idf_component.yml")
            if "esp32" not in meta.platforms:
                meta.platforms.append("esp32")
            if "espidf" not in meta.frameworks:
                meta.frameworks.append("espidf")
            # Try to extract version from idf_component.yml if not already found
            for line in idf_yml.splitlines():
                if line.startswith("version:") and not version_found_in_manifest:
                    v = line.split(":", 1)[1].strip().strip('"\'')
                    if v:
                        meta.version = v
                        version_found_in_manifest = True
                        break

        # README
        for readme_name in ["README.md", "readme.md", "README.rst", "README"]:
            readme = await _fetch_file(client, repo.full_name, repo.default_branch, readme_name)
            if readme:
                meta.readme_content = readme
                files_checked.append(readme_name)
                break

        # CI / Test / Example detection via GitHub Tree API (1 request instead of 9)
        # raw.githubusercontent.com CANNOT serve directories (always 400),
        # so we use the Git Trees API to inspect the repo structure.
        tree_url = f"https://api.github.com/repos/{repo.full_name}/git/trees/{repo.default_branch}"
        headers = {}
        if config.GITHUB_TOKEN:
            headers["Authorization"] = f"token {config.GITHUB_TOKEN}"
        try:
            tree_resp = await client.get(tree_url, headers=headers, follow_redirects=True, timeout=_HTTP_TIMEOUT)
            await asyncio.sleep(_HTTP_DELAY_SECONDS)
            if tree_resp.status_code == 200:
                tree_data = tree_resp.json()
                entries = {item["path"].lower(): item["type"] for item in tree_data.get("tree", [])}

                # CI detection
                if ".github" in entries:
                    meta.has_ci = True
                    files_checked.append(".github/workflows")
                elif ".travis.yml" in entries:
                    meta.has_ci = True
                    files_checked.append(".travis.yml")
                elif ".circleci" in entries:
                    meta.has_ci = True
                    files_checked.append(".circleci/config.yml")

                # Test detection
                for test_dir in ["test", "tests", "spec"]:
                    if test_dir in entries and entries[test_dir] == "tree":
                        meta.has_tests = True
                        break

                # Example detection
                for ex_dir in ["examples", "example", "demos"]:
                    if ex_dir in entries and entries[ex_dir] == "tree":
                        meta.has_examples = True
                        break
            else:
                logger.debug("Tree API returned %d for %s", tree_resp.status_code, repo.full_name)
        except Exception as exc:
            logger.debug("Tree API failed for %s: %s", repo.full_name, exc)

        # Fetch latest version from GitHub releases if not found in manifest
        if not version_found_in_manifest or meta.version == "0.0.0":
            try:
                releases_url = f"https://api.github.com/repos/{repo.full_name}/releases/latest"
                rel_headers = {"Authorization": f"token {config.GITHUB_TOKEN}"} if config.GITHUB_TOKEN else {}
                resp = await client.get(releases_url, headers=rel_headers, follow_redirects=True, timeout=_HTTP_TIMEOUT)
                if resp.status_code == 200:
                    release_data = resp.json()
                    tag_name = release_data.get("tag_name", "").strip()
                    if tag_name:
                        # Clean version string (remove 'v' prefix, etc.)
                        clean_version = re.sub(r'^[vV]', '', tag_name).strip()
                        # Only accept if it looks like a version
                        if clean_version and any(c.isdigit() for c in clean_version):
                            meta.version = clean_version
                            logger.debug(f"Latest release for {repo.full_name}: {clean_version}")
            except Exception as exc:
                logger.debug(f"Could not fetch releases for {repo.full_name}: {exc}")

    # Detect from combined text
    combined_text = f"{repo.description} {meta.readme_content} {' '.join(repo.topics)}"
    if not meta.platforms:
        meta.platforms = _detect_platforms(combined_text, repo.topics)
    if not meta.frameworks:
        meta.frameworks = _detect_frameworks(combined_text, repo.topics, files_checked)
    if meta.category == "other":
        meta.category = _detect_category(combined_text)

    return meta
