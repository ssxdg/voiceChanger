from __future__ import annotations

import argparse
import json
import sys
from typing import Callable, Sequence, TextIO

from .environment_status import EnvironmentStatus, build_environment_status


EnvironmentProvider = Callable[[], EnvironmentStatus]


def _configure_utf8_output(stdout: TextIO) -> None:
    reconfigure = getattr(stdout, "reconfigure", None)

    if callable(reconfigure):
        try:
            # Windows 终端默认编码可能不是 UTF-8，显式切换可保证中文检查结果可读。
            reconfigure(encoding="utf-8")
        except Exception:
            # 某些测试替身或重定向流不支持重新配置编码，忽略后仍可继续输出 JSON。
            return


def build_runtime_check_payload(
    environment_provider: EnvironmentProvider = build_environment_status,
) -> dict[str, object]:
    environment = environment_provider().as_payload()
    ffmpeg = environment["ffmpeg"]
    ffmpeg_available = isinstance(ffmpeg, dict) and ffmpeg.get("available") is True

    # ffmpeg 是文件变声和导出链路的硬依赖；CUDA 当前可降级到 CPU/DirectML，因此只作为环境详情展示。
    return {
        "ok": ffmpeg_available,
        "summary": "运行环境已就绪" if ffmpeg_available else "运行环境需要处理：ffmpeg 未就绪",
        "environment": environment,
    }


def main(
    argv: Sequence[str] | None = None,
    stdout: TextIO = sys.stdout,
    environment_provider: EnvironmentProvider = build_environment_status,
) -> int:
    parser = argparse.ArgumentParser(description="检查 RVC Windows 变声器桌面端运行环境")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="严格模式下发现关键依赖缺失时返回非零退出码，适合打包或启动前置检查",
    )
    args = parser.parse_args(argv)
    payload = build_runtime_check_payload(environment_provider=environment_provider)

    _configure_utf8_output(stdout)
    # 输出 JSON 而不是纯文本，便于后续 Tauri 启动器、安装包脚本或 CI 直接解析同一份结果。
    json.dump(payload, stdout, ensure_ascii=False)
    stdout.write("\n")

    if args.strict and payload["ok"] is not True:
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
