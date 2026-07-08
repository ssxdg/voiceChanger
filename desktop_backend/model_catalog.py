from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ModelItem:
    name: str
    model_path: str
    index_path: str = ""

    def as_payload(self) -> dict[str, object]:
        return {
            "name": self.name,
            "modelPath": self.model_path,
            "indexPath": self.index_path,
            "indexReady": bool(self.index_path),
        }


@dataclass(frozen=True)
class ModelCatalog:
    models: list[ModelItem]

    def as_payload(self) -> dict[str, object]:
        return {
            "modelCount": len(self.models),
            "models": [model.as_payload() for model in self.models],
        }


def build_model_catalog(project_root: Path | str | None = None) -> ModelCatalog:
    root = Path(project_root or Path.cwd())
    weights_dir = root / "assets" / "weights"
    index_roots = [root / "logs", root / "assets" / "indices"]
    index_files = _collect_index_files(index_roots)

    models: list[ModelItem] = []
    for model_path in sorted(weights_dir.glob("*.pth")) if weights_dir.exists() else []:
        # RVC 的模型文件名是用户识别模型的主要入口，因此列表只扫描 weights 下的 .pth，避免把预训练权重误当成用户模型。
        matched_index = _find_matching_index(model_path, index_files)
        models.append(
            ModelItem(
                name=model_path.name,
                model_path=str(model_path),
                index_path=str(matched_index) if matched_index else "",
            )
        )

    return ModelCatalog(models)


def _collect_index_files(index_roots: list[Path]) -> list[Path]:
    files: list[Path] = []
    for index_root in index_roots:
        if index_root.exists():
            files.extend(sorted(index_root.rglob("*.index")))
    return files


def _find_matching_index(model_path: Path, index_files: list[Path]) -> Path | None:
    model_key = model_path.stem.lower()
    for index_file in index_files:
        # RVC 索引文件常带有 added_IVF 等前后缀，用包含匹配能兼容训练产物的默认命名方式。
        if model_key in index_file.stem.lower():
            return index_file
    return None
