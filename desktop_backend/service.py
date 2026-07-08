from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from .conversion_parameters import ConversionParameters
from .environment_status import EnvironmentStatus, build_environment_status
from .model_catalog import ModelCatalog, build_model_catalog
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
        model_catalog_provider: Callable[[], ModelCatalog] = build_model_catalog,
        environment_provider: Callable[[], EnvironmentStatus] = build_environment_status,
        parameters: ConversionParameters | None = None,
        state: RuntimeState | None = None,
    ) -> None:
        self._inventory_provider = inventory_provider
        self._model_catalog_provider = model_catalog_provider
        self._environment_provider = environment_provider
        self._parameters = parameters or ConversionParameters()
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

    def models(self) -> dict[str, object]:
        # 模型列表只返回桌面端需要展示的轻量字段，真实加载和删除操作后续再通过单独接口实现。
        return self._model_catalog_provider().as_payload()

    def environment(self) -> dict[str, object]:
        # 环境检测和运行状态分开暴露，避免 ffmpeg 这类依赖缺失影响状态轮询接口的稳定性。
        return self._environment_provider().as_payload()

    def parameters(self) -> dict[str, object]:
        # 参数接口先保存稳定契约，不直接触发推理链路，方便前端控件逐步接入。
        return self._parameters.as_payload()

    def update_parameters(self, payload: dict[str, object]) -> dict[str, object]:
        self._parameters = self._parameters.merge_payload(payload)
        return self.parameters()
