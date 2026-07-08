from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable


VIRTUAL_OUTPUT_KEYWORDS = (
    "cable input",
    "vb-cable",
    "vb audio",
    "voicemeeter",
    "voice meeter",
    "virtual cable",
    "virtual audio",
)


@dataclass(frozen=True)
class DeviceInfo:
    index: str
    name: str
    host_api: str
    label: str
    max_input_channels: int
    max_output_channels: int
    is_virtual_output: bool


@dataclass(frozen=True)
class DeviceInventory:
    input_devices: list[DeviceInfo]
    output_devices: list[DeviceInfo]
    virtual_output_devices: list[DeviceInfo]


def build_inventory(raw_devices: Iterable[dict[str, Any]], host_apis: Iterable[dict[str, Any]]) -> DeviceInventory:
    """把 sounddevice 的原始结构整理成前端稳定使用的设备清单。

    原 RVC 的实时 GUI 直接拼接设备字符串；这里先抽成独立函数，是为了让后续
    FastAPI/Tauri 调用层、真实 sounddevice 适配层和单元测试共用同一套分类规则。
    """

    host_api_names = _build_host_api_name_map(host_apis)
    input_devices: list[DeviceInfo] = []
    output_devices: list[DeviceInfo] = []

    for raw_device in raw_devices:
        device = _normalize_device(raw_device, host_api_names)
        if device.max_input_channels > 0:
            input_devices.append(device)
        if device.max_output_channels > 0:
            output_devices.append(device)

    return DeviceInventory(
        input_devices=input_devices,
        output_devices=output_devices,
        # 只从输出设备里筛选虚拟候选，因为 Windows 上通常选择 CABLE Input 作为本软件输出，
        # 再让通话或游戏软件选择对应录音端作为麦克风输入。
        virtual_output_devices=[device for device in output_devices if device.is_virtual_output],
    )


def _build_host_api_name_map(host_apis: Iterable[dict[str, Any]]) -> dict[int, str]:
    host_api_names: dict[int, str] = {}
    for fallback_index, host_api in enumerate(host_apis):
        name = str(host_api.get("name") or "Unknown")
        if "index" in host_api:
            host_api_names[int(host_api["index"])] = name
        else:
            host_api_names[fallback_index] = name
    return host_api_names


def _normalize_device(raw_device: dict[str, Any], host_api_names: dict[int, str]) -> DeviceInfo:
    index = str(raw_device.get("index", raw_device.get("name", "")))
    name = str(raw_device.get("name") or "Unknown Device")
    host_api_index = raw_device.get("hostapi")
    host_api = host_api_names.get(int(host_api_index), "Unknown") if host_api_index is not None else "Unknown"
    label = f"{name} ({host_api})"

    return DeviceInfo(
        index=index,
        name=name,
        host_api=host_api,
        label=label,
        max_input_channels=int(raw_device.get("max_input_channels") or 0),
        max_output_channels=int(raw_device.get("max_output_channels") or 0),
        is_virtual_output=_looks_like_virtual_output(name),
    )


def _looks_like_virtual_output(name: str) -> bool:
    lowered = name.casefold()
    return any(keyword in lowered for keyword in VIRTUAL_OUTPUT_KEYWORDS)
