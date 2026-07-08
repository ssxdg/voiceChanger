import { useEffect } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { useVoiceChangerStore } from './stores/voiceChangerStore'
import './App.css'

const navItems = [
  { label: '控制台', to: '/' },
  { label: '模型管理', to: '/models' },
  { label: '文件变声', to: '/files' },
  { label: '设置', to: '/settings' },
]

const statusCards = [
  { label: '当前模型', valueKey: 'selectedModelName' },
  { label: '输入设备', valueKey: 'inputDeviceName' },
  { label: '虚拟麦克风输出', valueKey: 'outputDeviceName' },
  { label: '实时延迟', valueKey: 'latencyMs' },
] as const

function DashboardPage() {
  const {
    selectedModelName,
    inputDeviceName,
    outputDeviceName,
    latencyMs,
    gpuStatus,
    isRealtimeActive,
    backendConnected,
    backendError,
    inputDeviceOptions,
    outputDeviceOptions,
    virtualOutputDeviceOptions,
    modelCount,
    modelListError,
    ffmpegAvailable,
    ffmpegMessage,
    cudaAvailable,
    cudaMessage,
    toggleRealtime,
    loadBackendSnapshot,
    loadModels,
    loadEnvironment,
  } = useVoiceChangerStore()

  useEffect(() => {
    // 状态、模型和依赖检测互不依赖，并行读取可以让控制台尽快暴露阻断提示。
    void Promise.all([loadBackendSnapshot(), loadModels(), loadEnvironment()])
  }, [loadBackendSnapshot, loadEnvironment, loadModels])

  const stateMap = {
    selectedModelName,
    inputDeviceName,
    outputDeviceName,
    latencyMs: `${latencyMs} ms`,
  }

  return (
    <main className="dashboard-shell">
      <section className="hero-panel" aria-labelledby="dashboard-title">
        <div>
          <p className="section-label">实时变声控制台</p>
          <h1 id="dashboard-title">RVC Windows 变声器</h1>
          <p className="hero-copy">
            先完成模型、麦克风和虚拟声卡选择，再启动实时链路；当前模块先提供桌面端界面和本地状态基础。
          </p>
        </div>

        <button
          className={isRealtimeActive ? 'primary-action is-active' : 'primary-action'}
          type="button"
          onClick={toggleRealtime}
        >
          {isRealtimeActive ? '停止变声' : '开始变声'}
        </button>
      </section>

      <section className="status-grid" aria-label="运行状态">
        {statusCards.map((card) => (
          <article className="status-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{stateMap[card.valueKey]}</strong>
          </article>
        ))}
      </section>

      {modelCount === 0 && !modelListError ? (
        <section className="missing-model-panel" aria-label="缺少模型提示">
          <strong>未发现本地模型，实时变声暂不可启动</strong>
          <span>请将 .pth 模型放入 assets/weights 后刷新模型列表</span>
        </section>
      ) : null}

      {ffmpegAvailable === false ? (
        <section className="dependency-alert" aria-label="ffmpeg 缺失提示">
          <strong>ffmpeg 未就绪</strong>
          <span>{ffmpegMessage}</span>
        </section>
      ) : null}

      {cudaAvailable === false ? (
        <section className="dependency-alert" aria-label="CUDA 不可用提示">
          <strong>CUDA 不可用</strong>
          <span>{cudaMessage}</span>
        </section>
      ) : null}

      <section className="workbench-grid" aria-label="音频工作区">
        <div className="meter-panel">
          <div className="panel-heading">
            <span>输入音量</span>
            <strong>待接入</strong>
          </div>
          <div className="meter-track" aria-hidden="true">
            <span style={{ width: '34%' }} />
          </div>
          <div className="panel-heading">
            <span>输出音量</span>
            <strong>待接入</strong>
          </div>
          <div className="meter-track output" aria-hidden="true">
            <span style={{ width: '18%' }} />
          </div>
        </div>

        <aside className="device-panel" aria-label="设备与性能状态">
          <div className="connection-row">
            <span className={backendConnected ? 'connection-pill is-connected' : 'connection-pill'}>
              {backendConnected ? '后端已连接' : '后端未连接'}
            </span>
            <strong>虚拟输出：{virtualOutputDeviceOptions.length} 个</strong>
          </div>
          {backendError ? <p className="error-text">{backendError}</p> : null}
          <div>
            <span className="section-label">GPU 状态</span>
            <strong>{gpuStatus}</strong>
          </div>
          <div className="device-summary">
            <span>麦克风：{inputDeviceOptions.length} 个</span>
            <span>输出设备：{outputDeviceOptions.length} 个</span>
          </div>
          <p>
            后续模块会从本地 Python 服务读取 CUDA、DirectML、ffmpeg 和虚拟声卡检测结果。
          </p>
        </aside>
      </section>
    </main>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="dashboard-shell">
      <section className="hero-panel compact">
        <div>
          <p className="section-label">模块占位</p>
          <h1>{title}</h1>
          <p className="hero-copy">该页面已接入路由，后续按计划逐步开发具体功能。</p>
        </div>
      </section>
    </main>
  )
}

function SettingsPage() {
  const { pitchSemitones, indexRate, parametersError, loadParameters, savePitchSemitones, saveIndexRate } =
    useVoiceChangerStore()

  useEffect(() => {
    // 参数设置页进入时单独读取后端参数，避免首屏控制台刷新覆盖用户正在调整的滑块值。
    void loadParameters()
  }, [loadParameters])

  return (
    <main className="dashboard-shell">
      <section className="hero-panel compact">
        <div>
          <p className="section-label">参数设置</p>
          <h1>设置</h1>
          <p className="hero-copy">调整变声推理参数。</p>
        </div>
      </section>

      {parametersError ? <p className="error-text">{parametersError}</p> : null}

      <section className="settings-panel" aria-label="参数调节">
        <div className="parameter-row">
          <div>
            <strong>音调调节</strong>
            <span>音调：{pitchSemitones} 半音</span>
          </div>
          <input
            aria-label="音调调节"
            max="12"
            min="-12"
            step="1"
            type="range"
            value={pitchSemitones}
            onChange={(event) => {
              void savePitchSemitones(Number(event.currentTarget.value))
            }}
          />
        </div>
        <div className="parameter-row">
          <div>
            <strong>检索率调节</strong>
            <span>检索率：{Math.round(indexRate * 100)}%</span>
          </div>
          <input
            aria-label="检索率调节"
            max="1"
            min="0"
            step="0.01"
            type="range"
            value={indexRate}
            onChange={(event) => {
              // 滑块变化立即保存到后端，保证实时链路后续启动时使用最新的检索率配置。
              void saveIndexRate(Number(event.currentTarget.value))
            }}
          />
        </div>
      </section>
    </main>
  )
}

function ModelsPage() {
  const { selectedModelName, modelItems, modelCount, modelListError, modelLoadError, loadModels, loadSelectedModel } =
    useVoiceChangerStore()

  useEffect(() => {
    // 模型页进入时再扫描本地模型，避免控制台首屏承担模型目录读取成本。
    void loadModels()
  }, [loadModels])

  return (
    <main className="dashboard-shell">
      <section className="hero-panel compact">
        <div>
          <p className="section-label">模型管理</p>
          <h1>模型管理</h1>
          <p className="hero-copy">已导入模型：{modelCount} 个</p>
        </div>
      </section>

      {modelListError ? <p className="error-text">{modelListError}</p> : null}
      {modelLoadError ? <p className="error-text">{modelLoadError}</p> : null}

      <section className="model-list" aria-label="本地模型列表">
        {modelItems.length === 0 ? (
          <div className="empty-panel">
            <strong>尚未发现本地 RVC 模型</strong>
            <span>请将 .pth 模型放入 assets/weights 后刷新模型列表</span>
          </div>
        ) : (
          modelItems.map((model) => {
            const isSelected = selectedModelName === model.name

            return (
              <article className="model-card" key={model.modelPath}>
                <div>
                  <strong>{model.name}</strong>
                  <span>{model.modelPath}</span>
                </div>
                <div className="model-actions">
                  {isSelected ? <span className="model-current">当前使用</span> : null}
                  <span className={model.indexReady ? 'model-index is-ready' : 'model-index'}>
                    {model.indexReady ? '索引已匹配' : '未匹配索引'}
                  </span>
                  <button
                    className="model-load-button"
                    type="button"
                    aria-label={`使用模型 ${model.name}`}
                    onClick={() => {
                      void loadSelectedModel(model.modelPath)
                    }}
                  >
                    使用模型
                  </button>
                </div>
              </article>
            )
          })
        )}
      </section>
    </main>
  )
}

function AppShell() {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <strong>VoiceChanger</strong>
            <span>RVC Desktop</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="主导航">
          {navItems.map((item) => (
            <NavLink className={({ isActive }) => (isActive ? 'active' : '')} key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/files" element={<PlaceholderPage title="文件变声" />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
