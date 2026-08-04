from __future__ import annotations

import importlib.util
import pathlib
import unittest
import urllib.parse


ROOT = pathlib.Path(__file__).parents[1]


def load_script(name: str):
    path = ROOT / "skills" / "first-mythos-cup" / "scripts" / name
    spec = importlib.util.spec_from_file_location(name.removesuffix(".py"), path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


class GlobalFishingWatchTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = load_script("gfw_vessels.py")

    def test_search_url_has_required_dataset(self) -> None:
        url = self.client.search_url("240576800", 10)
        parsed = urllib.parse.urlparse(url)
        query = urllib.parse.parse_qs(parsed.query)
        self.assertEqual(query["query"], ["240576800"])
        self.assertEqual(
            query["datasets[0]"], ["public-global-vessel-identity:latest"]
        )
        self.assertEqual(query["limit"], ["10"])

    def test_rejects_invalid_limit(self) -> None:
        with self.assertRaises(ValueError):
            self.client.search_url("FIZZY", 51)

    def test_rejects_query_control_characters(self) -> None:
        with self.assertRaises(ValueError):
            self.client.search_url("FIZZY\nAuthorization: secret", 10)

    def test_resolve_url_encodes_dataset(self) -> None:
        url = self.client.resolve_url("772ea0b5-d364")
        query = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        self.assertEqual(
            query["dataset"], ["public-global-vessel-identity:latest"]
        )


class MyShipTrackingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = load_script("myshiptracking_vessel.py")

    def test_refuses_without_credit_acknowledgement(self) -> None:
        self.assertEqual(self.client.main(["240576800"]), 2)

    def test_rejects_non_fleet_mmsi_before_credentials(self) -> None:
        self.assertEqual(
            self.client.main(["123456789", "--spend-credit"]), 2
        )


if __name__ == "__main__":
    unittest.main()
