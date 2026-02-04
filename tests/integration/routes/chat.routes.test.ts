import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import request from 'supertest'
import express, { type Express } from 'express'
import { createChatSession } from '../../helpers/test-factories'

// Mock repository
const mockChatRepository = {
  findActiveSession: jest.fn(),
  createSession: jest.fn(),
  addMessage: jest.fn(),
  getMessages: jest.fn(),
  findSession: jest.fn(),
  getStats: jest.fn(),
}

// Mock event emitter
const mockEventEmitter = {
  emit: jest.fn(),
}

// Mock rate limiter
const mockRateLimiter = {
  consume: jest.fn(),
  emitRateLimitEvent: jest.fn(),
}

// Mock LLM provider
const mockLLMProvider = {
  sendMessage: jest.fn(),
}

jest.unstable_mockModule('@/repositories', () => ({
  chatRepository: mockChatRepository,
}))

jest.unstable_mockModule('@/events', () => ({
  eventEmitter: mockEventEmitter,
}))

jest.unstable_mockModule('@/resilience', () => ({
  rateLimiter: mockRateLimiter,
}))

jest.unstable_mockModule('@/llm', () => ({
  getLLMProvider: () => mockLLMProvider,
}))

// Mock tool execution
const mockExecuteToolCall = jest.fn()
jest.unstable_mockModule('@/tools', () => ({
  chatToolDefinitions: [],
  executeToolCall: mockExecuteToolCall,
}))

// Mock circuit breaker to just execute the function
jest.unstable_mockModule('@/resilience/circuit-breaker', () => ({
  CircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: async (fn: () => Promise<unknown>) => fn(),
  })),
}))

describe('Chat Routes Integration', () => {
  let app: Express

  beforeEach(async () => {
    jest.clearAllMocks()

    // Default rate limiter behavior
    mockRateLimiter.consume.mockResolvedValue({ allowed: true, remaining: 9 })

    // Dynamic import to apply mocks
    const { chatRouter } = await import('@/routes/v1/chat')
    const { errorHandler } = await import('@/middleware/error-handler')
    const { requestIdMiddleware } = await import('@/middleware/request-id')
    const { requestContextMiddleware } = await import('@/middleware/request-context')

    app = express()
    app.use(requestIdMiddleware())
    app.use(requestContextMiddleware())
    app.use(express.json())
    app.use('/api/v1/chat', chatRouter)
    app.use(errorHandler)
  })

  afterEach(() => {
    jest.resetModules()
  })

  describe('POST /api/v1/chat', () => {
    it('should process a message and return response', async () => {
      const mockSession = createChatSession({ id: 'sess_test123' })
      const mockAssistantMessage = {
        id: 'msg_assistant123',
        sessionId: mockSession.id,
        role: 'assistant',
        content: 'Hello! How can I help you?',
        tokensUsed: 25,
        model: 'gpt-4o-mini',
        createdAt: new Date().toISOString(),
      }

      mockChatRepository.findActiveSession.mockResolvedValue(null)
      mockChatRepository.createSession.mockResolvedValue(mockSession)
      mockChatRepository.getMessages.mockResolvedValue([])
      mockChatRepository.addMessage.mockResolvedValue(mockAssistantMessage)
      mockLLMProvider.sendMessage.mockResolvedValue({
        content: 'Hello! How can I help you?',
        tokensUsed: 25,
        model: 'gpt-4o-mini',
      })

      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          message: 'Hello',
          visitorId: 'visitor-123',
        })

      expect(response.status).toBe(200)
      expect(response.body.sessionId).toBe(mockSession.id)
      expect(response.body.message.role).toBe('assistant')
      expect(response.body.message.content).toBe('Hello! How can I help you?')
      expect(response.body.tokensUsed).toBe(25)
    })

    it('should reuse existing session', async () => {
      const existingSession = createChatSession({ id: 'sess_existing123' })
      const mockAssistantMessage = {
        id: 'msg_assistant456',
        sessionId: existingSession.id,
        role: 'assistant',
        content: 'I remember you!',
        tokensUsed: 20,
        model: 'gpt-4o-mini',
        createdAt: new Date().toISOString(),
      }

      mockChatRepository.findActiveSession.mockResolvedValue(existingSession)
      mockChatRepository.getMessages.mockResolvedValue([
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' },
      ])
      mockChatRepository.addMessage.mockResolvedValue(mockAssistantMessage)
      mockLLMProvider.sendMessage.mockResolvedValue({
        content: 'I remember you!',
        tokensUsed: 20,
        model: 'gpt-4o-mini',
      })

      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          message: 'Hello again',
          visitorId: 'visitor-456',
        })

      expect(response.status).toBe(200)
      expect(response.body.sessionId).toBe(existingSession.id)
      expect(mockChatRepository.createSession).not.toHaveBeenCalled()
    })

    it('should return 429 when rate limited', async () => {
      mockRateLimiter.consume.mockResolvedValue({
        allowed: false,
        remaining: 0,
        retryAfter: 5,
      })

      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          message: 'Hello',
          visitorId: 'visitor-rate-limited',
        })

      expect(response.status).toBe(429)
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('should return 400 for missing message', async () => {
      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          visitorId: 'visitor-123',
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for missing visitorId', async () => {
      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          message: 'Hello',
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for empty message', async () => {
      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          message: '',
          visitorId: 'visitor-123',
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for message that is too long', async () => {
      const longMessage = 'a'.repeat(2001)

      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          message: longMessage,
          visitorId: 'visitor-123',
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should emit chat events', async () => {
      const mockSession = createChatSession({ id: 'sess_event123' })
      const mockAssistantMessage = {
        id: 'msg_event123',
        sessionId: mockSession.id,
        role: 'assistant',
        content: 'Response',
        tokensUsed: 15,
        model: 'gpt-4o-mini',
        createdAt: new Date().toISOString(),
      }

      mockChatRepository.findActiveSession.mockResolvedValue(null)
      mockChatRepository.createSession.mockResolvedValue(mockSession)
      mockChatRepository.getMessages.mockResolvedValue([])
      mockChatRepository.addMessage.mockResolvedValue(mockAssistantMessage)
      mockLLMProvider.sendMessage.mockResolvedValue({
        content: 'Response',
        tokensUsed: 15,
        model: 'gpt-4o-mini',
      })

      await request(app)
        .post('/api/v1/chat')
        .send({
          message: 'Hello',
          visitorId: 'visitor-event',
        })

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'chat:session_started',
        expect.objectContaining({ sessionId: mockSession.id })
      )
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'chat:message_sent',
        expect.objectContaining({ sessionId: mockSession.id })
      )
    })

    it('should handle LLM tool calls', async () => {
      const mockSession = createChatSession({ id: 'sess_tool123' })
      const mockAssistantMessage = {
        id: 'msg_tool123',
        sessionId: mockSession.id,
        role: 'assistant',
        content: 'Based on the portfolio data, Spencer has 3 projects.',
        tokensUsed: 50,
        model: 'gpt-4o-mini',
        createdAt: new Date().toISOString(),
      }

      mockChatRepository.findActiveSession.mockResolvedValue(null)
      mockChatRepository.createSession.mockResolvedValue(mockSession)
      mockChatRepository.getMessages.mockResolvedValue([])
      mockChatRepository.addMessage.mockResolvedValue(mockAssistantMessage)

      // Mock tool execution response
      mockExecuteToolCall.mockResolvedValue(JSON.stringify({ count: 3, items: [] }))

      // First call returns tool call, second returns final response
      mockLLMProvider.sendMessage
        .mockResolvedValueOnce({
          content: '',
          tokensUsed: 20,
          model: 'gpt-4o-mini',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'list_content',
                arguments: '{"type": "project"}',
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          content: 'Based on the portfolio data, Spencer has 3 projects.',
          tokensUsed: 30,
          model: 'gpt-4o-mini',
        })

      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          message: 'How many projects does Spencer have?',
          visitorId: 'visitor-tool',
        })

      expect(response.status).toBe(200)
      expect(response.body.tokensUsed).toBe(50) // Combined tokens
    })

    it('should return 500 for LLM errors', async () => {
      const mockSession = createChatSession({ id: 'sess_error123' })

      mockChatRepository.findActiveSession.mockResolvedValue(null)
      mockChatRepository.createSession.mockResolvedValue(mockSession)
      mockChatRepository.getMessages.mockResolvedValue([])
      mockChatRepository.addMessage.mockResolvedValue({
        id: 'msg_user',
        sessionId: mockSession.id,
        role: 'user',
        content: 'Hello',
        createdAt: new Date().toISOString(),
      })
      mockLLMProvider.sendMessage.mockRejectedValue(new Error('LLM service unavailable'))

      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          message: 'Hello',
          visitorId: 'visitor-error',
        })

      expect(response.status).toBe(500)
    })

  })

  describe('Content-Type handling', () => {
    it('should require application/json content type', async () => {
      const response = await request(app)
        .post('/api/v1/chat')
        .set('Content-Type', 'text/plain')
        .send('{"message": "Hello", "visitorId": "v1"}')

      // Express should handle this - may return 400 or parse error
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('Request headers', () => {
    it('should include request ID in response', async () => {
      mockRateLimiter.consume.mockResolvedValue({ allowed: false, remaining: 0, retryAfter: 5 })

      const response = await request(app)
        .post('/api/v1/chat')
        .send({ message: 'Hello', visitorId: 'v1' })

      expect(response.headers['x-request-id']).toBeDefined()
    })
  })
})
