import { describe, expect, it } from 'vitest'
import { createBackendClient } from './backendClient'

describe('backendClient', () => {
  it('从本地后端并行读取运行状态和设备清单', async () => {
    const requestedUrls: string[] = []
    // 这里用轻量 transport 替代真实 HTTP 服务，验证 client 的 URL 组织和并行读取契约即可。
    const transport = async (input: RequestInfo | URL) => {
      const url = String(input)
      requestedUrls.push(url)

      if (url.endsWith('/status')) {
        return new Response(
          JSON.stringify({
            running: true,
            configured: true,
            latencyMs: 96,
            selectedModel: 'demo.pth',
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
    }

    const client = createBackendClient('http://127.0.0.1:6242', transport)
    const snapshot = await client.loadSnapshot()

    expect(requestedUrls).toEqual(['http://127.0.0.1:6242/status', 'http://127.0.0.1:6242/devices'])
    expect(snapshot.status.latencyMs).toBe(96)
    expect(snapshot.status.selectedModel).toBe('demo.pth')
    expect(snapshot.devices.virtualOutputDevices).toEqual(['CABLE Input (MME)'])
  })

  it('读取本地模型列表', async () => {
    // 模型列表会被模型管理页单独读取，单独测试可以避免和首屏状态快照耦合。
    const client = createBackendClient('http://127.0.0.1:6242', async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('http://127.0.0.1:6242/models')

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
    })

    const catalog = await client.loadModels()

    expect(catalog.modelCount).toBe(1)
    expect(catalog.models[0].name).toBe('demo.pth')
    expect(catalog.models[0].indexReady).toBe(true)
  })

  it('请求本地后端加载指定 RVC 模型', async () => {
    const requested: Array<{ url: string; method: string; body: string }> = []
    const client = createBackendClient('http://127.0.0.1:6242', async (input: RequestInfo | URL, init?: RequestInit) => {
      requested.push({
        url: String(input),
        method: init?.method ?? 'GET',
        body: String(init?.body ?? ''),
      })

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
    })

    await expect(client.loadModel('E:/LLM/bianshengqi/assets/weights/demo.pth')).resolves.toEqual({
      running: false,
      configured: true,
      latencyMs: 0,
      selectedModel: 'demo.pth',
      lastError: null,
    })
    expect(requested).toEqual([
      {
        url: 'http://127.0.0.1:6242/models/load',
        method: 'POST',
        body: JSON.stringify({ modelPath: 'E:/LLM/bianshengqi/assets/weights/demo.pth' }),
      },
    ])
  })

  it('请求本地后端启动和停止实时变声', async () => {
    const requested: Array<{ url: string; method: string; body: string }> = []
    const client = createBackendClient('http://127.0.0.1:6242', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      requested.push({
        url,
        method: init?.method ?? 'GET',
        body: String(init?.body ?? ''),
      })

      return new Response(
        JSON.stringify({
          running: url.endsWith('/realtime/start'),
          configured: true,
          latencyMs: 24,
          selectedModel: 'demo.pth',
          lastError: null,
        }),
        { status: 200 },
      )
    })

    await expect(client.startRealtime()).resolves.toEqual({
      running: true,
      configured: true,
      latencyMs: 24,
      selectedModel: 'demo.pth',
      lastError: null,
    })
    await expect(client.stopRealtime()).resolves.toEqual({
      running: false,
      configured: true,
      latencyMs: 24,
      selectedModel: 'demo.pth',
      lastError: null,
    })
    expect(requested).toEqual([
      { url: 'http://127.0.0.1:6242/realtime/start', method: 'POST', body: '' },
      { url: 'http://127.0.0.1:6242/realtime/stop', method: 'POST', body: '' },
    ])
  })

  it('读取本地运行环境依赖状态', async () => {
    const client = createBackendClient('http://127.0.0.1:6242', async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('http://127.0.0.1:6242/environment')

      return new Response(
        JSON.stringify({
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
        { status: 200 },
      )
    })

    const environment = await client.loadEnvironment()

    expect(environment.ffmpeg.available).toBe(false)
    expect(environment.ffmpeg.message).toBe('未检测到 ffmpeg，请安装 ffmpeg 并加入 PATH')
    expect(environment.cuda.available).toBe(false)
    expect(environment.cuda.message).toBe(
      'CUDA 不可用，将使用 CPU 或 DirectML 方案；如需 NVIDIA GPU 加速，请安装匹配的显卡驱动和 CUDA 版 PyTorch',
    )
  })

  it('读取并提交 RVC 转换参数', async () => {
    const requested: Array<{ url: string; method: string; body: string }> = []
    const parameters = {
      pitchSemitones: 7,
      indexRate: 0.72,
      protect: 0.4,
      inputThresholdDb: -40,
      outputGainDb: 2,
      denoise: true,
    }
    const client = createBackendClient('http://127.0.0.1:6242', async (input: RequestInfo | URL, init?: RequestInit) => {
      requested.push({
        url: String(input),
        method: init?.method ?? 'GET',
        body: String(init?.body ?? ''),
      })

      return new Response(JSON.stringify(parameters), { status: 200 })
    })

    await expect(client.loadParameters()).resolves.toEqual(parameters)
    await expect(client.saveParameters(parameters)).resolves.toEqual(parameters)
    expect(requested).toEqual([
      { url: 'http://127.0.0.1:6242/parameters', method: 'GET', body: '' },
      { url: 'http://127.0.0.1:6242/parameters', method: 'POST', body: JSON.stringify(parameters) },
    ])
  })

  it('后端返回错误时抛出可展示的中文错误', async () => {
    // 桌面端需要把底层 HTTP 失败转换成中文错误，避免把状态码或英文异常直接暴露给用户。
    const client = createBackendClient('http://127.0.0.1:6242', async () => new Response('', { status: 500 }))

    await expect(client.loadSnapshot()).rejects.toThrow('本地后端接口请求失败')
  })

  it('后端返回 error 字段时透传中文错误', async () => {
    const client = createBackendClient(
      'http://127.0.0.1:6242',
      async () =>
        new Response(JSON.stringify({ error: '模型文件可能已损坏，请重新导入 .pth 模型' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
    )

    await expect(client.loadModel('E:/LLM/bianshengqi/assets/weights/broken.pth')).rejects.toThrow(
      '模型文件可能已损坏，请重新导入 .pth 模型',
    )
  })
})
