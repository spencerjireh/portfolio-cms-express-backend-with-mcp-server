import express, { type Express } from 'express'
import { errorHandler } from '@/middleware/error-handler'
import { requestIdMiddleware } from '@/middleware/request-id'
import { requestContextMiddleware } from '@/middleware/request-context'
import { NotFoundError } from '@/errors/app-error'

/**
 * Creates a minimal Express app for testing.
 * Does not include all production middleware.
 */
export function createTestApp(): Express {
  const app = express()

  app.use(requestIdMiddleware())
  app.use(requestContextMiddleware())
  app.use(express.json({ limit: '100kb' }))

  return app
}

/**
 * Creates a test app with error handling configured.
 * Useful for testing error scenarios.
 */
export function createTestAppWithErrorHandler(): Express {
  const app = createTestApp()

  // 404 handler
  app.use((_req, _res, next) => {
    next(new NotFoundError('Route'))
  })

  app.use(errorHandler)

  return app
}

/**
 * Adds error handling to an existing app.
 */
export function addErrorHandler(app: Express): Express {
  // 404 handler
  app.use((_req, _res, next) => {
    next(new NotFoundError('Route'))
  })

  app.use(errorHandler)

  return app
}
