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

    def as_payload(self) -> dict[str, object]:
        return {"ffmpeg": self.ffmpeg.as_payload()}


def _default_ffmpeg_locator() -> str | None:
    # 先检查 PATH 是为了保持依赖检测轻量稳定，避免在桌面端启动阶段执行 ffmpeg 子进程造成卡顿。
    return which("ffmpeg")


def build_environment_status(
    ffmpeg_locator: Callable[[], str | None] = _default_ffmpeg_locator,
) -> EnvironmentStatus:
    ffmpeg_path = ffmpeg_locator()

    if ffmpeg_path:
        return EnvironmentStatus(
            ffmpeg=ToolStatus(
                available=True,
                path=ffmpeg_path,
                message="ffmpeg 已就绪",
            ),
        )

    return EnvironmentStatus(
        ffmpeg=ToolStatus(
            available=False,
            path="",
            message="未检测到 ffmpeg，请安装 ffmpeg 并加入 PATH",
        ),
    )
