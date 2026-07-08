import { describe, expect, it } from 'vitest'
import type { BackendClient } from '../api/backendClient'
import { useVoiceChangerStore } from './voiceChangerStore'

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
    }

    await useVoiceChangerStore.getState().loadBackendSnapshot(client)

    expect(useVoiceChangerStore.getState().backendConnected).toBe(false)
    expect(useVoiceChangerStore.getState().backendError).toBe('连接本地后端失败')
    expect(useVoiceChangerStore.getState().isRealtimeActive).toBe(false)
  })
})
