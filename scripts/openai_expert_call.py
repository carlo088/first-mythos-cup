#!/usr/bin/env python3
"""Call the OpenAI Responses API without exposing the API key.

Usage:
  OPENAI_API_KEY=... python3 scripts/openai_expert_call.py \
    --prompt-file /path/to/prompt.txt

The key may also be read from /opt/data/.env when OPENAI_API_KEY is not
already exported. The script prints only the returned model text.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_URL = "https://api.openai.com/v1/responses"
DEFAULT_ENV_FILE = Path("/opt/data/.env")


def read_env_value(name: str, env_file: Path = DEFAULT_ENV_FILE) -> str | None:
    """Read one simple KEY=value entry without printing or persisting it."""
    value = os.environ.get(name)
    if value:
        return value
    if not env_file.is_file():
        return None
    prefix = f"{name}="
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if line.startswith(prefix):
            return line[len(prefix) :].strip().strip("\"'") or None
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt-file", type=Path, required=True)
    parser.add_argument(
        "--model",
        default=os.environ.get("OPENAI_MODEL")
        or os.environ.get("HERMES_MODEL")
        or "gpt-4o",
    )
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE)
    args = parser.parse_args()

    api_key = read_env_value("OPENAI_API_KEY", args.env_file)
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is not configured")
    prompt = args.prompt_file.read_text(encoding="utf-8")
    if not prompt.strip():
        raise SystemExit("Prompt file is empty")

    body = json.dumps(
        {
            "model": args.model,
            "input": prompt,
        }
    ).encode("utf-8")
    request = Request(
        API_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=180) as response:
            payload = json.load(response)
    except HTTPError as error:
        # Report status only; never include request headers or the key.
        raise SystemExit(f"OpenAI API returned HTTP {error.code}") from error
    except URLError as error:
        raise SystemExit(f"OpenAI API request failed: {error.reason}") from error

    output = payload.get("output_text")
    if not output:
        # Keep a useful failure message while avoiding dumping the full payload.
        raise SystemExit("OpenAI response did not contain output_text")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
