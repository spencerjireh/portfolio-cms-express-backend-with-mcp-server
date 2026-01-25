import { createHash } from 'crypto'
import type { Request } from 'express'

/**
 * Extracts the client IP address from the request.
 * Checks X-Forwarded-For header first (for reverse proxy scenarios),
 * then falls back to req.ip.
 */
export function extractClientIP(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for']

  if (forwardedFor) {
    // X-Forwarded-For can be a comma-separated list; take the first (original client) IP
    const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
    const clientIP = forwarded.split(',')[0]?.trim()
    if (clientIP) {
      return clientIP
    }
  }

  // Fallback to Express's req.ip (may be undefined in some configurations)
  return req.ip ?? '127.0.0.1'
}

/**
 * Hashes an IP address using SHA256.
 * Returns the first 16 characters of the hex hash for privacy.
 */
export function hashIP(ip: string): string {
  const hash = createHash('sha256').update(ip).digest('hex')
  return hash.substring(0, 16)
}
