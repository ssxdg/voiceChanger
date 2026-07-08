import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// 每个用例后卸载 React 组件，避免上一个页面实例继续发起后端请求并影响后续断言。
afterEach(() => {
  cleanup()
})
