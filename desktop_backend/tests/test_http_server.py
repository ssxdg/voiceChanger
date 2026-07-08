import json
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from desktop_backend.device_inventory import build_inventory
from desktop_backend.http_server import create_server
from desktop_backend.service import BackendService


class HttpServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        inventory = build_inventory(
            [
                {
                    "index": 0,
                    "name": "Microphone Array",
                    "hostapi": 0,
                    "max_input_channels": 2,
                    "max_output_channels": 0,
                },
                {
                    "index": 1,
                    "name": "CABLE Input",
                    "hostapi": 0,
                    "max_input_channels": 0,
                    "max_output_channels": 2,
                },
            ],
            [{"name": "MME", "devices": [0, 1]}],
        )
        service = BackendService(inventory_provider=lambda: inventory)
        cls.server = create_server("127.0.0.1", 0, service)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.thread.join(timeout=2)
        cls.server.server_close()

    def test_get_health_status_and_devices_as_json(self):
        self.assertEqual(self._get_json("/health"), {"ok": True, "service": "rvc-desktop-backend"})
        self.assertEqual(
            self._get_json("/status"),
            {
                "running": False,
                "configured": False,
                "latencyMs": 0,
                "selectedModel": "",
                "lastError": None,
            },
        )
        self.assertEqual(
            self._get_json("/devices"),
            {
                "inputDevices": ["Microphone Array (MME)"],
                "outputDevices": ["CABLE Input (MME)"],
                "virtualOutputDevices": ["CABLE Input (MME)"],
            },
        )
        self.assertEqual(self._get_json("/models"), {"modelCount": 0, "models": []})

    def test_unknown_path_returns_json_404(self):
        with self.assertRaises(HTTPError) as error:
            self._get_json("/missing")

        self.assertEqual(error.exception.code, 404)
        payload = json.loads(error.exception.read().decode("utf-8"))
        self.assertEqual(payload, {"error": "接口不存在"})

    def test_options_request_returns_local_desktop_cors_headers(self):
        request = Request(f"{self.base_url}/devices", method="OPTIONS")

        with urlopen(request, timeout=5) as response:
            self.assertEqual(response.status, 204)
            self.assertEqual(response.headers["Access-Control-Allow-Origin"], "http://127.0.0.1:5173")
            self.assertIn("GET", response.headers["Access-Control-Allow-Methods"])

    def _get_json(self, path):
        with urlopen(f"{self.base_url}{path}", timeout=5) as response:
            self.assertEqual(response.headers["Content-Type"], "application/json; charset=utf-8")
            return json.loads(response.read().decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
