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

  it('文件变声页可导入支持的音频文件', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: '文件变声' }))

    // 使用浏览器 File 对象模拟桌面端选择结果，验证页面只依赖用户选择的文件元数据。
    const audioFile = new File(['demo'], 'voice-demo.mp3', { type: 'audio/mpeg' })
    fireEvent.change(screen.getByLabelText('选择音频文件'), { target: { files: [audioFile] } })

    expect(screen.getByText('已选择音频：voice-demo.mp3')).toBeInTheDocument()
    expect(screen.getByText('格式：MP3')).toBeInTheDocument()
    expect(screen.getByText('大小：4 B')).toBeInTheDocument()
  })

  it('文件变声页会拒绝不支持的音频格式', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: '文件变声' }))

    // 非音频扩展名不能进入后续变声流程，避免用户误以为任意文件都可以处理。
    const textFile = new File(['demo'], 'readme.txt', { type: 'text/plain' })
    fireEvent.change(screen.getByLabelText('选择音频文件'), { target: { files: [textFile] } })

    expect(screen.getByText('仅支持 wav、mp3、flac 音频文件')).toBeInTheDocument()
    expect(screen.queryByText(/已选择音频：/)).not.toBeInTheDocument()
  })

  it('设置页可读取并保存音调调节', async () => {
    const savedParameters: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/parameters') && init?.method === 'POST') {
          savedParameters.push(String(init.body ?? ''))
          return new Response(String(init.body ?? '{}'), { status: 200 })
        }

        if (url.endsWith('/parameters')) {
          return new Response(
            JSON.stringify({
              pitchSemitones: 4,
              indexRate: 0.75,
              protect: 0.33,
              inputThresholdDb: -45,
              outputGainDb: 0,
              denoise: false,
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
    fireEvent.click(screen.getByRole('link', { name: '设置' }))

    await waitFor(() => expect(screen.getByText('音调：4 半音')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('音调调节'), { target: { value: '-3' } })

    await waitFor(() => expect(screen.getByText('音调：-3 半音')).toBeInTheDocument())
    expect(savedParameters).toEqual([
      JSON.stringify({
        pitchSemitones: -3,
        indexRate: 0.75,
        protect: 0.33,
        inputThresholdDb: -45,
        outputGainDb: 0,
        denoise: false,
      }),
    ])
  })

  it('设置页可读取并保存检索率调节', async () => {
    const savedParameters: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/parameters') && init?.method === 'POST') {
          savedParameters.push(String(init.body ?? ''))
          return new Response(String(init.body ?? '{}'), { status: 200 })
        }

        if (url.endsWith('/parameters')) {
          return new Response(
            JSON.stringify({
              pitchSemitones: 4,
              indexRate: 0.66,
              protect: 0.33,
              inputThresholdDb: -45,
              outputGainDb: 0,
              denoise: false,
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
    fireEvent.click(screen.getByRole('link', { name: '设置' }))

    await waitFor(() => expect(screen.getByText('检索率：66%')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('检索率调节'), { target: { value: '0.42' } })

    await waitFor(() => expect(screen.getByText('检索率：42%')).toBeInTheDocument())
    expect(savedParameters).toEqual([
      JSON.stringify({
        pitchSemitones: 4,
        indexRate: 0.42,
        protect: 0.33,
        inputThresholdDb: -45,
        outputGainDb: 0,
        denoise: false,
      }),
    ])
  })

  it('设置页可读取并保存保护值调节', async () => {
    const savedParameters: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/parameters') && init?.method === 'POST') {
          savedParameters.push(String(init.body ?? ''))
          return new Response(String(init.body ?? '{}'), { status: 200 })
        }

        if (url.endsWith('/parameters')) {
          return new Response(
            JSON.stringify({
              pitchSemitones: 4,
              indexRate: 0.66,
              protect: 0.18,
              inputThresholdDb: -45,
              outputGainDb: 0,
              denoise: false,
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
    fireEvent.click(screen.getByRole('link', { name: '设置' }))

    await waitFor(() => expect(screen.getByText('保护值：18%')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('保护值调节'), { target: { value: '0.27' } })

    await waitFor(() => expect(screen.getByText('保护值：27%')).toBeInTheDocument())
    expect(savedParameters).toEqual([
      JSON.stringify({
        pitchSemitones: 4,
        indexRate: 0.66,
        protect: 0.27,
        inputThresholdDb: -45,
        outputGainDb: 0,
        denoise: false,
      }),
    ])
  })

  it('设置页可读取并保存输入阈值调节', async () => {
    const savedParameters: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/parameters') && init?.method === 'POST') {
          savedParameters.push(String(init.body ?? ''))
          return new Response(String(init.body ?? '{}'), { status: 200 })
        }

        if (url.endsWith('/parameters')) {
          return new Response(
            JSON.stringify({
              pitchSemitones: 4,
              indexRate: 0.66,
              protect: 0.18,
              inputThresholdDb: -38,
              outputGainDb: 0,
              denoise: false,
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
    fireEvent.click(screen.getByRole('link', { name: '设置' }))

    await waitFor(() => expect(screen.getByText('输入阈值：-38 dB')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('输入阈值调节'), { target: { value: '-52' } })

    await waitFor(() => expect(screen.getByText('输入阈值：-52 dB')).toBeInTheDocument())
    expect(savedParameters).toEqual([
      JSON.stringify({
        pitchSemitones: 4,
        indexRate: 0.66,
        protect: 0.18,
        inputThresholdDb: -52,
        outputGainDb: 0,
        denoise: false,
      }),
    ])
  })

  it('设置页可读取并保存输出增益调节', async () => {
    const savedParameters: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/parameters') && init?.method === 'POST') {
          savedParameters.push(String(init.body ?? ''))
          return new Response(String(init.body ?? '{}'), { status: 200 })
        }

        if (url.endsWith('/parameters')) {
          return new Response(
            JSON.stringify({
              pitchSemitones: 4,
              indexRate: 0.66,
              protect: 0.18,
              inputThresholdDb: -38,
              outputGainDb: -2,
              denoise: false,
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
    fireEvent.click(screen.getByRole('link', { name: '设置' }))

    await waitFor(() => expect(screen.getByText('输出增益：-2 dB')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('输出增益调节'), { target: { value: '6' } })

    await waitFor(() => expect(screen.getByText('输出增益：6 dB')).toBeInTheDocument())
    expect(savedParameters).toEqual([
      JSON.stringify({
        pitchSemitones: 4,
        indexRate: 0.66,
        protect: 0.18,
        inputThresholdDb: -38,
        outputGainDb: 6,
        denoise: false,
      }),
    ])
  })

  it('设置页可读取并保存降噪开关', async () => {
    const savedParameters: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        // 该用例只验证设置页参数读写链路，所以用内存响应模拟后端，避免测试依赖本地 Python 服务状态。
        if (url.endsWith('/parameters') && init?.method === 'POST') {
          savedParameters.push(String(init.body ?? ''))
          return new Response(String(init.body ?? '{}'), { status: 200 })
        }

        if (url.endsWith('/parameters')) {
          return new Response(
            JSON.stringify({
              pitchSemitones: 4,
              indexRate: 0.66,
              protect: 0.18,
              inputThresholdDb: -38,
              outputGainDb: 6,
              denoise: true,
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
    fireEvent.click(screen.getByRole('link', { name: '设置' }))

    await waitFor(() => expect(screen.getByText('降噪：开启')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('降噪开关'))

    await waitFor(() => expect(screen.getByText('降噪：关闭')).toBeInTheDocument())
    expect(savedParameters).toEqual([
      JSON.stringify({
        pitchSemitones: 4,
        indexRate: 0.66,
        protect: 0.18,
        inputThresholdDb: -38,
        outputGainDb: 6,
        denoise: false,
      }),
    ])
  })
})
