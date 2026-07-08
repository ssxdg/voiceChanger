# 桌面端后端服务骨架

该目录用于承载 RVC Windows 变声器的本地后端服务代码。

当前模块已完成：

- 设备清单标准化。
- 输入设备、输出设备和虚拟输出设备分类。
- 桌面端稳定 payload：`health`、`status`、`devices`。
- 无第三方依赖的单元测试。

当前模块尚未完成：

- FastAPI HTTP 服务入口。
- 真实 `sounddevice` 环境检测。
- RVC 模型加载和实时推理启动。

## 验证命令

```bash
python -m unittest discover -s desktop_backend/tests -v
```
