import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { Request, Response, NextFunction } from 'express'

// Store original crypto
const originalCrypto = global.crypto

// Mock crypto.randomUUID
const mockUUID = '550e8400-e29b-41d4-a716-446655440000'

describe('requestContextMiddleware', () => {
  let requestContextMiddleware: typeof import('@/middleware/request-context').requestContextMiddleware
  let getRequestContext: typeof import('@/middleware/request-context').getRequestContext
  let requestContext: typeof import('@/middleware/request-context').requestContext

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
    const module = await import('@/middleware/request-context')
    requestContextMiddleware = module.requestContextMiddleware
    getRequestContext = module.getRequestContext
    requestContext = module.requestContext

    mockReq = {
      headers: {},
    }
    mockRes = {}
    mockNext = jest.fn()
  })

  afterEach(() => {
    global.crypto = originalCrypto
  })

  it('should create context with request ID from headers', (done) => {
    const requestId = 'test-request-id'
    mockReq.headers = { 'x-request-id': requestId }

    mockNext = jest.fn(() => {
      const context = getRequestContext()
      expect(context).toBeDefined()
      expect(context?.requestId).toBe(requestId)
      done()
    })

    const middleware = requestContextMiddleware()
    middleware(mockReq as Request, mockRes as Response, mockNext)
  })

  it('should generate request ID if none provided', (done) => {
    mockNext = jest.fn(() => {
      const context = getRequestContext()
      expect(context?.requestId).toBe(mockUUID)
      done()
    })

    const middleware = requestContextMiddleware()
    middleware(mockReq as Request, mockRes as Response, mockNext)
  })

  it('should set startTime in context', (done) => {
    const beforeTime = Date.now()

    mockNext = jest.fn(() => {
      const context = getRequestContext()
      const afterTime = Date.now()
      expect(context?.startTime).toBeGreaterThanOrEqual(beforeTime)
      expect(context?.startTime).toBeLessThanOrEqual(afterTime)
      done()
    })

    const middleware = requestContextMiddleware()
    middleware(mockReq as Request, mockRes as Response, mockNext)
  })

  it('should call next within context', (done) => {
    mockNext = jest.fn(() => {
      expect(mockNext).toHaveBeenCalled()
      done()
    })

    const middleware = requestContextMiddleware()
    middleware(mockReq as Request, mockRes as Response, mockNext)
  })
})

describe('getRequestContext', () => {
  let getRequestContext: typeof import('@/middleware/request-context').getRequestContext
  let requestContext: typeof import('@/middleware/request-context').requestContext

  beforeEach(async () => {
    jest.resetModules()
    const module = await import('@/middleware/request-context')
    getRequestContext = module.getRequestContext
    requestContext = module.requestContext
  })

  it('should return undefined outside of context', () => {
    const context = getRequestContext()
    expect(context).toBeUndefined()
  })

  it('should return context when running inside context', (done) => {
    const testContext = {
      requestId: 'test-id',
      startTime: Date.now(),
    }

    requestContext.run(testContext, () => {
      const context = getRequestContext()
      expect(context).toEqual(testContext)
      done()
    })
  })
})
