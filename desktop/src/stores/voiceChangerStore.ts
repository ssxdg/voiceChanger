import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { backendClient, type BackendClient } from '../api/backendClient'

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
  toggleRealtime: () => void
  loadBackendSnapshot: (client?: BackendClient) => Promise<void>
}

export const useVoiceChangerStore = create<VoiceChangerState>()(
  persist(
    (set) => ({
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
      }),
    },
  ),
)
