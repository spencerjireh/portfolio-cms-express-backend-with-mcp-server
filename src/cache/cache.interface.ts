export interface TokenBucket {
  tokens: number
  lastRefill: number
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  delPattern(pattern: string): Promise<number>
  incr(key: string, ttl?: number): Promise<number>
  decr(key: string): Promise<number>
  getTokenBucket(key: string): Promise<TokenBucket | undefined>
  setTokenBucket(key: string, bucket: TokenBucket, ttl?: number): Promise<void>
  ping(): Promise<void>
  close(): Promise<void>
}

export const CacheKeys = {
  CONTENT_LIST: 'content:list',
  CONTENT_BUNDLE: 'content:bundle',
  CONTENT_ITEM: 'content:item',
  IDEMPOTENCY: 'idempotency',
  RATE_LIMIT: 'ratelimit',
  TOKEN_BUCKET: 'tokenbucket',
} as const

export const CacheTTL = {
  CONTENT_LIST: 60,
  CONTENT_BUNDLE: 300,
  CONTENT_ITEM: 300,
  IDEMPOTENCY: 86400,
  RATE_LIMIT: 60,
} as const
