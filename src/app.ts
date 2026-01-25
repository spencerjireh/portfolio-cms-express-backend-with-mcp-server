import express from 'express'
import compression from 'compression'
import { requestIdMiddleware } from './middleware/request-id'
import { requestContextMiddleware } from './middleware/request-context'
import { securityMiddleware } from './middleware/security'
import { corsMiddleware } from './middleware/cors'
import { httpLogger } from './lib/logger'
import { errorHandler } from './middleware/error-handler'
import { NotFoundError } from './errors/app-error'
import { healthRouter } from './routes/health'
import { contentRouter } from './routes/v1/content'
import { chatRouter } from './routes/v1/chat'
import { adminContentRouter } from './routes/v1/admin/content'
import { adminChatRouter } from './routes/v1/admin/chat'

export function createApp() {
  const app = express()

  app.use(requestIdMiddleware())
  app.use(requestContextMiddleware())
  app.use(securityMiddleware())
  app.use(corsMiddleware())
  app.use(compression())
  app.use(express.json({ limit: '100kb' }))
  app.use(httpLogger)

  app.get('/', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // Health check routes
  app.use('/api/health', healthRouter)

  // Public API routes
  app.use('/api/v1/content', contentRouter)
  app.use('/api/v1/chat', chatRouter)

  // Admin API routes
  app.use('/api/v1/admin/content', adminContentRouter)
  app.use('/api/v1/admin/chat', adminChatRouter)

  // 404 handler
  app.use((_req, _res, next) => {
    next(new NotFoundError('Route'))
  })

  app.use(errorHandler)

  return app
}
