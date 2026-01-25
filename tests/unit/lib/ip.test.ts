import { describe, it, expect } from '@jest/globals'
import { extractClientIP, hashIP } from '@/lib/ip'
import { Request } from 'express'

describe('extractClientIP', () => {
  it('should extract IP from X-Forwarded-For header (string)', () => {
    const req = {
      headers: {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1',
      },
      ip: '127.0.0.1',
    } as unknown as Request

    expect(extractClientIP(req)).toBe('192.168.1.1')
  })

  it('should extract IP from X-Forwarded-For header (array)', () => {
    const req = {
      headers: {
        'x-forwarded-for': ['192.168.1.1, 10.0.0.1'],
      },
      ip: '127.0.0.1',
    } as unknown as Request

    expect(extractClientIP(req)).toBe('192.168.1.1')
  })

  it('should handle single IP in X-Forwarded-For', () => {
    const req = {
      headers: {
        'x-forwarded-for': '192.168.1.1',
      },
      ip: '127.0.0.1',
    } as unknown as Request

    expect(extractClientIP(req)).toBe('192.168.1.1')
  })

  it('should trim whitespace from IP', () => {
    const req = {
      headers: {
        'x-forwarded-for': '  192.168.1.1  , 10.0.0.1',
      },
      ip: '127.0.0.1',
    } as unknown as Request

    expect(extractClientIP(req)).toBe('192.168.1.1')
  })

  it('should fall back to req.ip when X-Forwarded-For is missing', () => {
    const req = {
      headers: {},
      ip: '127.0.0.1',
    } as unknown as Request

    expect(extractClientIP(req)).toBe('127.0.0.1')
  })

  it('should fall back to 127.0.0.1 when req.ip is undefined', () => {
    const req = {
      headers: {},
      ip: undefined,
    } as unknown as Request

    expect(extractClientIP(req)).toBe('127.0.0.1')
  })

  it('should handle empty X-Forwarded-For', () => {
    const req = {
      headers: {
        'x-forwarded-for': '',
      },
      ip: '10.0.0.1',
    } as unknown as Request

    expect(extractClientIP(req)).toBe('10.0.0.1')
  })

  it('should handle X-Forwarded-For with empty first entry', () => {
    const req = {
      headers: {
        'x-forwarded-for': ', 192.168.1.1',
      },
      ip: '10.0.0.1',
    } as unknown as Request

    // Empty first entry should fall back
    expect(extractClientIP(req)).toBe('10.0.0.1')
  })
})

describe('hashIP', () => {
  it('should return a 16-character hex string', () => {
    const hash = hashIP('192.168.1.1')

    expect(hash).toHaveLength(16)
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })

  it('should return consistent hash for same IP', () => {
    const hash1 = hashIP('192.168.1.1')
    const hash2 = hashIP('192.168.1.1')

    expect(hash1).toBe(hash2)
  })

  it('should return different hash for different IPs', () => {
    const hash1 = hashIP('192.168.1.1')
    const hash2 = hashIP('192.168.1.2')

    expect(hash1).not.toBe(hash2)
  })

  it('should handle IPv6 addresses', () => {
    const hash = hashIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')

    expect(hash).toHaveLength(16)
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })

  it('should handle localhost', () => {
    const hash = hashIP('127.0.0.1')

    expect(hash).toHaveLength(16)
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })
})
