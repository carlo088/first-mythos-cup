#!/usr/bin/env python3
"""Persist orchestrator secrets safely, then launch the Hermes gateway."""

from __future__ import annotations

import os
import pathlib
import subprocess
import tempfile


HERMES_HOME = pathlib.Path(os.environ.get("HERMES_HOME", "/opt/data"))
ENV_PATH = HERMES_HOME / ".env"

SYNC_KEYS = (
    "OPENAI_API_KEY",
    "TELEGRAM_BOT_TOKEN",
    "GFW_API_TOKEN",
    "APP_URL",
    "HERMES_MODEL",
    "VESSEL_DATA_MODE",
)
# Pairing updates this entry; seed it only once so restarts do not erase grants.
SEED_ONCE_KEYS = ("TELEGRAM_ALLOWED_USERS",)


def parse_env(text: str) -> tuple[list[str], dict[str, str]]:
    lines = text.splitlines()
    values: dict[str, str] = {}
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value
    return lines, values


def quote_env(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'"{escaped}"'


def persist_environment() -> None:
    HERMES_HOME.mkdir(parents=True, exist_ok=True)
    existing = ENV_PATH.read_text(encoding="utf-8") if ENV_PATH.exists() else ""
    lines, values = parse_env(existing)

    updates: dict[str, str] = {}
    for key in SYNC_KEYS:
        value = os.environ.get(key, "")
        if value:
            updates[key] = value
    for key in SEED_ONCE_KEYS:
        value = os.environ.get(key, "")
        if value and not values.get(key):
            updates[key] = value

    if not updates:
        return

    output: list[str] = []
    replaced: set[str] = set()
    for line in lines:
        if "=" in line and not line.lstrip().startswith("#"):
            key = line.split("=", 1)[0].strip()
            if key in updates:
                output.append(f"{key}={quote_env(updates[key])}")
                replaced.add(key)
                continue
        output.append(line)
    for key in updates:
        if key not in replaced:
            output.append(f"{key}={quote_env(updates[key])}")

    payload = "\n".join(output).rstrip() + "\n"
    fd, temporary = tempfile.mkstemp(prefix=".env.", dir=HERMES_HOME)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o600)
        os.replace(temporary, ENV_PATH)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main() -> int:
    persist_environment()
    (HERMES_HOME / "workspace").mkdir(exist_ok=True)
    return subprocess.call(["hermes", "gateway", "run"])


if __name__ == "__main__":
    raise SystemExit(main())
