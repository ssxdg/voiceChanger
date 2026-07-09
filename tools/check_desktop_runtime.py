from __future__ import annotations

import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    # 允许用户直接运行 `python tools/check_desktop_runtime.py`，无需先手动设置 PYTHONPATH。
    sys.path.insert(0, str(REPO_ROOT))

from desktop_backend.runtime_check import main


if __name__ == "__main__":
    raise SystemExit(main())
