#!/usr/bin/env python3
"""Read-only Global Fishing Watch vessel identity client."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request


BASE_URL = "https://gateway.api.globalfishingwatch.org/v3/vessels"
DATASET = "public-global-vessel-identity:latest"
SAFE_QUERY = re.compile(r"^[A-Za-z0-9 ._+/'-]{1,120}$")
SAFE_VESSEL_ID = re.compile(r"^[A-Za-z0-9_-]{1,160}$")


def request_json(url: str, token: str) -> object:
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def search_url(query: str, limit: int) -> str:
    if not SAFE_QUERY.fullmatch(query):
        raise ValueError("query must be 1-120 safe vessel-identity characters")
    if not 1 <= limit <= 50:
        raise ValueError("limit must be between 1 and 50")
    params = urllib.parse.urlencode(
        {"query": query, "datasets[0]": DATASET, "limit": str(limit)}
    )
    return f"{BASE_URL}/search?{params}"


def resolve_url(vessel_id: str) -> str:
    if not SAFE_VESSEL_ID.fullmatch(vessel_id):
        raise ValueError("invalid vessel ID")
    params = urllib.parse.urlencode({"dataset": DATASET})
    quoted = urllib.parse.quote(vessel_id, safe="")
    return f"{BASE_URL}/{quoted}?{params}"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    search = subparsers.add_parser("search")
    search.add_argument("query")
    search.add_argument("--limit", type=int, default=10)
    resolve = subparsers.add_parser("resolve")
    resolve.add_argument("vessel_id")
    args = parser.parse_args(argv)

    token = os.environ.get("GFW_API_TOKEN", "").strip()
    if not token:
        print("GFW_API_TOKEN is not configured", file=sys.stderr)
        return 2

    try:
        url = search_url(args.query, args.limit) if args.command == "search" else resolve_url(args.vessel_id)
        data = request_json(url, token)
        print(json.dumps(data, indent=2, sort_keys=True))
        return 0
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2
    except urllib.error.HTTPError as error:
        print(f"Global Fishing Watch returned HTTP {error.code}", file=sys.stderr)
        return 1
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f"Global Fishing Watch request failed: {type(error).__name__}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
