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
}

export type BackendSnapshot = {
  status: BackendStatus
  devices: BackendDevices
}

export type BackendClient = {
  loadSnapshot: () => Promise<BackendSnapshot>
  loadModels: () => Promise<BackendModelCatalog>
  loadEnvironment: () => Promise<BackendEnvironment>
}

export const DEFAULT_BACKEND_BASE_URL = 'http://127.0.0.1:6242'

type FetchTransport = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const defaultTransport: FetchTransport = (input, init) => fetch(input, init)

async function requestJson<T>(transport: FetchTransport, url: string): Promise<T> {
  const response = await transport(url)

  if (!response.ok) {
    throw new Error('本地后端接口请求失败')
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
    async loadEnvironment() {
      // 环境依赖状态独立读取，后续 CUDA、DirectML 和虚拟声卡检测都可以沿用同一入口扩展。
      return requestJson<BackendEnvironment>(transport, `${normalizedBaseUrl}/environment`)
    },
  }
}

export const backendClient = createBackendClient()
