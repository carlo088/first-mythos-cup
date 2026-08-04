#!/usr/bin/env python3
"""Cost-gated MyShipTracking simple vessel lookup."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


KNOWN_MMSIS = {"247520340", "240576800", "240608700"}
ENDPOINT = "https://api.myshiptracking.com/api/v2/vessel"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mmsi")
    parser.add_argument(
        "--spend-credit",
        action="store_true",
        help="required acknowledgement that this request costs one credit",
    )
    args = parser.parse_args(argv)
    if args.mmsi not in KNOWN_MMSIS:
        print("MMSI is not in the First Mythos Cup fleet", file=sys.stderr)
        return 2
    if not args.spend_credit:
        print("refusing paid request without --spend-credit", file=sys.stderr)
        return 2
    key = os.environ.get("MYSHIPTRACKING_API_KEY", "").strip()
    if not key:
        print("MYSHIPTRACKING_API_KEY is not configured", file=sys.stderr)
        return 2

    query = urllib.parse.urlencode({"mmsi": args.mmsi, "response": "simple"})
    request = urllib.request.Request(
        f"{ENDPOINT}?{query}",
        headers={"x-api-key": key, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.load(response)
        data = payload.get("data") or {}
        if data.get("course") == 511:
            data["course"] = None
        print(json.dumps({"status": payload.get("status"), "data": data}, indent=2, sort_keys=True))
        return 0
    except urllib.error.HTTPError as error:
        print(f"MyShipTracking returned HTTP {error.code}", file=sys.stderr)
        return 1
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f"MyShipTracking request failed: {type(error).__name__}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
