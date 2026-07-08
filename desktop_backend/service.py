from __future__ import annotations

from dataclasses import dataclass

from .providers import InventoryProvider, unavailable_inventory_provider


@dataclass
class RuntimeState:
    running: bool = False
    configured: bool = False
    latency_ms: int = 0
    selected_model: str = ""
    last_error: str | None = None


class BackendService:
    """桌面端后端服务的稳定契约层。

    这里暂时不直接启动 FastAPI，是为了把“数据契约”和“HTTP 框架”解耦：
    当前环境没有安装 FastAPI/sounddevice 时仍能测试；后续接入 `api_240604.py`
    或 Tauri IPC 时，也可以复用这些 payload 结构，减少前后端字段漂移。
    """

    def __init__(
        self,
        inventory_provider: InventoryProvider = unavailable_inventory_provider,
        state: RuntimeState | None = None,
    ) -> None:
        self._inventory_provider = inventory_provider
        self._state = state or RuntimeState()

    def health(self) -> dict[str, object]:
        return {"ok": True, "service": "rvc-desktop-backend"}

    def status(self) -> dict[str, object]:
        return {
            "running": self._state.running,
            "configured": self._state.configured,
            "latencyMs": self._state.latency_ms,
            "selectedModel": self._state.selected_model,
            # 空字符串对前端没有诊断价值，统一压成 None，避免 UI 显示一块空错误。
            "lastError": self._state.last_error or None,
        }

    def devices(self) -> dict[str, list[str]]:
        inventory = self._inventory_provider()
        return {
            "inputDevices": [device.label for device in inventory.input_devices],
            "outputDevices": [device.label for device in inventory.output_devices],
            "virtualOutputDevices": [device.label for device in inventory.virtual_output_devices],
        }

