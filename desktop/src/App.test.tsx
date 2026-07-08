import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

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
})
