import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { Request, Response, NextFunction } from 'express'

// Store original crypto
const originalCrypto = global.crypto

// Mock crypto.randomUUID
const mockUUID = '550e8400-e29b-41d4-a716-446655440000'

describe('requestIdMiddleware', () => {
  let requestIdMiddleware: typeof import('@/middleware/request-id.middleware').requestIdMiddleware
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: jest.Mock<NextFunction>

  beforeEach(async () => {
    // Set up crypto mock before importing
    global.crypto = {
      ...originalCrypto,
      randomUUID: jest.fn(() => mockUUID) as () => `${string}-${string}-${string}-${string}-${string}`,
    }

    jest.resetModules()

    // Dynamic import after setting up mocks
    const module = await import('@/middleware/request-id.middleware')
    requestIdMiddleware = module.requestIdMiddleware

    mockReq = {
      headers: {},
    }
    mockRes = {
      setHeader: jest.fn(),
    }
    mockNext = jest.fn()
  })

  afterEach(() => {
    global.crypto = originalCrypto
  })

  it('should use existing X-Request-Id from headers', () => {
    const existingId = 'existing-request-id'
    mockReq.headers = { 'x-request-id': existingId }

    const middleware = requestIdMiddleware()
    middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(mockReq.headers['x-request-id']).toBe(existingId)
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Id', existingId)
    expect(mockNext).toHaveBeenCalled()
  })

  it('should generate new request ID if none provided', () => {
    const middleware = requestIdMiddleware()
    middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(mockReq.headers!['x-request-id']).toBe(mockUUID)
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Id', mockUUID)
    expect(mockNext).toHaveBeenCalled()
  })

  it('should set X-Request-Id response header', () => {
    const requestId = 'test-id-123'
    mockReq.headers = { 'x-request-id': requestId }

    const middleware = requestIdMiddleware()
    middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Id', requestId)
  })

  it('should call next()', () => {
    const middleware = requestIdMiddleware()
    middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalledTimes(1)
  })
})
