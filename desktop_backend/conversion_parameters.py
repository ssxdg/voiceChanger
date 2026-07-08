from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ConversionParameters:
    pitch_semitones: int = 0
    index_rate: float = 0.75
    protect: float = 0.33
    input_threshold_db: int = -45
    output_gain_db: float = 0
    denoise: bool = False

    def as_payload(self) -> dict[str, object]:
        return {
            "pitchSemitones": self.pitch_semitones,
            "indexRate": self.index_rate,
            "protect": self.protect,
            "inputThresholdDb": self.input_threshold_db,
            "outputGainDb": self.output_gain_db,
            "denoise": self.denoise,
        }

    def merge_payload(self, payload: dict[str, Any]) -> "ConversionParameters":
        # 允许前端按需提交部分参数，避免后续每增加一个滑块都必须同步修改所有调用方。
        return ConversionParameters(
            pitch_semitones=int(payload.get("pitchSemitones", self.pitch_semitones)),
            index_rate=float(payload.get("indexRate", self.index_rate)),
            protect=float(payload.get("protect", self.protect)),
            input_threshold_db=int(payload.get("inputThresholdDb", self.input_threshold_db)),
            output_gain_db=float(payload.get("outputGainDb", self.output_gain_db)),
            denoise=bool(payload.get("denoise", self.denoise)),
        )
