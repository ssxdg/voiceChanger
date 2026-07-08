from __future__ import annotations

from dataclasses import dataclass
from shutil import which
from typing import Callable


@dataclass(frozen=True)
class ToolStatus:
    available: bool
    path: str
    message: str

    def as_payload(self) -> dict[str, object]:
        return {
            "available": self.available,
            "path": self.path,
            "message": self.message,
        }


@dataclass(frozen=True)
class EnvironmentStatus:
    ffmpeg: ToolStatus
    cuda: ToolStatus

    def as_payload(self) -> dict[str, object]:
        return {
            "ffmpeg": self.ffmpeg.as_payload(),
            "cuda": self.cuda.as_payload(),
        }


def _default_ffmpeg_locator() -> str | None:
    # 先检查 PATH 是为了保持依赖检测轻量稳定，避免在桌面端启动阶段执行 ffmpeg 子进程造成卡顿。
    return which("ffmpeg")


def _default_cuda_probe() -> bool:
    try:
        import torch
    except Exception:
        return False

    try:
        # 只读取 torch 的 CUDA 可用性，避免在环境检测阶段初始化真实推理链路。
        return bool(torch.cuda.is_available())
    except Exception:
        return False


def build_environment_status(
    ffmpeg_locator: Callable[[], str | None] = _default_ffmpeg_locator,
    cuda_probe: Callable[[], bool] = _default_cuda_probe,
) -> EnvironmentStatus:
    ffmpeg_path = ffmpeg_locator()

    cuda_status = (
        ToolStatus(
            available=True,
            path="torch.cuda",
            message="CUDA 已就绪",
        )
        if cuda_probe()
        else ToolStatus(
            available=False,
            path="",
            message="CUDA 不可用，将使用 CPU 或 DirectML 方案；如需 NVIDIA GPU 加速，请安装匹配的显卡驱动和 CUDA 版 PyTorch",
        )
    )

    if ffmpeg_path:
        return EnvironmentStatus(
            ffmpeg=ToolStatus(
                available=True,
                path=ffmpeg_path,
                message="ffmpeg 已就绪",
            ),
            cuda=cuda_status,
        )

    return EnvironmentStatus(
        ffmpeg=ToolStatus(
            available=False,
            path="",
            message="未检测到 ffmpeg，请安装 ffmpeg 并加入 PATH",
        ),
        cuda=cuda_status,
    )
