export type BackendStatus = {
  running: boolean
  configured: boolean
  latencyMs: number
  selectedModel: string
  lastError: string | null
}

export type BackendDevices = {
  inputDevices: string[]
  outputDevices: string[]
  virtualOutputDevices: string[]
}

export type BackendModel = {
  name: string
  modelPath: string
  indexPath: string
  indexReady: boolean
}

export type BackendModelCatalog = {
  modelCount: number
  models: BackendModel[]
}

export type BackendToolStatus = {
  available: boolean
  path: string
  message: string
}

export type BackendEnvironment = {
  ffmpeg: BackendToolStatus
  cuda: BackendToolStatus
}

export type BackendConversionParameters = {
  pitchSemitones: number
  indexRate: number
  protect: number
  inputThresholdDb: number
  outputGainDb: number
  denoise: boolean
}

export type BackendSnapshot = {
  status: BackendStatus
  devices: BackendDevices
}

export type BackendClient = {
  loadSnapshot: () => Promise<BackendSnapshot>
  loadModels: () => Promise<BackendModelCatalog>
  loadModel: (modelPath: string) => Promise<BackendStatus>
  loadEnvironment: () => Promise<BackendEnvironment>
  loadParameters: () => Promise<BackendConversionParameters>
  saveParameters: (parameters: BackendConversionParameters) => Promise<BackendConversionParameters>
}

export const DEFAULT_BACKEND_BASE_URL = 'http://127.0.0.1:6242'

type FetchTransport = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const defaultTransport: FetchTransport = (input, init) => fetch(input, init)

type BackendErrorPayload = {
  error?: unknown
}

async function readBackendErrorMessage(response: Response) {
  try {
    // 后端错误统一使用 JSON `{ error }`，优先透传这条中文消息，方便模型损坏等场景给出具体修复建议。
    const payload = (await response.json()) as BackendErrorPayload

    if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
      return payload.error
    }
  } catch {
    // 旧接口或网络中断可能没有合法 JSON 错误体，此时继续使用桌面端统一兜底文案。
  }

  return '本地后端接口请求失败'
}

async function requestJson<T>(transport: FetchTransport, url: string, init?: RequestInit): Promise<T> {
  const response = await transport(url, init)

  if (!response.ok) {
    throw new Error(await readBackendErrorMessage(response))
  }

  return response.json() as Promise<T>
}

export function createBackendClient(
  baseUrl = DEFAULT_BACKEND_BASE_URL,
  transport: FetchTransport = defaultTransport,
): BackendClient {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

  return {
    async loadSnapshot() {
      // 桌面端只访问本机后端，固定 127.0.0.1 可以避免误连公网服务，也便于后续打包时限制 CORS 范围。
      const statusUrl = `${normalizedBaseUrl}/status`
      const devicesUrl = `${normalizedBaseUrl}/devices`

      // 状态和设备列表互不依赖，并行读取可以减少首屏等待时间，符合桌面控制台启动后快速反馈的需求。
      const [status, devices] = await Promise.all([
        requestJson<BackendStatus>(transport, statusUrl),
        requestJson<BackendDevices>(transport, devicesUrl),
      ])

      return { status, devices }
    },
    async loadModels() {
      // 模型列表属于模型管理页的独立数据，单独读取可以避免首屏控制台被模型扫描拖慢。
      return requestJson<BackendModelCatalog>(transport, `${normalizedBaseUrl}/models`)
    },
    async loadModel(modelPath) {
      // 当前接口只请求后端记录选中的模型，真实权重加载会在后续推理服务模块中接入。
      return requestJson<BackendStatus>(transport, `${normalizedBaseUrl}/models/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ modelPath }),
      })
    },
    async loadEnvironment() {
      // 环境依赖状态独立读取，后续 CUDA、DirectML 和虚拟声卡检测都可以沿用同一入口扩展。
      return requestJson<BackendEnvironment>(transport, `${normalizedBaseUrl}/environment`)
    },
    async loadParameters() {
      // 参数读取保持独立接口，避免控制台首屏刷新时意外覆盖用户正在调整的滑块值。
      return requestJson<BackendConversionParameters>(transport, `${normalizedBaseUrl}/parameters`)
    },
    async saveParameters(parameters) {
      // POST 只提交结构化 JSON，后续迁移到 FastAPI 或 Tauri IPC 时仍能复用同一字段契约。
      return requestJson<BackendConversionParameters>(transport, `${normalizedBaseUrl}/parameters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(parameters),
      })
    },
  }
}

export const backendClient = createBackendClient()
