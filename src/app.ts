import express from 'express'
import compression from 'compression'
import { requestIdMiddleware } from './middleware/request-id'
import { requestContextMiddleware } from './middleware/request-context'
import { securityMiddleware } from './middleware/security'
import { corsMiddleware } from './middleware/cors'
import { httpLogger } from './lib/logger'
import { errorHandler } from './middleware/error-handler'
import { NotFoundError } from './errors/app-error'

export function createApp() {
  const app = express()

  app.use(requestIdMiddleware())
  app.use(requestContextMiddleware())
  app.use(securityMiddleware())
  app.use(corsMiddleware())
  app.use(compression())
  app.use(express.json({ limit: '100kb' }))
  app.use(httpLogger)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.get('/', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use((_req, _res, next) => {
    next(new NotFoundError('Route'))
  })

  app.use(errorHandler)

  return app
}
