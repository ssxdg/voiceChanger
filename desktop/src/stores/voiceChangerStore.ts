import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type VoiceChangerState = {
  selectedModelName: string
  inputDeviceName: string
  outputDeviceName: string
  latencyMs: number
  gpuStatus: string
  isRealtimeActive: boolean
  toggleRealtime: () => void
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
      // 使用一个集中 action 切换状态，后续接入后端时只需要在这里串联启动/停止接口。
      toggleRealtime: () => {
        set((state) => ({ isRealtimeActive: !state.isRealtimeActive }))
      },
    }),
    {
      name: 'voice-changer-desktop-config',
      // 只持久化用户选择和运行参数，避免把函数 action 写入 localStorage。
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
