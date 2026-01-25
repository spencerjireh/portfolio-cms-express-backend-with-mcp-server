import { sql } from 'drizzle-orm'
import { createApp } from './app'
import { env } from './config/env'
import { logger } from './lib/logger'
import { db, client } from './db/client'

async function start() {
  // Verify database connection
  try {
    await db.run(sql`SELECT 1`)
    logger.info('Database connection verified')
  } catch (error) {
    logger.fatal({ error }, 'Failed to connect to database')
    process.exit(1)
  }

  const app = createApp()

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started')
  })

  function shutdown(signal: string) {
    logger.info({ signal }, 'Shutdown signal received')
    server.close(() => {
      logger.info('Server closed')
      client.close()
      logger.info('Database connection closed')
      process.exit(0)
    })

    setTimeout(() => {
      logger.error('Forced shutdown after timeout')
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
