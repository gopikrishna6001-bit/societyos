import { describe, expect, it } from 'vitest'
import { demoPathForAdmin, liveApiConfigured } from './live-mode'

describe('liveApiConfigured', () => {
  it('rejects missing, placeholder, and production localhost URLs', () => {
    expect(liveApiConfigured(undefined, false)).toBe(false)
    expect(liveApiConfigured('', true)).toBe(false)
    expect(liveApiConfigured('https://api.example.com', false)).toBe(false)
    expect(liveApiConfigured('http://127.0.0.1:8787', false)).toBe(false)
    expect(liveApiConfigured('http://localhost:8787', false)).toBe(false)
  })

  it('allows localhost only in DEV and real hosts always', () => {
    expect(liveApiConfigured('http://127.0.0.1:8787', true)).toBe(true)
    expect(liveApiConfigured('https://api.sabha.example', false)).toBe(true)
  })
})

describe('demoPathForAdmin', () => {
  it('maps admin paths onto demo', () => {
    expect(demoPathForAdmin('/admin')).toBe('/demo')
    expect(demoPathForAdmin('/admin/visitors')).toBe('/demo/visitors')
    expect(demoPathForAdmin('/other')).toBe('/demo')
  })
})
