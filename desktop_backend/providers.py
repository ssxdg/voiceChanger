from __future__ import annotations

from collections.abc import Callable

from .device_inventory import DeviceInventory, build_inventory


InventoryProvider = Callable[[], DeviceInventory]


def unavailable_inventory_provider() -> DeviceInventory:
    """返回空清单，让桌面端在缺少 sounddevice 时仍可启动并显示中文修复提示。

    第一版开发环境可能还没有安装 RVC 实时依赖；后端服务骨架必须能独立运行，
    否则前端、安装向导和环境检测都无法在干净机器上继续开发。
    """

    return build_inventory([], [])


def sounddevice_inventory_provider() -> DeviceInventory:
    """从 sounddevice 读取真实设备；导入放在函数内部，避免模块加载时强依赖实时音频库。"""

    import sounddevice as sd

    return build_inventory(sd.query_devices(), sd.query_hostapis())

