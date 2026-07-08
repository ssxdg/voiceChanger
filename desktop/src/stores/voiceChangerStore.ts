import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  backendClient,
  type BackendClient,
  type BackendConversionParameters,
  type BackendModel,
} from '../api/backendClient'

const defaultConversionParameters: BackendConversionParameters = {
  pitchSemitones: 0,
  indexRate: 0.75,
  protect: 0.33,
  inputThresholdDb: -45,
  outputGainDb: 0,
  denoise: false,
}

type VoiceChangerState = {
  selectedModelName: string
  inputDeviceName: string
  outputDeviceName: string
  latencyMs: number
  gpuStatus: string
  isRealtimeActive: boolean
  backendConnected: boolean
  backendError: string | null
  inputDeviceOptions: string[]
  outputDeviceOptions: string[]
  virtualOutputDeviceOptions: string[]
  modelItems: BackendModel[]
  modelCount: number
  modelListError: string | null
  modelLoadError: string | null
  conversionParameters: BackendConversionParameters
  pitchSemitones: number
  parametersError: string | null
  ffmpegAvailable: boolean | null
  ffmpegMessage: string
  cudaAvailable: boolean | null
  cudaMessage: string
  environmentError: string | null
  toggleRealtime: () => void
  loadBackendSnapshot: (client?: BackendClient) => Promise<void>
  loadModels: (client?: BackendClient) => Promise<void>
  loadSelectedModel: (modelPath: string, client?: BackendClient) => Promise<void>
  loadParameters: (client?: BackendClient) => Promise<void>
  savePitchSemitones: (pitchSemitones: number, client?: BackendClient) => Promise<void>
  loadEnvironment: (client?: BackendClient) => Promise<void>
}

export const useVoiceChangerStore = create<VoiceChangerState>()(
  persist(
    (set, get) => ({
      selectedModelName: '未选择模型',
      inputDeviceName: '未选择麦克风',
      outputDeviceName: '未选择输出设备',
      latencyMs: 0,
      gpuStatus: '等待环境检测',
      isRealtimeActive: false,
      backendConnected: false,
      backendError: null,
      inputDeviceOptions: [],
      outputDeviceOptions: [],
      virtualOutputDeviceOptions: [],
      modelItems: [],
      modelCount: 0,
      modelListError: null,
      modelLoadError: null,
      conversionParameters: defaultConversionParameters,
      pitchSemitones: defaultConversionParameters.pitchSemitones,
      parametersError: null,
      ffmpegAvailable: null,
      ffmpegMessage: '等待 ffmpeg 检测',
      cudaAvailable: null,
      cudaMessage: '等待 CUDA 检测',
      environmentError: null,
      // 使用一个集中 action 切换状态，后续接入后端时只需要在这里串联启动/停止接口。
      toggleRealtime: () => {
        set((state) => ({ isRealtimeActive: !state.isRealtimeActive }))
      },
      loadBackendSnapshot: async (client = backendClient) => {
        try {
          const snapshot = await client.loadSnapshot()

          set({
            backendConnected: true,
            backendError: snapshot.status.lastError,
            gpuStatus: '等待 GPU 检测',
            isRealtimeActive: snapshot.status.running,
            latencyMs: snapshot.status.latencyMs,
            selectedModelName: snapshot.status.selectedModel || '未选择模型',
            inputDeviceOptions: snapshot.devices.inputDevices,
            outputDeviceOptions: snapshot.devices.outputDevices,
            virtualOutputDeviceOptions: snapshot.devices.virtualOutputDevices,
          })
        } catch (error) {
          // 后端进程可能尚未启动，前端必须保持可用；这里只记录错误并停止实时状态，避免页面崩溃。
          set({
            backendConnected: false,
            backendError: error instanceof Error ? error.message : '连接本地后端失败',
            gpuStatus: '等待环境检测',
            isRealtimeActive: false,
          })
        }
      },
      loadModels: async (client = backendClient) => {
        try {
          const catalog = await client.loadModels()

          set({
            modelItems: catalog.models,
            modelCount: catalog.modelCount,
            modelListError: null,
          })
        } catch (error) {
          // 模型列表失败不应影响主控制台和实时按钮，因此单独记录模型页错误。
          set({
            modelItems: [],
            modelCount: 0,
            modelListError: error instanceof Error ? error.message : '读取本地模型列表失败',
          })
        }
      },
      loadSelectedModel: async (modelPath, client = backendClient) => {
        try {
          const status = await client.loadModel(modelPath)

          set({
            backendConnected: true,
            backendError: status.lastError,
            isRealtimeActive: status.running,
            latencyMs: status.latencyMs,
            selectedModelName: status.selectedModel || '未选择模型',
            modelLoadError: null,
          })
        } catch (error) {
          // 模型加载失败只影响模型管理流程，不清空已有模型列表，便于用户改选其他模型继续尝试。
          set({
            modelLoadError: error instanceof Error ? error.message : '加载模型失败',
          })
        }
      },
      loadParameters: async (client = backendClient) => {
        try {
          const parameters = await client.loadParameters()

          set({
            conversionParameters: parameters,
            pitchSemitones: parameters.pitchSemitones,
            parametersError: null,
          })
        } catch (error) {
          // 参数读取失败不影响基础控制台，设置页单独展示错误，用户仍可返回其他模块。
          set({
            parametersError: error instanceof Error ? error.message : '读取参数失败',
          })
        }
      },
      savePitchSemitones: async (pitchSemitones, client = backendClient) => {
        try {
          const nextParameters = {
            ...get().conversionParameters,
            pitchSemitones,
          }
          const savedParameters = await client.saveParameters(nextParameters)

          set({
            conversionParameters: savedParameters,
            pitchSemitones: savedParameters.pitchSemitones,
            parametersError: null,
          })
        } catch (error) {
          // 保存失败时保留当前滑块值，错误单独展示，避免用户误以为后端已经接受该参数。
          set({
            parametersError: error instanceof Error ? error.message : '保存音调参数失败',
          })
        }
      },
      loadEnvironment: async (client = backendClient) => {
        try {
          const environment = await client.loadEnvironment()

          set({
            ffmpegAvailable: environment.ffmpeg.available,
            ffmpegMessage: environment.ffmpeg.message,
            cudaAvailable: environment.cuda.available,
            cudaMessage: environment.cuda.message,
            environmentError: null,
          })
        } catch (error) {
          // 依赖检测失败时不阻断控制台，其结果只用于提醒用户修复本地运行环境。
          set({
            ffmpegAvailable: false,
            ffmpegMessage: '无法读取 ffmpeg 状态',
            cudaAvailable: false,
            cudaMessage: '无法读取 CUDA 状态',
            environmentError: error instanceof Error ? error.message : '读取运行环境失败',
          })
        }
      },
    }),
    {
      name: 'voice-changer-desktop-config',
      // 只持久化用户选择和运行参数，后端连接状态属于运行时结果，持久化会造成下次启动显示过期状态。
      partialize: (state) => ({
        selectedModelName: state.selectedModelName,
        inputDeviceName: state.inputDeviceName,
        outputDeviceName: state.outputDeviceName,
        latencyMs: state.latencyMs,
        gpuStatus: state.gpuStatus,
        isRealtimeActive: state.isRealtimeActive,
        conversionParameters: state.conversionParameters,
        pitchSemitones: state.pitchSemitones,
      }),
    },
  ),
)
