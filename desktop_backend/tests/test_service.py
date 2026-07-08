import unittest

from desktop_backend.device_inventory import build_inventory
from desktop_backend.environment_status import EnvironmentStatus, ToolStatus
from desktop_backend.model_catalog import ModelCatalog
from desktop_backend.service import BackendService, RuntimeState


class BackendServiceTest(unittest.TestCase):
    def test_service_payloads_are_stable_for_desktop_client(self):
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

        self.assertEqual(service.health(), {"ok": True, "service": "rvc-desktop-backend"})
        self.assertEqual(
            service.status(),
            {
                "running": False,
                "configured": False,
                "latencyMs": 0,
                "selectedModel": "",
                "lastError": None,
            },
        )
        self.assertEqual(
            service.devices(),
            {
                "inputDevices": ["Microphone Array (MME)"],
                "outputDevices": ["CABLE Input (MME)"],
                "virtualOutputDevices": ["CABLE Input (MME)"],
            },
        )
        self.assertEqual(service.models(), {"modelCount": 0, "models": []})
        self.assertEqual(service.environment()["ffmpeg"]["available"], False)

    def test_status_reflects_runtime_state(self):
        service = BackendService(
            state=RuntimeState(
                running=True,
                configured=True,
                latency_ms=128,
                selected_model="demo.pth",
                last_error="",
            )
        )

        self.assertEqual(
            service.status(),
            {
                "running": True,
                "configured": True,
                "latencyMs": 128,
                "selectedModel": "demo.pth",
                "lastError": None,
            },
        )

    def test_models_returns_catalog_payload(self):
        service = BackendService(model_catalog_provider=lambda: ModelCatalog([]))

        self.assertEqual(service.models(), {"modelCount": 0, "models": []})

    def test_environment_returns_dependency_payload(self):
        service = BackendService(
            environment_provider=lambda: EnvironmentStatus(
                ffmpeg=ToolStatus(available=False, path="", message="未检测到 ffmpeg，请安装 ffmpeg 并加入 PATH"),
                cuda=ToolStatus(
                    available=False,
                    path="",
                    message="CUDA 不可用，将使用 CPU 或 DirectML 方案；如需 NVIDIA GPU 加速，请安装匹配的显卡驱动和 CUDA 版 PyTorch",
                ),
            )
        )

        self.assertEqual(
            service.environment(),
            {
                "ffmpeg": {
                    "available": False,
                    "path": "",
                    "message": "未检测到 ffmpeg，请安装 ffmpeg 并加入 PATH",
                },
                "cuda": {
                    "available": False,
                    "path": "",
                    "message": "CUDA 不可用，将使用 CPU 或 DirectML 方案；如需 NVIDIA GPU 加速，请安装匹配的显卡驱动和 CUDA 版 PyTorch",
                },
            },
        )


if __name__ == "__main__":
    unittest.main()
