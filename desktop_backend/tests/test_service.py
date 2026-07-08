import unittest

from desktop_backend.device_inventory import build_inventory
from desktop_backend.environment_status import EnvironmentStatus, ToolStatus
from desktop_backend.model_catalog import ModelCatalog, ModelItem
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
        self.assertEqual(
            service.parameters(),
            {
                "pitchSemitones": 0,
                "indexRate": 0.75,
                "protect": 0.33,
                "inputThresholdDb": -45,
                "outputGainDb": 0,
                "denoise": False,
            },
        )

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

    def test_load_model_updates_runtime_status(self):
        service = BackendService(
            model_catalog_provider=lambda: ModelCatalog(
                [
                    ModelItem(
                        name="demo.pth",
                        model_path="E:/LLM/bianshengqi/assets/weights/demo.pth",
                        index_path="E:/LLM/bianshengqi/logs/demo/added_IVF_demo_v2.index",
                    )
                ]
            )
        )

        payload = service.load_model({"modelPath": "E:/LLM/bianshengqi/assets/weights/demo.pth"})

        self.assertEqual(
            payload,
            {
                "running": False,
                "configured": True,
                "latencyMs": 0,
                "selectedModel": "demo.pth",
                "lastError": None,
            },
        )
        self.assertEqual(service.status()["selectedModel"], "demo.pth")

    def test_load_model_rejects_unknown_model_path(self):
        service = BackendService(model_catalog_provider=lambda: ModelCatalog([]))

        with self.assertRaises(ValueError):
            service.load_model({"modelPath": "E:/LLM/bianshengqi/assets/weights/missing.pth"})

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

    def test_update_parameters_returns_stable_payload(self):
        service = BackendService()

        payload = service.update_parameters(
            {
                "pitchSemitones": 12,
                "indexRate": 0.8,
                "protect": 0.4,
                "inputThresholdDb": -36,
                "outputGainDb": 3,
                "denoise": True,
            }
        )

        self.assertEqual(
            payload,
            {
                "pitchSemitones": 12,
                "indexRate": 0.8,
                "protect": 0.4,
                "inputThresholdDb": -36,
                "outputGainDb": 3,
                "denoise": True,
            },
        )
        self.assertEqual(service.parameters(), payload)


if __name__ == "__main__":
    unittest.main()
