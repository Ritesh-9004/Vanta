"""
Vanta Crawler — Configuration
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://postgres:dev@localhost:5432/vanta"
    )
    CRAWL_INTERVAL_HOURS: int = int(os.getenv("CRAWL_INTERVAL_HOURS", "6"))
    MAX_REPOS_PER_RUN: int = int(os.getenv("MAX_REPOS_PER_RUN", "50"))
    MIN_STARS: int = int(os.getenv("MIN_STARS", "5"))
    RETRY_FAILED_FIRST: bool = os.getenv("RETRY_FAILED_FIRST", "true").lower() == "true"
    RESCAN_SUCCESS_AFTER_HOURS: int = int(
        os.getenv("RESCAN_SUCCESS_AFTER_HOURS", "24")
    )

    # Search queries to discover MCU libraries
    SEARCH_QUERIES: list[str] = [
        "esp32 library",
        "esp-idf component",
        "arduino library",
        "stm32 hal library",
        "rp2040 library",
        "pico sdk library",
        "nrf52 library",
        "zephyr module",
        "micropython library",
        "platformio library",
        "embedded firmware library",
        "mcu driver",
    ]

    # Platform detection patterns (filename/path → platform)
    PLATFORM_INDICATORS: dict[str, list[str]] = {
        "esp32": ["esp32", "esp-idf", "espidf", "espressif"],
        "stm32": ["stm32", "stm32hal", "stm32cube"],
        "rp2040": ["rp2040", "pico", "picosdk", "pico-sdk"],
        "nrf52": ["nrf52", "nrf5", "nordic", "softdevice"],
        "avr": ["avr", "atmega", "attiny"],
        "samd": ["samd", "samd21", "samd51"],
    }

    # Framework detection patterns
    FRAMEWORK_INDICATORS: dict[str, list[str]] = {
        "arduino": ["arduino", "Arduino.h", "library.properties", "platformio.ini"],
        "espidf": ["esp-idf", "idf_component.yml", "CMakeLists.txt", "sdkconfig"],
        "micropython": ["micropython", "boot.py", "main.py", "ufactory"],
        "zephyr": ["zephyr", "west.yml", "prj.conf", "Kconfig"],
        "stm32hal": ["stm32hal", "stm32cube"],
        "picoSDK": ["pico_sdk", "pico-sdk", "CMakeLists.txt"],
        "bare-metal": [],
    }


config = Config()
