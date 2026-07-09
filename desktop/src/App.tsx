import { useEffect, useState, type ChangeEvent } from 'react'
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

const supportedAudioExtensions = ['wav', 'mp3', 'flac'] as const

type AudioFileSummary = {
  name: string
  extension: string
  sizeLabel: string
}

function getAudioFileExtension(fileName: string) {
  // 桌面端选择文件时不同系统返回的 MIME 可能不稳定，因此用扩展名做第一层格式校验。
  const extension = fileName.split('.').pop()

  return extension ? extension.toLowerCase() : ''
}

function formatAudioFileSize(size: number) {
  // 文件导入阶段只展示摘要，不读取音频内容；统一格式化大小可以避免界面出现裸数字。
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

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
          onClick={() => {
            void toggleRealtime()
          }}
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

function SettingsPage() {
  const {
    pitchSemitones,
    indexRate,
    protect,
    inputThresholdDb,
    outputGainDb,
    denoise,
    parametersError,
    loadParameters,
    savePitchSemitones,
    saveIndexRate,
    saveProtect,
    saveInputThresholdDb,
    saveOutputGainDb,
    saveDenoise,
  } = useVoiceChangerStore()

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
        <div className="parameter-row">
          <div>
            <strong>保护值调节</strong>
            <span>保护值：{Math.round(protect * 100)}%</span>
          </div>
          <input
            aria-label="保护值调节"
            max="0.5"
            min="0"
            step="0.01"
            type="range"
            value={protect}
            onChange={(event) => {
              // 保护值用于减少破音，保存到后端后可和实时推理参数保持一致。
              void saveProtect(Number(event.currentTarget.value))
            }}
          />
        </div>
        <div className="parameter-row">
          <div>
            <strong>输入阈值调节</strong>
            <span>输入阈值：{inputThresholdDb} dB</span>
          </div>
          <input
            aria-label="输入阈值调节"
            max="0"
            min="-80"
            step="1"
            type="range"
            value={inputThresholdDb}
            onChange={(event) => {
              // 输入阈值用于降低环境噪声触发，按 dB 整数保存便于后端直接应用。
              void saveInputThresholdDb(Number(event.currentTarget.value))
            }}
          />
        </div>
        <div className="parameter-row">
          <div>
            <strong>输出增益调节</strong>
            <span>输出增益：{outputGainDb} dB</span>
          </div>
          <input
            aria-label="输出增益调节"
            max="24"
            min="-24"
            step="1"
            type="range"
            value={outputGainDb}
            onChange={(event) => {
              // 输出增益用于控制变声后的音量，按 dB 整数保存便于后端直接应用。
              void saveOutputGainDb(Number(event.currentTarget.value))
            }}
          />
        </div>
        <div className="parameter-row">
          <div>
            <strong>降噪开关</strong>
            <span>降噪：{denoise ? '开启' : '关闭'}</span>
          </div>
          <label className="parameter-toggle">
            <input
              aria-label="降噪开关"
              checked={denoise}
              type="checkbox"
              onChange={(event) => {
                // 降噪是二值推理参数，切换后立即保存，保证实时链路启动时使用最新降噪配置。
                void saveDenoise(event.currentTarget.checked)
              }}
            />
            <span>{denoise ? '开启' : '关闭'}</span>
          </label>
        </div>
      </section>
    </main>
  )
}

function FileConversionPage() {
  const [selectedAudioFile, setSelectedAudioFile] = useState<AudioFileSummary | null>(null)
  const [fileImportError, setFileImportError] = useState<string | null>(null)

  const handleAudioFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]

    if (!file) {
      return
    }

    const extension = getAudioFileExtension(file.name)
    const isSupported = supportedAudioExtensions.includes(extension as (typeof supportedAudioExtensions)[number])

    if (!isSupported) {
      // 不支持的文件不能保留在导入状态里，避免后续“执行文件变声”模块误处理无效输入。
      setSelectedAudioFile(null)
      setFileImportError('仅支持 wav、mp3、flac 音频文件')
      return
    }

    // 这里只记录文件元数据，真实音频读取和后端处理会在“执行文件变声”模块中接入。
    setSelectedAudioFile({
      name: file.name,
      extension: extension.toUpperCase(),
      sizeLabel: formatAudioFileSize(file.size),
    })
    setFileImportError(null)
  }

  return (
    <main className="dashboard-shell">
      <section className="hero-panel compact">
        <div>
          <p className="section-label">文件变声</p>
          <h1>文件变声</h1>
          <p className="hero-copy">导入 wav、mp3、flac 音频文件，后续模块会接入离线变声处理和导出。</p>
        </div>
      </section>

      <section className="file-import-panel" aria-label="导入音频文件">
        <div>
          <strong>导入音频文件</strong>
          <span>支持格式：wav、mp3、flac</span>
        </div>
        <label className="file-upload-control">
          <input
            accept=".wav,.mp3,.flac,audio/wav,audio/mpeg,audio/flac"
            aria-label="选择音频文件"
            type="file"
            onChange={handleAudioFileChange}
          />
          <span>选择音频文件</span>
        </label>

        {fileImportError ? <p className="error-text">{fileImportError}</p> : null}

        {selectedAudioFile ? (
          <div className="file-summary" aria-label="已导入音频摘要">
            <strong>已选择音频：{selectedAudioFile.name}</strong>
            <span>格式：{selectedAudioFile.extension}</span>
            <span>大小：{selectedAudioFile.sizeLabel}</span>
          </div>
        ) : (
          <div className="file-empty-state">
            <strong>尚未选择音频文件</strong>
            <span>请选择一个待变声的 wav、mp3 或 flac 文件</span>
          </div>
        )}
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

      {/* 模型管理是用户选择声音模型的入口，在这里固定提示授权要求，可以在加载或导入前降低误用风险。 */}
      <section className="compliance-panel" aria-label="声音模型合规提示">
        <strong>仅使用已授权的声音模型</strong>
        <span>请确认模型来源合法，并获得声音权利人或授权方许可后再用于变声。</span>
      </section>

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
        <Route path="/files" element={<FileConversionPage />} />
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
