import { describe, expect, it } from 'vitest'
import { demoPathForAdmin, liveApiConfigured } from './live-mode'

describe('liveApiConfigured', () => {
  it('rejects missing and placeholder URLs', () => {
    expect(liveApiConfigured(undefined)).toBe(false)
    expect(liveApiConfigured('')).toBe(false)
    expect(liveApiConfigured('https://api.example.com')).toBe(false)
  })

  it('allows explicit localhost and real hosts (local Live + vite preview)', () => {
    expect(liveApiConfigured('http://127.0.0.1:8787', false)).toBe(true)
    expect(liveApiConfigured('http://localhost:8787', true)).toBe(true)
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
