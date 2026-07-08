import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

      if (url.endsWith('/models')) {
        return new Response(
          JSON.stringify({
            modelCount: 0,
            models: [],
          }),
          { status: 200 },
        )
      }

      if (url.endsWith('/environment')) {
        return new Response(
          JSON.stringify({
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

        if (url.endsWith('/models')) {
          return new Response(JSON.stringify({ modelCount: 0, models: [] }), { status: 200 })
        }

        if (url.endsWith('/environment')) {
          return new Response(
            JSON.stringify({
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

  it('控制台没有模型时展示缺少模型提示', async () => {
    render(<App />)

    await waitFor(() => expect(screen.getByText('未发现本地模型，实时变声暂不可启动')).toBeInTheDocument())
    expect(screen.getByText('请将 .pth 模型放入 assets/weights 后刷新模型列表')).toBeInTheDocument()
  })

  it('控制台展示缺少 ffmpeg 的中文提示', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/environment')) {
          return new Response(
            JSON.stringify({
              ffmpeg: {
                available: false,
                path: '',
                message: '未检测到 ffmpeg，请安装 ffmpeg 并加入 PATH',
              },
              cuda: {
                available: true,
                path: 'torch.cuda',
                message: 'CUDA 已就绪',
              },
            }),
            { status: 200 },
          )
        }

        if (url.endsWith('/models')) {
          return new Response(JSON.stringify({ modelCount: 1, models: [] }), { status: 200 })
        }

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

        return new Response(JSON.stringify({ inputDevices: [], outputDevices: [], virtualOutputDevices: [] }), {
          status: 200,
        })
      }),
    )

    render(<App />)

    await waitFor(() => expect(screen.getByText('ffmpeg 未就绪')).toBeInTheDocument())
    expect(screen.getByText('未检测到 ffmpeg，请安装 ffmpeg 并加入 PATH')).toBeInTheDocument()
  })

  it('控制台展示 CUDA 不可用的中文降级提示', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/environment')) {
          return new Response(
            JSON.stringify({
              ffmpeg: {
                available: true,
                path: 'C:/tools/ffmpeg/bin/ffmpeg.exe',
                message: 'ffmpeg 已就绪',
              },
              cuda: {
                available: false,
                path: '',
                message: 'CUDA 不可用，将使用 CPU 或 DirectML 方案；如需 NVIDIA GPU 加速，请安装匹配的显卡驱动和 CUDA 版 PyTorch',
              },
            }),
            { status: 200 },
          )
        }

        if (url.endsWith('/models')) {
          return new Response(JSON.stringify({ modelCount: 1, models: [] }), { status: 200 })
        }

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

        return new Response(JSON.stringify({ inputDevices: [], outputDevices: [], virtualOutputDevices: [] }), {
          status: 200,
        })
      }),
    )

    render(<App />)

    await waitFor(() => expect(screen.getByText('CUDA 不可用')).toBeInTheDocument())
    expect(
      screen.getByText('CUDA 不可用，将使用 CPU 或 DirectML 方案；如需 NVIDIA GPU 加速，请安装匹配的显卡驱动和 CUDA 版 PyTorch'),
    ).toBeInTheDocument()
  })

  it('在模型管理页展示本地模型列表', async () => {
    const requestedModelLoads: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/models/load')) {
          requestedModelLoads.push(String(init?.body ?? ''))
          return new Response(
            JSON.stringify({
              running: false,
              configured: true,
              latencyMs: 0,
              selectedModel: 'demo.pth',
              lastError: null,
            }),
            { status: 200 },
          )
        }

        if (url.endsWith('/models')) {
          return new Response(
            JSON.stringify({
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
            { status: 200 },
          )
        }

        if (url.endsWith('/environment')) {
          return new Response(
            JSON.stringify({
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
          { status: 200 },
        )
        }

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
      }),
    )

    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: '模型管理' }))

    await waitFor(() => expect(screen.getByText('已导入模型：1 个')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: '模型管理' })).toBeInTheDocument()
    expect(screen.getByText('demo.pth')).toBeInTheDocument()
    expect(screen.getByText('索引已匹配')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '使用模型 demo.pth' }))

    await waitFor(() => expect(screen.getByText('当前使用')).toBeInTheDocument())
    expect(requestedModelLoads).toEqual([
      JSON.stringify({ modelPath: 'E:/LLM/bianshengqi/assets/weights/demo.pth' }),
    ])
  })

  it('模型管理页没有模型时展示导入路径提示', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: '模型管理' }))

    await waitFor(() => expect(screen.getByText('尚未发现本地 RVC 模型')).toBeInTheDocument())
    expect(screen.getByText('请将 .pth 模型放入 assets/weights 后刷新模型列表')).toBeInTheDocument()
  })
})
