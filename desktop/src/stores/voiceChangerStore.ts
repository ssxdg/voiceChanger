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
  indexRate: number
  protect: number
  inputThresholdDb: number
  outputGainDb: number
  denoise: boolean
  parametersError: string | null
  ffmpegAvailable: boolean | null
  ffmpegMessage: string
  cudaAvailable: boolean | null
  cudaMessage: string
  environmentError: string | null
  toggleRealtime: (client?: BackendClient) => Promise<void>
  loadBackendSnapshot: (client?: BackendClient) => Promise<void>
  loadModels: (client?: BackendClient) => Promise<void>
  loadSelectedModel: (modelPath: string, client?: BackendClient) => Promise<void>
  loadParameters: (client?: BackendClient) => Promise<void>
  savePitchSemitones: (pitchSemitones: number, client?: BackendClient) => Promise<void>
  saveIndexRate: (indexRate: number, client?: BackendClient) => Promise<void>
  saveProtect: (protect: number, client?: BackendClient) => Promise<void>
  saveInputThresholdDb: (inputThresholdDb: number, client?: BackendClient) => Promise<void>
  saveOutputGainDb: (outputGainDb: number, client?: BackendClient) => Promise<void>
  saveDenoise: (denoise: boolean, client?: BackendClient) => Promise<void>
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
      indexRate: defaultConversionParameters.indexRate,
      protect: defaultConversionParameters.protect,
      inputThresholdDb: defaultConversionParameters.inputThresholdDb,
      outputGainDb: defaultConversionParameters.outputGainDb,
      denoise: defaultConversionParameters.denoise,
      parametersError: null,
      ffmpegAvailable: null,
      ffmpegMessage: '等待 ffmpeg 检测',
      cudaAvailable: null,
      cudaMessage: '等待 CUDA 检测',
      environmentError: null,
      toggleRealtime: async (client = backendClient) => {
        try {
          // 启停按钮以本地后端返回的状态为准，避免前端本地切换和后端真实运行状态不一致。
          const status = get().isRealtimeActive ? await client.stopRealtime() : await client.startRealtime()

          set({
            backendConnected: true,
            backendError: status.lastError,
            isRealtimeActive: status.running,
            latencyMs: status.latencyMs,
            selectedModelName: status.selectedModel || '未选择模型',
          })
        } catch (error) {
          // 启停失败时保留原运行态，只展示后端错误，方便用户先修复模型或本地服务后重试。
          set({
            backendConnected: false,
            backendError: error instanceof Error ? error.message : '实时变声控制失败',
          })
        }
      },
      loadBackendSnapshot: async (client = backendClient) => {
        try {
          const snapshot = await client.loadSnapshot()

          set({
            backendConnected: true,
            backendError: snapshot.status.lastError,
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
            indexRate: parameters.indexRate,
            protect: parameters.protect,
            inputThresholdDb: parameters.inputThresholdDb,
            outputGainDb: parameters.outputGainDb,
            denoise: parameters.denoise,
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
      saveIndexRate: async (indexRate, client = backendClient) => {
        try {
          // 检索率与完整推理参数一起提交，避免只保存单字段时覆盖后端已有的保护度、降噪等设置。
          const nextParameters = {
            ...get().conversionParameters,
            indexRate,
          }
          const savedParameters = await client.saveParameters(nextParameters)

          set({
            conversionParameters: savedParameters,
            indexRate: savedParameters.indexRate,
            parametersError: null,
          })
        } catch (error) {
          // 保存失败时保留当前界面数值，只提示错误，避免用户误以为后端已经应用了新的检索率。
          set({
            parametersError: error instanceof Error ? error.message : '保存检索率参数失败',
          })
        }
      },
      saveProtect: async (protect, client = backendClient) => {
        try {
          // 保护值影响破音抑制，必须与完整参数一起提交，保证后端收到的是同一份推理配置。
          const nextParameters = {
            ...get().conversionParameters,
            protect,
          }
          const savedParameters = await client.saveParameters(nextParameters)

          set({
            conversionParameters: savedParameters,
            protect: savedParameters.protect,
            parametersError: null,
          })
        } catch (error) {
          // 保存失败时只展示错误，不回滚滑块，便于用户按当前可见值重试。
          set({
            parametersError: error instanceof Error ? error.message : '保存保护值参数失败',
          })
        }
      },
      saveInputThresholdDb: async (inputThresholdDb, client = backendClient) => {
        try {
          // 输入阈值控制噪声门触发点，和其他推理参数一起保存可避免后端配置被局部覆盖。
          const nextParameters = {
            ...get().conversionParameters,
            inputThresholdDb,
          }
          const savedParameters = await client.saveParameters(nextParameters)

          set({
            conversionParameters: savedParameters,
            inputThresholdDb: savedParameters.inputThresholdDb,
            parametersError: null,
          })
        } catch (error) {
          // 保存失败时保留当前滑块位置并展示错误，方便用户按当前值重试。
          set({
            parametersError: error instanceof Error ? error.message : '保存输入阈值参数失败',
          })
        }
      },
      saveOutputGainDb: async (outputGainDb, client = backendClient) => {
        try {
          // 输出增益直接影响变声后音量，和完整推理参数一起提交，避免覆盖其他滑块设置。
          const nextParameters = {
            ...get().conversionParameters,
            outputGainDb,
          }
          const savedParameters = await client.saveParameters(nextParameters)

          set({
            conversionParameters: savedParameters,
            outputGainDb: savedParameters.outputGainDb,
            parametersError: null,
          })
        } catch (error) {
          // 保存失败时保留当前滑块位置并展示错误，便于用户按当前增益值重试。
          set({
            parametersError: error instanceof Error ? error.message : '保存输出增益参数失败',
          })
        }
      },
      saveDenoise: async (denoise, client = backendClient) => {
        try {
          // 降噪开关会影响麦克风底噪处理，必须与完整推理参数一起提交，避免覆盖其它已调好的参数。
          const nextParameters = {
            ...get().conversionParameters,
            denoise,
          }
          const savedParameters = await client.saveParameters(nextParameters)

          set({
            conversionParameters: savedParameters,
            denoise: savedParameters.denoise,
            parametersError: null,
          })
        } catch (error) {
          // 保存失败时保留当前开关状态并展示错误，用户可以按当前可见选择直接重试。
          set({
            parametersError: error instanceof Error ? error.message : '保存降噪开关失败',
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
            // 控制台状态卡只展示短状态，详细 CUDA 修复建议保留在 cudaMessage 和告警区域。
            gpuStatus: environment.cuda.available ? 'CUDA 已就绪' : 'CPU/DirectML 降级',
            environmentError: null,
          })
        } catch (error) {
          // 依赖检测失败时不阻断控制台，其结果只用于提醒用户修复本地运行环境。
          set({
            ffmpegAvailable: false,
            ffmpegMessage: '无法读取 ffmpeg 状态',
            cudaAvailable: false,
            cudaMessage: '无法读取 CUDA 状态',
            gpuStatus: '等待环境检测',
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
        indexRate: state.indexRate,
        protect: state.protect,
        inputThresholdDb: state.inputThresholdDb,
        outputGainDb: state.outputGainDb,
        denoise: state.denoise,
      }),
    },
  ),
)
