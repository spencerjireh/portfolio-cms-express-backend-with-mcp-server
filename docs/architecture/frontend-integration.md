# Frontend Integration Guide

This guide covers how to integrate a frontend application with the Portfolio Backend API.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [TypeScript Client](#typescript-client)
3. [Content Loading Patterns](#content-loading-patterns)
4. [Chat Integration](#chat-integration)
5. [Error Handling](#error-handling)
6. [Caching Strategies](#caching-strategies)
7. [Real-Time Updates](#real-time-updates)

---

## Quick Start

### Fetch All Content (Bundle)

The fastest way to load all portfolio content:

```typescript
const response = await fetch('https://api.yoursite.com/api/v1/content/bundle')
const bundle = await response.json()

// bundle contains:
// {
//   projects: [...],
//   pages: [...],
//   skills: [...],
//   experience: [...],
//   config: {...}
// }
```

---

## TypeScript Client

A type-safe client wrapper for the Portfolio API.

### Types

```typescript
// types/api.ts

export interface ContentItem {
  id: string
  type: 'project' | 'page' | 'list' | 'config'
  slug: string | null
  data: Record<string, unknown>
  status: 'draft' | 'published'
  version: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Project extends ContentItem {
  type: 'project'
  data: {
    title: string
    description: string
    content?: string
    tags: string[]
    links?: {
      github?: string
      live?: string
      demo?: string
    }
    coverImage?: string
    featured: boolean
  }
}

export interface Page extends ContentItem {
  type: 'page'
  data: {
    title: string
    content: string
    image?: string
  }
}

export interface Skill {
  name: string
  category: 'language' | 'framework' | 'tool' | 'soft'
  icon?: string
  proficiency?: 1 | 2 | 3 | 4 | 5
}

export interface Experience {
  company: string
  role: string
  description?: string
  startDate: string
  endDate: string | null
  location?: string
  type?: 'full-time' | 'part-time' | 'contract' | 'freelance'
  skills: string[]
}

export interface SiteConfig {
  name: string
  title: string
  email: string
  social: Record<string, string>
  chatEnabled: boolean
}

export interface ContentBundle {
  projects: Project[]
  pages: Page[]
  skills: Skill[]
  experience: Experience[]
  config: SiteConfig
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  sessionId: string
  message: ChatMessage
  rateLimit: {
    remaining: number
    resetAt: string
  }
}

export interface ApiError {
  error: string
  code: string
  requestId: string
  fields?: Record<string, string[]>
  retryAfter?: number
}
```

### Client Usage

A full TypeScript client wrapping these endpoints should be implemented in your frontend repository. Key features to include:

- Custom error class extending `Error` with `code`, `status`, `requestId`, `retryAfter`
- ETag support for bundle caching (304 handling)
- Admin key header injection for protected endpoints
- Idempotency key support for mutations

**Basic usage example:**

```typescript
// Fetch all content
const response = await fetch('/api/v1/content/bundle')
const bundle: ContentBundle = await response.json()

// Send chat message with error handling
try {
  const res = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello!', sessionId }),
  })

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After')
    console.log(`Rate limited. Retry after ${retryAfter}s`)
    return
  }

  const data: ChatResponse = await res.json()
  console.log('Response:', data.message.content)
} catch (error) {
  console.error('Chat error:', error)
}
```

---

## Content Loading Patterns

### Pattern 1: Load Everything on App Init (Recommended)

Best for small portfolios (< 100 content items).

```typescript
// app/layout.tsx (Next.js App Router)
import { portfolioApi } from '@/lib/api-client'

export default async function RootLayout({ children }) {
  const bundle = await portfolioApi.getBundle()

  return (
    <html>
      <body>
        <PortfolioProvider initialData={bundle}>
          {children}
        </PortfolioProvider>
      </body>
    </html>
  )
}

// Context provider
const PortfolioContext = createContext<ContentBundle | null>(null)

export function PortfolioProvider({
  initialData,
  children,
}: {
  initialData: ContentBundle
  children: React.ReactNode
}) {
  return (
    <PortfolioContext.Provider value={initialData}>
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio() {
  const context = useContext(PortfolioContext)
  if (!context) throw new Error('usePortfolio must be within PortfolioProvider')
  return context
}

// Usage in components
function ProjectList() {
  const { projects } = usePortfolio()
  return projects.map(p => <ProjectCard key={p.id} project={p} />)
}
```

### Pattern 2: Load on Demand

For larger portfolios or when you need fresh data.

```typescript
// Using React Query / TanStack Query
import { useQuery } from '@tanstack/react-query'
import { portfolioApi } from '@/lib/api-client'

function ProjectPage({ slug }: { slug: string }) {
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', slug],
    queryFn: () => portfolioApi.getProject(slug),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (isLoading) return <ProjectSkeleton />
  if (error) return <ErrorMessage error={error} />
  return <ProjectDetail project={project} />
}
```

### Pattern 3: Static Generation with Revalidation

For Next.js static export with ISR.

```typescript
// app/projects/[slug]/page.tsx
import { portfolioApi } from '@/lib/api-client'

export async function generateStaticParams() {
  const bundle = await portfolioApi.getBundle()
  return bundle.projects.map(p => ({ slug: p.slug }))
}

export const revalidate = 300 // Revalidate every 5 minutes

export default async function ProjectPage({
  params,
}: {
  params: { slug: string }
}) {
  const project = await portfolioApi.getProject(params.slug)
  return <ProjectDetail project={project} />
}
```

---

## Chat Integration

### Key Patterns

When building a chat component, handle these concerns:

| Concern | Implementation |
|---------|----------------|
| **Session management** | Store `sessionId` from first response, send with subsequent messages |
| **Rate limit display** | Show `rateLimit.remaining` from response |
| **Error handling** | Check for `RATE_LIMITED` code, display `retryAfter` to user |
| **Loading state** | Disable input during API call |
| **Optimistic UI** | Add user message to list immediately before API response |

**State to track:**
- `messages: ChatMessage[]` - conversation history
- `sessionId: string | undefined` - persists across messages
- `isLoading: boolean` - disable input during request
- `rateLimit: number | null` - from response, display to user

---

## Error Handling

### Error Boundary for API Errors

```typescript
// components/ApiErrorBoundary.tsx
import { PortfolioApiError } from '@/lib/api-client'

export function ApiErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  if (error instanceof PortfolioApiError) {
    return (
      <div className="error-container">
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <p className="error-code">Error code: {error.code}</p>
        <p className="request-id">Request ID: {error.requestId}</p>
        <button onClick={resetErrorBoundary}>Try again</button>
      </div>
    )
  }

  return (
    <div className="error-container">
      <h2>Unexpected error</h2>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}
```

### Handling Specific Error Codes

```typescript
import { PortfolioApiError } from '@/lib/api-client'

async function handleApiCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    if (!(error instanceof PortfolioApiError)) throw error

    switch (error.code) {
      case 'NOT_FOUND':
        // Redirect to 404 or show not found state
        return null

      case 'RATE_LIMITED':
        // Show rate limit UI
        toast.error(`Please wait ${error.retryAfter}s before trying again`)
        return null

      case 'VALIDATION_ERROR':
        // Show field-specific errors
        if (error.fields) {
          Object.entries(error.fields).forEach(([field, messages]) => {
            toast.error(`${field}: ${messages.join(', ')}`)
          })
        }
        return null

      default:
        throw error
    }
  }
}
```

---

## Caching Strategies

### Browser Cache with ETag

```typescript
class CachedPortfolioClient extends PortfolioClient {
  private bundleEtag: string | null = null
  private bundleCache: ContentBundle | null = null

  async getBundle(): Promise<ContentBundle> {
    const result = await super.getBundle({
      etag: this.bundleEtag ?? undefined,
    })

    if (result === null && this.bundleCache) {
      // 304 Not Modified, return cached version
      return this.bundleCache
    }

    // Store for next request
    this.bundleCache = result
    // Note: Would need to extract ETag from response headers
    return result!
  }
}
```

### Service Worker Caching

```typescript
// sw.js
const CACHE_NAME = 'portfolio-api-v1'
const API_URL = 'https://api.yoursite.com'

self.addEventListener('fetch', event => {
  if (event.request.url.startsWith(`${API_URL}/api/v1/content`)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone)
            })
          }
          return response
        })

        // Return cached response immediately, update in background
        return cached || fetchPromise
      })
    )
  }
})
```

---

## Real-Time Updates

The API currently does not support real-time updates (WebSocket/SSE). Here are polling strategies for near-real-time behavior.

### Polling with Visibility API

Only poll when tab is visible:

```typescript
function usePolledBundle(intervalMs = 60000) {
  const [bundle, setBundle] = useState<ContentBundle | null>(null)
  const [etag, setEtag] = useState<string | null>(null)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    async function poll() {
      if (document.visibilityState !== 'visible') {
        timeoutId = setTimeout(poll, intervalMs)
        return
      }

      try {
        const response = await fetch('/api/v1/content/bundle', {
          headers: etag ? { 'If-None-Match': etag } : {},
        })

        if (response.status === 200) {
          const newBundle = await response.json()
          const newEtag = response.headers.get('ETag')
          setBundle(newBundle)
          if (newEtag) setEtag(newEtag)
        }
        // 304 = no change, keep current bundle
      } catch (error) {
        console.error('Poll failed:', error)
      }

      timeoutId = setTimeout(poll, intervalMs)
    }

    poll()

    return () => clearTimeout(timeoutId)
  }, [etag, intervalMs])

  return bundle
}
```

### SWR / React Query Background Refresh

```typescript
import useSWR from 'swr'

function useBundle() {
  return useSWR(
    'content-bundle',
    () => portfolioApi.getBundle(),
    {
      refreshInterval: 60000,           // Poll every minute
      revalidateOnFocus: true,          // Refresh when tab regains focus
      revalidateOnReconnect: true,      // Refresh on network reconnect
      dedupingInterval: 5000,           // Dedupe requests within 5s
    }
  )
}
```

### Future: Server-Sent Events

When/if implemented on the backend:

```typescript
function useContentUpdates() {
  useEffect(() => {
    const eventSource = new EventSource('/api/v1/events')

    eventSource.addEventListener('content:updated', (event) => {
      const data = JSON.parse(event.data)
      // Invalidate cache or refetch specific content
      queryClient.invalidateQueries(['content', data.id])
    })

    return () => eventSource.close()
  }, [])
}
```

---

## Environment Variables

```bash
# .env.local (Next.js)
NEXT_PUBLIC_API_URL=https://api.yoursite.com

# For admin operations (server-side only, never expose to client)
API_ADMIN_KEY=your-admin-key
```
