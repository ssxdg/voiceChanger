# RVC Windows 变声器桌面端

该目录是 RVC Windows 变声器二次开发的前端工程，当前用于承载桌面端界面骨架。

## 已接入能力

- React18 + Vite + TypeScript。
- React Router 页面路由。
- Zustand 本地状态 Store。
- Vitest + Testing Library 单元测试。
- Playwright 开发依赖，用于渲染和交互验证。

## 常用命令

```bash
npm install
npm run dev
npm test
npm run build
npm run lint
```

## 当前边界

当前模块只完成前端界面和本地状态基础，尚未接入 Tauri 原生壳、Python 推理服务、真实麦克风采集和虚拟声卡输出。
