import unittest

from desktop_backend.environment_status import build_environment_status


class EnvironmentStatusTest(unittest.TestCase):
    def test_build_environment_status_reports_missing_ffmpeg(self):
        status = build_environment_status(ffmpeg_locator=lambda: None, cuda_probe=lambda: False)

        self.assertEqual(
            status.as_payload(),
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

    def test_build_environment_status_reports_available_ffmpeg_path(self):
        status = build_environment_status(
            ffmpeg_locator=lambda: "C:/tools/ffmpeg/bin/ffmpeg.exe",
            cuda_probe=lambda: True,
        )

        self.assertEqual(
            status.as_payload(),
            {
                "ffmpeg": {
                    "available": True,
                    "path": "C:/tools/ffmpeg/bin/ffmpeg.exe",
                    "message": "ffmpeg 已就绪",
                },
                "cuda": {
                    "available": True,
                    "path": "torch.cuda",
                    "message": "CUDA 已就绪",
                },
            },
        )


if __name__ == "__main__":
    unittest.main()
