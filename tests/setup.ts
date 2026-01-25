/**
 * Jest global setup file.
 * Runs before all tests.
 */

import { jest, beforeEach, afterEach } from '@jest/globals'
import { setupTestEnv } from './helpers/mock-env'
import { resetIdCounter } from './helpers/test-factories'
import { resetMockCache } from './helpers/mock-cache'
import { resetMockLLM } from './helpers/mock-llm'

// Set up test environment variables before any imports
setupTestEnv()

// Suppress pino logging during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
    trace: jest.fn(),
    fatal: jest.fn(),
  },
  httpLogger: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}))

// Mock the observability metrics to avoid Prometheus registration issues
jest.mock('@/observability/metrics', () => ({
  httpRequestsTotal: { inc: jest.fn() },
  httpRequestDuration: { observe: jest.fn(), startTimer: jest.fn(() => jest.fn()) },
  chatMessagesTotal: { inc: jest.fn() },
  chatTokensTotal: { inc: jest.fn() },
  chatActiveSessionsGauge: { set: jest.fn() },
  llmRequestsTotal: { inc: jest.fn() },
  llmRequestDuration: { observe: jest.fn() },
  circuitBreakerState: { set: jest.fn() },
  rateLimitHitsTotal: { inc: jest.fn() },
  cacheOperationsTotal: { inc: jest.fn() },
  register: {
    metrics: jest.fn().mockResolvedValue(''),
    contentType: 'text/plain',
  },
}))

// Mock the metrics middleware
jest.mock('@/observability/metrics-middleware', () => ({
  metricsMiddleware: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}))

// Global beforeEach hook
beforeEach(() => {
  // Reset ID counter for consistent test IDs
  resetIdCounter()
  // Reset mock cache
  resetMockCache()
  // Reset mock LLM
  resetMockLLM()
  // Clear all mocks
  jest.clearAllMocks()
})

// Global afterEach hook
afterEach(() => {
  // Additional cleanup if needed
})

// Export helpers for use in tests
export { setupTestEnv } from './helpers/mock-env'
export { resetIdCounter } from './helpers/test-factories'
export { resetMockCache, getMockCache, createMockCache } from './helpers/mock-cache'
export { resetMockLLM, getMockLLM, createMockLLM } from './helpers/mock-llm'
