import { sql } from 'drizzle-orm'
import { createApp } from '@/app'
import { env } from '@/config/env'
import { logger } from '@/lib/logger'
import { db, client } from '@/db/client'
import { createCache, closeCache } from '@/cache'
import { registerCacheHandlers } from '@/events/handlers/cache.handlers'
import { registerAuditHandlers } from '@/events/handlers/audit.handlers'
import { registerMetricsHandlers } from '@/events/handlers/metrics.handlers'
import { initializeMetrics, initializeTracing } from '@/observability'

async function start() {
  // Initialize metrics and tracing
  initializeMetrics()
  await initializeTracing()

  // Verify database connection
  try {
    await db.run(sql`SELECT 1`)
    logger.info('Database connection verified')
  } catch (error) {
    logger.fatal({ error }, 'Failed to connect to database')
    process.exit(1)
  }

  // Initialize cache
  await createCache()

  // Register event handlers
  registerCacheHandlers()
  registerAuditHandlers()
  registerMetricsHandlers()

  const app = createApp()

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started')
  })

  async function shutdown(signal: string) {
    logger.info({ signal }, 'Shutdown signal received')
    let isCleanedUp = false

    server.close(async () => {
      if (isCleanedUp) return
      isCleanedUp = true
      logger.info('Server closed')
      await closeCache()
      client.close()
      logger.info('Database connection closed')
      process.exit(0)
    })

    setTimeout(async () => {
      if (isCleanedUp) return
      isCleanedUp = true
      logger.error('Forced shutdown after timeout')
      await closeCache()
      client.close()
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection')
  })

  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception')
    client.close()
    process.exit(1)
  })
}

start()
