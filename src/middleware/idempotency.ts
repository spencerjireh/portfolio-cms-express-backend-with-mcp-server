import { createHash } from 'crypto'
import type { Request, Response, NextFunction, RequestHandler } from 'express'

const IDEMPOTENCY_KEY_HEADER = 'idempotency-key'
const REPLAYED_HEADER = 'X-Idempotent-Replayed'

// TTL: 24 hours in milliseconds
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

// Cleanup interval: 1 hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

interface CachedResponse {
  statusCode: number
  headers: Record<string, string>
  body: unknown
  expiresAt: number
}

// In-memory cache (migrates to Redis in Phase 5)
const idempotencyCache = new Map<string, CachedResponse>()

// Periodic cleanup of expired entries
let cleanupInterval: NodeJS.Timeout | null = null

function startCleanupInterval(): void {
  if (cleanupInterval) return

  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of idempotencyCache.entries()) {
      if (entry.expiresAt < now) {
        idempotencyCache.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)

  // Prevent interval from keeping Node.js alive
  cleanupInterval.unref()
}

/**
 * Generates a cache key from method, path, and idempotency key.
 */
function generateCacheKey(method: string, path: string, idempotencyKey: string): string {
  const input = `${method}:${path}:${idempotencyKey}`
  return createHash('sha256').update(input).digest('hex')
}

/**
 * Clears the idempotency cache. Useful for testing.
 */
export function clearIdempotencyCache(): void {
  idempotencyCache.clear()
}

/**
 * Stops the cleanup interval. Useful for testing.
 */
export function stopCleanupInterval(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

/**
 * Middleware that prevents duplicate mutations via Idempotency-Key header.
 * Only caches successful (2xx) responses.
 * Sets X-Idempotent-Replayed: true on replayed requests.
 */
export function idempotencyMiddleware(): RequestHandler {
  // Start cleanup interval on first use
  startCleanupInterval()

  return (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = req.headers[IDEMPOTENCY_KEY_HEADER]

    // If no idempotency key provided, skip middleware
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return next()
    }

    const cacheKey = generateCacheKey(req.method, req.path, idempotencyKey)
    const cachedResponse = idempotencyCache.get(cacheKey)

    // If we have a cached response that hasn't expired, replay it
    if (cachedResponse && cachedResponse.expiresAt > Date.now()) {
      res.set(REPLAYED_HEADER, 'true')

      // Restore cached headers
      for (const [key, value] of Object.entries(cachedResponse.headers)) {
        res.set(key, value)
      }

      return res.status(cachedResponse.statusCode).json(cachedResponse.body)
    }

    // Store original json method to intercept response
    const originalJson = res.json.bind(res)

    res.json = (body: unknown): Response => {
      // Only cache successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Capture relevant headers (excluding some internal ones)
        const headersToCache: Record<string, string> = {}
        const headerNames = ['content-type', 'etag', 'cache-control']

        for (const name of headerNames) {
          const value = res.get(name)
          if (value) {
            headersToCache[name] = value
          }
        }

        idempotencyCache.set(cacheKey, {
          statusCode: res.statusCode,
          headers: headersToCache,
          body,
          expiresAt: Date.now() + CACHE_TTL_MS,
        })
      }

      return originalJson(body)
    }

    next()
  }
}
