# RVC Windows 变声器项目启动与功能说明

## 项目定位

本项目是在 `RVC-Project/Retrieval-based-Voice-Conversion-WebUI` 基础上进行的 Windows 桌面变声器二次开发。当前目标是先完成桌面端控制台、模型管理、参数配置、本地后端契约和实时链路控制入口，再逐步接入真实麦克风采集、RVC 实时推理和虚拟麦克风输出。

当前仓库仍包含原 RVC WebUI 代码；本文档只说明本次二次开发的桌面端启动方式、页面结构和已接入功能。

## 运行环境

- Windows 10/11
- Python 3.10 或更高版本
- Node.js 18 或更高版本
- ffmpeg 已安装并加入 `PATH`
- 可选：NVIDIA 显卡、匹配驱动和 CUDA 版 PyTorch
- 可选：VB-CABLE 或 VoiceMeeter 等虚拟声卡，用于后续通话或游戏语音输出

CUDA 当前不是强制依赖；CUDA 不可用时，前端会显示 `CPU/DirectML 降级`。ffmpeg 是文件变声和导出链路的重要依赖，建议先确认环境状态。

## 首次准备

在项目根目录执行依赖检查：

```powershell
python tools/check_desktop_runtime.py
```

如果希望在关键依赖缺失时返回非零退出码，可使用严格模式：

```powershell
python tools/check_desktop_runtime.py --strict
```

安装前端依赖：

```powershell
cd desktop
npm install
```

模型文件放置位置：

- `.pth` 模型放入 `assets/weights`
- `.index` 索引文件可放入 `logs` 或 `assets/indices`

后端会扫描 `assets/weights` 下的 `.pth` 文件，并按模型名匹配索引文件名中包含同名关键字的 `.index` 文件。

## 开发态启动方法

需要同时启动本地 Python 后端和 React/Vite 前端。

### 1. 启动本地后端

在项目根目录执行：

```powershell
python -m desktop_backend.http_server
```

后端默认监听：

```text
http://127.0.0.1:6242
```

当前已提供的后端接口包括：

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/health` | 后端健康检查 |
| GET | `/status` | 读取运行状态、延迟、当前模型 |
| GET | `/devices` | 读取输入、输出和虚拟输出设备候选 |
| GET | `/models` | 扫描本地 RVC 模型列表 |
| POST | `/models/load` | 记录当前选择的模型 |
| GET | `/environment` | 读取 ffmpeg 和 CUDA 状态 |
| GET | `/parameters` | 读取变声参数 |
| POST | `/parameters` | 保存变声参数 |
| POST | `/realtime/start` | 启动实时变声控制状态 |
| POST | `/realtime/stop` | 停止实时变声控制状态 |

### 2. 启动桌面前端

新开一个 PowerShell 窗口，进入前端目录：

```powershell
cd desktop
npm run dev
```

前端默认访问地址：

```text
http://127.0.0.1:5173
```

前端只允许访问本机后端 `http://127.0.0.1:6242`。开发时请先启动后端，再打开前端页面。

## 页面结构

当前桌面端采用左侧导航加右侧工作区布局。

### 控制台

入口路径：`/`

主要功能：

- 展示当前模型、输入设备、虚拟麦克风输出和实时延迟
- 展示本地后端连接状态
- 展示虚拟输出设备数量
- 展示 GPU 状态：`CUDA 已就绪` 或 `CPU/DirectML 降级`
- 展示缺少模型提示
- 展示 ffmpeg 缺失提示
- 展示 CUDA 不可用提示
- 点击 `开始变声` 调用 `/realtime/start`
- 点击 `停止变声` 调用 `/realtime/stop`

当前边界：

- 按钮已接入后端启停控制契约
- 尚未接入真实麦克风采集
- 尚未接入 RVC 实时推理
- 尚未接入虚拟麦克风音频输出
- 音量条仍是占位显示，实时音量检测待后续实现

### 模型管理

入口路径：`/models`

主要功能：

- 展示本地 `.pth` 模型数量
- 展示模型列表
- 展示 `.index` 索引匹配状态
- 点击 `使用模型` 调用 `/models/load`
- 当前使用的模型会显示 `当前使用`
- 模型加载失败时展示后端返回的中文错误
- 展示声音模型合规提示，提醒仅使用已授权模型

当前边界：

- 已支持扫描本地模型列表
- 已支持切换当前模型记录
- 尚未实现界面内导入 `.pth`
- 尚未实现界面内导入 `.index`
- 尚未实现删除模型
- 尚未在接口内直接加载 RVC 权重

### 文件变声

入口路径：`/files`

主要功能：

- 选择本地音频文件
- 支持 `wav`、`mp3`、`flac`
- 展示文件名、格式和大小
- 拒绝不支持的文件扩展名

当前边界：

- 当前只完成文件导入和格式校验
- 尚未执行离线变声处理
- 尚未导出处理后的音频文件

### 设置

入口路径：`/settings`

主要功能：

- 读取并保存音调半音参数
- 读取并保存 `.index` 检索率
- 读取并保存保护值
- 读取并保存输入阈值 dB
- 读取并保存输出增益 dB
- 读取并保存降噪开关

这些参数通过后端 `/parameters` 读取和保存，后续实时推理链路会复用同一份参数契约。

## 当前开发状态

已完成的核心能力：

- React + Vite 桌面端前端骨架
- 深色控制台界面
- 本地 Python HTTP 后端骨架
- 后端健康、状态、设备、模型、环境和参数接口
- 模型列表扫描和模型切换契约
- 开始/停止实时变声控制契约
- 文件导入格式校验
- 参数调节和保存
- ffmpeg、CUDA、缺少模型、模型加载失败等中文异常提示

仍在开发中的能力：

- Tauri 原生 Windows 壳
- 真实 sounddevice 设备查询和占用检测
- 真实 RVC 权重加载
- 麦克风实时采集
- RVC 实时推理
- 本地监听
- 虚拟麦克风输出
- 文件变声执行和导出
- Windows 安装包
- Windows 10/11 真实设备验收

详细进度以 `RVC-Windows变声器-功能进度清单.md` 为准。

## 常用开发命令

前端测试：

```powershell
cd desktop
npm test
```

前端构建：

```powershell
cd desktop
npm run build
```

前端代码检查：

```powershell
cd desktop
npm run lint
```

后端测试：

```powershell
python -m unittest discover -s desktop_backend/tests -v
```

后端语法检查：

```powershell
python -m compileall desktop_backend
```

## 使用注意

- 当前是开发态应用，不是最终安装包版本。
- 开发态前端必须配合本地后端使用。
- 没有导入模型时，实时控制按钮会被后端拒绝并提示先选择模型。
- 通话或游戏队友想听到变声效果，需要后续完成虚拟麦克风输出模块，并在目标软件里选择对应虚拟麦克风。
- 声音模型必须确认来源合法，并获得声音权利人或授权方许可后再使用。
