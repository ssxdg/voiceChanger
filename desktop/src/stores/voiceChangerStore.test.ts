import { describe, expect, it } from 'vitest'
import type { BackendClient, BackendConversionParameters } from '../api/backendClient'
import { useVoiceChangerStore } from './voiceChangerStore'

const defaultParameters: BackendConversionParameters = {
  pitchSemitones: 0,
  indexRate: 0.75,
  protect: 0.33,
  inputThresholdDb: -45,
  outputGainDb: 0,
  denoise: false,
}

// Store 当前还不直接读取模型加载和参数接口，但测试 client 需要保持完整契约，避免类型检查遗漏新增后端能力。
const parameterClientMethods = {
  loadModel: async () => ({
    running: false,
    configured: true,
    latencyMs: 0,
    selectedModel: 'demo.pth',
    lastError: null,
  }),
  loadParameters: async () => defaultParameters,
  saveParameters: async (parameters: BackendConversionParameters) => parameters,
}

describe('voiceChangerStore', () => {
  it('保存桌面端启动所需的默认设备和运行状态', () => {
    useVoiceChangerStore.setState(useVoiceChangerStore.getInitialState())

    expect(useVoiceChangerStore.getState().selectedModelName).toBe('未选择模型')
    expect(useVoiceChangerStore.getState().inputDeviceName).toBe('未选择麦克风')
    expect(useVoiceChangerStore.getState().outputDeviceName).toBe('未选择输出设备')
    expect(useVoiceChangerStore.getState().isRealtimeActive).toBe(false)
  })

  it('切换实时变声状态时保留当前设备选择', () => {
    useVoiceChangerStore.setState({
      ...useVoiceChangerStore.getInitialState(),
      inputDeviceName: 'Realtek Microphone',
      outputDeviceName: 'VB-CABLE Input',
    })

    useVoiceChangerStore.getState().toggleRealtime()

    expect(useVoiceChangerStore.getState().isRealtimeActive).toBe(true)
    expect(useVoiceChangerStore.getState().inputDeviceName).toBe('Realtek Microphone')
    expect(useVoiceChangerStore.getState().outputDeviceName).toBe('VB-CABLE Input')
  })

  it('从后端快照同步运行状态和设备候选列表', async () => {
    useVoiceChangerStore.setState(useVoiceChangerStore.getInitialState())
    // 使用注入的 client 模拟后端快照，避免 Store 单测依赖真实桌面后端进程。
    const client: BackendClient = {
      loadSnapshot: async () => ({
        status: {
          running: true,
          configured: true,
          latencyMs: 128,
          selectedModel: 'demo.pth',
          lastError: null,
        },
        devices: {
          inputDevices: ['Microphone Array (MME)'],
          outputDevices: ['CABLE Input (MME)'],
          virtualOutputDevices: ['CABLE Input (MME)'],
        },
      }),
      loadModels: async () => ({ modelCount: 0, models: [] }),
      loadEnvironment: async () => ({
        ffmpeg: {
          available: true,
          path: 'C:/tools/ffmpeg/bin/ffmpeg.exe',
          message: 'ffmpeg 已就绪',
        },
        cuda: {
          available: true,
          path: 'torch.cuda',
          message: 'CUDA 已就绪',
        },
      }),
      ...parameterClientMethods,
    }

    await useVoiceChangerStore.getState().loadBackendSnapshot(client)

    expect(useVoiceChangerStore.getState().backendConnected).toBe(true)
    expect(useVoiceChangerStore.getState().isRealtimeActive).toBe(true)
    expect(useVoiceChangerStore.getState().latencyMs).toBe(128)
    expect(useVoiceChangerStore.getState().selectedModelName).toBe('demo.pth')
    expect(useVoiceChangerStore.getState().inputDeviceOptions).toEqual(['Microphone Array (MME)'])
    expect(useVoiceChangerStore.getState().virtualOutputDeviceOptions).toEqual(['CABLE Input (MME)'])
  })

  it('后端不可用时保留页面可用状态并记录错误', async () => {
    useVoiceChangerStore.setState(useVoiceChangerStore.getInitialState())
    // 后端可能由用户手动启动，失败时 Store 只记录错误，不让 React 页面进入不可恢复状态。
    const client: BackendClient = {
      loadSnapshot: async () => {
        throw new Error('连接本地后端失败')
      },
      loadModels: async () => ({ modelCount: 0, models: [] }),
      loadEnvironment: async () => ({
        ffmpeg: {
          available: true,
          path: 'C:/tools/ffmpeg/bin/ffmpeg.exe',
          message: 'ffmpeg 已就绪',
        },
        cuda: {
          available: true,
          path: 'torch.cuda',
          message: 'CUDA 已就绪',
        },
      }),
      ...parameterClientMethods,
    }

    await useVoiceChangerStore.getState().loadBackendSnapshot(client)

    expect(useVoiceChangerStore.getState().backendConnected).toBe(false)
    expect(useVoiceChangerStore.getState().backendError).toBe('连接本地后端失败')
    expect(useVoiceChangerStore.getState().isRealtimeActive).toBe(false)
  })

  it('从后端读取模型列表并保存在运行时状态', async () => {
    useVoiceChangerStore.setState(useVoiceChangerStore.getInitialState())
    const client: BackendClient = {
      loadSnapshot: async () => {
        throw new Error('本测试不应读取状态快照')
      },
      loadModels: async () => ({
        modelCount: 1,
        models: [
          {
            name: 'demo.pth',
            modelPath: 'E:/LLM/bianshengqi/assets/weights/demo.pth',
            indexPath: 'E:/LLM/bianshengqi/logs/demo/added_IVF_demo_v2.index',
            indexReady: true,
          },
        ],
      }),
      loadEnvironment: async () => ({
        ffmpeg: {
          available: true,
          path: 'C:/tools/ffmpeg/bin/ffmpeg.exe',
          message: 'ffmpeg 已就绪',
        },
        cuda: {
          available: true,
          path: 'torch.cuda',
          message: 'CUDA 已就绪',
        },
      }),
      ...parameterClientMethods,
    }

    await useVoiceChangerStore.getState().loadModels(client)

    expect(useVoiceChangerStore.getState().modelCount).toBe(1)
    expect(useVoiceChangerStore.getState().modelItems[0].name).toBe('demo.pth')
    expect(useVoiceChangerStore.getState().modelItems[0].indexReady).toBe(true)
    expect(useVoiceChangerStore.getState().modelListError).toBeNull()
  })

  it('请求后端加载模型并同步当前模型状态', async () => {
    useVoiceChangerStore.setState(useVoiceChangerStore.getInitialState())
    const loadedModelPaths: string[] = []
    const client: BackendClient = {
      loadSnapshot: async () => {
        throw new Error('本测试不应读取状态快照')
      },
      loadModels: async () => ({ modelCount: 0, models: [] }),
      loadEnvironment: async () => ({
        ffmpeg: {
          available: true,
          path: 'C:/tools/ffmpeg/bin/ffmpeg.exe',
          message: 'ffmpeg 已就绪',
        },
        cuda: {
          available: true,
          path: 'torch.cuda',
          message: 'CUDA 已就绪',
        },
      }),
      loadModel: async (modelPath: string) => {
        loadedModelPaths.push(modelPath)
        return {
          running: false,
          configured: true,
          latencyMs: 0,
          selectedModel: 'demo.pth',
          lastError: null,
        }
      },
      loadParameters: async () => defaultParameters,
      saveParameters: async (parameters: BackendConversionParameters) => parameters,
    }

    await useVoiceChangerStore.getState().loadSelectedModel('E:/LLM/bianshengqi/assets/weights/demo.pth', client)

    expect(loadedModelPaths).toEqual(['E:/LLM/bianshengqi/assets/weights/demo.pth'])
    expect(useVoiceChangerStore.getState().selectedModelName).toBe('demo.pth')
    expect(useVoiceChangerStore.getState().backendConnected).toBe(true)
    expect(useVoiceChangerStore.getState().modelLoadError).toBeNull()
  })

  it('读取并保存音调参数', async () => {
    useVoiceChangerStore.setState(useVoiceChangerStore.getInitialState())
    const savedParameters: BackendConversionParameters[] = []
    const client: BackendClient = {
      loadSnapshot: async () => {
        throw new Error('本测试不应读取状态快照')
      },
      loadModels: async () => ({ modelCount: 0, models: [] }),
      loadEnvironment: async () => ({
        ffmpeg: {
          available: true,
          path: 'C:/tools/ffmpeg/bin/ffmpeg.exe',
          message: 'ffmpeg 已就绪',
        },
        cuda: {
          available: true,
          path: 'torch.cuda',
          message: 'CUDA 已就绪',
        },
      }),
      loadModel: async () => ({
        running: false,
        configured: true,
        latencyMs: 0,
        selectedModel: 'demo.pth',
        lastError: null,
      }),
      loadParameters: async () => ({
        ...defaultParameters,
        pitchSemitones: 4,
        indexRate: 0.66,
      }),
      saveParameters: async (parameters: BackendConversionParameters) => {
        savedParameters.push(parameters)
        return parameters
      },
    }

    await useVoiceChangerStore.getState().loadParameters(client)
    await useVoiceChangerStore.getState().savePitchSemitones(-3, client)

    expect(useVoiceChangerStore.getState().pitchSemitones).toBe(-3)
    expect(useVoiceChangerStore.getState().parametersError).toBeNull()
    expect(savedParameters).toEqual([
      {
        ...defaultParameters,
        pitchSemitones: -3,
        indexRate: 0.66,
      },
    ])
  })

  it('读取并保存检索率参数', async () => {
    useVoiceChangerStore.setState(useVoiceChangerStore.getInitialState())
    const savedParameters: BackendConversionParameters[] = []
    const client: BackendClient = {
      loadSnapshot: async () => {
        throw new Error('本测试不应读取状态快照')
      },
      loadModels: async () => ({ modelCount: 0, models: [] }),
      loadEnvironment: async () => ({
        ffmpeg: {
          available: true,
          path: 'C:/tools/ffmpeg/bin/ffmpeg.exe',
          message: 'ffmpeg 已就绪',
        },
        cuda: {
          available: true,
          path: 'torch.cuda',
          message: 'CUDA 已就绪',
        },
      }),
      loadModel: async () => ({
        running: false,
        configured: true,
        latencyMs: 0,
        selectedModel: 'demo.pth',
        lastError: null,
      }),
      loadParameters: async () => ({
        ...defaultParameters,
        pitchSemitones: 4,
        indexRate: 0.66,
      }),
      saveParameters: async (parameters: BackendConversionParameters) => {
        savedParameters.push(parameters)
        return parameters
      },
    }

    await useVoiceChangerStore.getState().loadParameters(client)
    await useVoiceChangerStore.getState().saveIndexRate(0.42, client)

    expect(useVoiceChangerStore.getState().indexRate).toBe(0.42)
    expect(useVoiceChangerStore.getState().parametersError).toBeNull()
    expect(savedParameters).toEqual([
      {
        ...defaultParameters,
        pitchSemitones: 4,
        indexRate: 0.42,
      },
    ])
  })

  it('从后端读取 ffmpeg 环境状态并记录缺失提示', async () => {
    useVoiceChangerStore.setState(useVoiceChangerStore.getInitialState())
    const client: BackendClient = {
      loadSnapshot: async () => {
        throw new Error('本测试不应读取状态快照')
      },
      loadModels: async () => ({ modelCount: 0, models: [] }),
      loadEnvironment: async () => ({
        ffmpeg: {
          available: false,
          path: '',
          message: '未检测到 ffmpeg，请安装 ffmpeg 并加入 PATH',
        },
        cuda: {
          available: false,
          path: '',
          message: 'CUDA 不可用，将使用 CPU 或 DirectML 方案；如需 NVIDIA GPU 加速，请安装匹配的显卡驱动和 CUDA 版 PyTorch',
        },
      }),
      ...parameterClientMethods,
    }

    await useVoiceChangerStore.getState().loadEnvironment(client)

    expect(useVoiceChangerStore.getState().ffmpegAvailable).toBe(false)
    expect(useVoiceChangerStore.getState().ffmpegMessage).toBe('未检测到 ffmpeg，请安装 ffmpeg 并加入 PATH')
    expect(useVoiceChangerStore.getState().cudaAvailable).toBe(false)
    expect(useVoiceChangerStore.getState().cudaMessage).toBe(
      'CUDA 不可用，将使用 CPU 或 DirectML 方案；如需 NVIDIA GPU 加速，请安装匹配的显卡驱动和 CUDA 版 PyTorch',
    )
  })
})
