import { describe, expect, it } from 'vitest'
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
})
