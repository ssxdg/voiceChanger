import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useVoiceChangerStore } from './stores/voiceChangerStore'

beforeEach(() => {
  // App 首屏会自动读取本地后端；测试环境默认模拟空设备结果，避免真实端口连接失败影响界面断言。
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/status')) {
        return new Response(
          JSON.stringify({
            running: false,
            configured: false,
            latencyMs: 0,
            selectedModel: '',
            lastError: null,
          }),
          { status: 200 },
        )
      }

      return new Response(
        JSON.stringify({
          inputDevices: [],
          outputDevices: [],
          virtualOutputDevices: [],
        }),
        { status: 200 },
      )
    }),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  useVoiceChangerStore.setState(useVoiceChangerStore.getInitialState())
})

describe('App', () => {
  it('渲染 Windows 变声器桌面控制台首屏', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'RVC Windows 变声器' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始变声' })).toBeInTheDocument()
    expect(screen.getByText('当前模型')).toBeInTheDocument()
    expect(screen.getByText('实时延迟')).toBeInTheDocument()
    expect(screen.getByText('虚拟麦克风输出')).toBeInTheDocument()
  })

  it('加载本地后端状态后展示连接状态和虚拟输出数量', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/status')) {
          return new Response(
            JSON.stringify({
              running: false,
              configured: false,
              latencyMs: 0,
              selectedModel: '',
              lastError: null,
            }),
            { status: 200 },
          )
        }

        return new Response(
          JSON.stringify({
            inputDevices: ['Microphone Array (MME)'],
            outputDevices: ['CABLE Input (MME)'],
            virtualOutputDevices: ['CABLE Input (MME)'],
          }),
          { status: 200 },
        )
      }),
    )

    render(<App />)

    await waitFor(() => expect(screen.getByText('后端已连接')).toBeInTheDocument())
    expect(screen.getByText('虚拟输出：1 个')).toBeInTheDocument()
  })
})
