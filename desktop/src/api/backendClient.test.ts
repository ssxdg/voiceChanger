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

  it('后端返回错误时抛出可展示的中文错误', async () => {
    // 桌面端需要把底层 HTTP 失败转换成中文错误，避免把状态码或英文异常直接暴露给用户。
    const client = createBackendClient('http://127.0.0.1:6242', async () => new Response('', { status: 500 }))

    await expect(client.loadSnapshot()).rejects.toThrow('本地后端接口请求失败')
  })
})
