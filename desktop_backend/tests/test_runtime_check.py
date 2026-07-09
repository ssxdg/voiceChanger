import json
import unittest
from io import StringIO

from desktop_backend.environment_status import EnvironmentStatus, ToolStatus
from desktop_backend.runtime_check import build_runtime_check_payload, main


class RuntimeCheckTest(unittest.TestCase):
    def test_build_runtime_check_payload_reports_available_environment(self):
        status = EnvironmentStatus(
            ffmpeg=ToolStatus(
                available=True,
                path="C:/tools/ffmpeg/bin/ffmpeg.exe",
                message="ffmpeg 已就绪",
            ),
            cuda=ToolStatus(
                available=True,
                path="torch.cuda",
                message="CUDA 已就绪",
            ),
        )

        payload = build_runtime_check_payload(environment_provider=lambda: status)

        self.assertEqual(payload["ok"], True)
        self.assertEqual(payload["summary"], "运行环境已就绪")
        self.assertEqual(payload["environment"], status.as_payload())

    def test_runtime_check_cli_outputs_json_without_failing_startup(self):
        status = EnvironmentStatus(
            ffmpeg=ToolStatus(
                available=False,
                path="",
                message="未检测到 ffmpeg，请安装 ffmpeg 并加入 PATH",
            ),
            cuda=ToolStatus(
                available=False,
                path="",
                message="CUDA 不可用，将使用 CPU 或 DirectML 方案；如需 NVIDIA GPU 加速，请安装匹配的显卡驱动和 CUDA 版 PyTorch",
            ),
        )
        output = StringIO()

        exit_code = main([], stdout=output, environment_provider=lambda: status)

        payload = json.loads(output.getvalue())
        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["ok"], False)
        self.assertEqual(payload["summary"], "运行环境需要处理：ffmpeg 未就绪")
        self.assertEqual(payload["environment"], status.as_payload())

    def test_runtime_check_cli_configures_utf8_output_when_supported(self):
        class ReconfigurableOutput(StringIO):
            def __init__(self):
                super().__init__()
                self.requested_encoding = None

            def reconfigure(self, *, encoding=None):
                self.requested_encoding = encoding

        status = EnvironmentStatus(
            ffmpeg=ToolStatus(
                available=True,
                path="C:/tools/ffmpeg/bin/ffmpeg.exe",
                message="ffmpeg 已就绪",
            ),
            cuda=ToolStatus(
                available=False,
                path="",
                message="CUDA 不可用，将使用 CPU 或 DirectML 方案；如需 NVIDIA GPU 加速，请安装匹配的显卡驱动和 CUDA 版 PyTorch",
            ),
        )
        output = ReconfigurableOutput()

        main([], stdout=output, environment_provider=lambda: status)

        self.assertEqual(output.requested_encoding, "utf-8")

    def test_runtime_check_strict_mode_returns_nonzero_when_ffmpeg_is_missing(self):
        status = EnvironmentStatus(
            ffmpeg=ToolStatus(
                available=False,
                path="",
                message="未检测到 ffmpeg，请安装 ffmpeg 并加入 PATH",
            ),
            cuda=ToolStatus(
                available=True,
                path="torch.cuda",
                message="CUDA 已就绪",
            ),
        )
        output = StringIO()

        exit_code = main(["--strict"], stdout=output, environment_provider=lambda: status)

        self.assertEqual(exit_code, 1)
        self.assertEqual(json.loads(output.getvalue())["ok"], False)


if __name__ == "__main__":
    unittest.main()
