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
    toggleRealtime,
  } = useVoiceChangerStore()

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
          <div>
            <span className="section-label">GPU 状态</span>
            <strong>{gpuStatus}</strong>
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
        <Route path="/models" element={<PlaceholderPage title="模型管理" />} />
        <Route path="/files" element={<PlaceholderPage title="文件变声" />} />
        <Route path="/settings" element={<PlaceholderPage title="设置" />} />
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
