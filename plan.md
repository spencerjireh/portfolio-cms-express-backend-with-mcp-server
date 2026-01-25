# Portfolio Backend Implementation Plan

## Overview

This plan outlines 9 sequential implementation phases for building the TypeScript/Express portfolio backend based on the existing architecture documentation.

---

## Phase 1: Project Foundation and Core Infrastructure [DONE]

**Status**: Completed

**Goal**: Establish the project skeleton with TypeScript, Express, and essential cross-cutting concerns.

### Components to Implement

1. **Project Setup**
   - TypeScript configuration (tsconfig.json)
   - ESLint and Prettier configuration
   - Package.json with scripts (dev, build, start, test, lint)
   - Environment file template (.env.example)

2. **Environment Configuration**
   - Zod-validated environment schema
   - Config module exporting typed configuration

3. **Express Application Bootstrap**
   - Express app factory function
   - Middleware stack: Helmet, CORS, JSON parsing, compression
   - Request ID middleware (X-Request-Id)
   - Request context using AsyncLocalStorage

4. **Error Handling Foundation**
   - AppError base class and subclasses (ValidationError, NotFoundError, UnauthorizedError, RateLimitError, ConflictError, LLMError)
   - Global error handler middleware

5. **Logging Infrastructure**
   - Pino logger with structured JSON output
   - Request/response logging middleware

### Key Files

```
src/
  index.ts, app.ts
  config/env.ts
  errors/app-error.ts, error-handler.ts
  middleware/request-context.ts, request-id.ts, cors.ts, security.ts
  lib/logger.ts
```

### Definition of Done

- `npm run dev` starts server
- Error handling returns proper JSON format
- Request logging with requestId
- ESLint and Prettier pass

---

## Phase 2: Database Layer and Repository Pattern [DONE]

**Status**: Completed

**Goal**: Establish database connectivity with Turso/Drizzle and implement the repository pattern.

### Components to Implement

1. **Database Connection** - Turso/libSQL client, Drizzle ORM initialization
2. **Database Schema**
   - `content` table: id, type, slug, data (JSON), status, version, sortOrder, timestamps
   - `content_history` table: id, contentId, version, data, changeType, changedBy, changeSummary
   - `chat_sessions` table: id, visitorId, ipHash, userAgent, messageCount, status, timestamps
   - `chat_messages` table: id, sessionId, role, content, tokensUsed, model
3. **Repository Interfaces & Implementations**
   - ContentRepository with versioning support
   - ChatRepository with session/message methods
4. **Migrations** - Drizzle migration setup

### Key Files

```
src/
  db/client.ts, schema.ts
  repositories/content.repository.ts, chat.repository.ts
  lib/id.ts
drizzle/migrations/
```

### Definition of Done

- `npm run db:migrate` creates tables
- ContentRepository CRUD with versioning works
- ChatRepository manages sessions and messages
- Tests pass with in-memory SQLite

---

## Phase 3: Content CMS Service and Public API [DONE]

**Status**: Completed

**Goal**: Implement the content service layer and public-facing content API routes.

### Components to Implement

1. **Content Validation Schemas** (Zod)
   - ProjectDataSchema, PageDataSchema
   - ListDataSchema (skills, experience, education)
   - ConfigDataSchema (site config)
2. **Content Service**
   - getAll, getBySlug, getBundle, create, update, delete
   - getHistory, restoreVersion
3. **Public Content Routes**
   - `GET /api/v1/content` - list published
   - `GET /api/v1/content/:type/:slug` - single item
   - `GET /api/v1/content/bundle` - all content for frontend
4. **Health Routes** - /api/health/live, /ready, /startup

### Key Files

```
src/
  services/content.service.ts
  validation/content.schemas.ts
  routes/v1/content.ts, health.ts
  lib/sanitize.ts, etag.ts
```

### Definition of Done

- Public content endpoints work without authentication
- Bundle endpoint returns organized content
- Health endpoints report status
- ETag support with 304 responses

---

## Phase 4: Admin Authentication and Content Management API [DONE]

**Status**: Completed

**Goal**: Implement admin authentication and full CRUD operations.

### Components to Implement

1. **Admin Authentication Middleware** - X-Admin-Key validation with timing-safe comparison
2. **Idempotency Middleware** - Duplicate request prevention with in-memory cache (24h TTL)
3. **Slug Generation** - Auto-generate from title with uniqueness handling
4. **Admin Validation Schemas** - Zod schemas for all admin operations
5. **Admin Content Routes**
   - `GET /api/v1/admin/content` - list all (with filtering)
   - `POST /api/v1/admin/content` - create (with idempotency)
   - `GET /api/v1/admin/content/:id` - get by ID
   - `PUT /api/v1/admin/content/:id` - update (with idempotency)
   - `DELETE /api/v1/admin/content/:id` - soft/hard delete
   - `GET /api/v1/admin/content/:id/history` - version history
   - `POST /api/v1/admin/content/:id/restore` - restore version (with idempotency)

### Key Files

```
src/
  middleware/admin-auth.ts, idempotency.ts
  routes/v1/admin/content.ts
  lib/slugify.ts
  validation/content.schemas.ts (updated)
  services/content.service.ts (updated)
  repositories/content.repository.ts (updated)
```

### Definition of Done

- Admin routes require valid X-Admin-Key
- Version history tracks all changes
- Restore creates new version with old data
- Idempotency prevents duplicate mutations

---

## Phase 5: Caching Infrastructure and Event System [DONE]

**Status**: Completed

**Goal**: Implement caching layer with Redis/memory fallback and typed event system.

### Components to Implement

1. **Cache Provider Interface** - get, set, del, incr, token bucket ops
2. **Memory Cache Implementation** - In-memory LRU with TTL
3. **Redis Cache Implementation** - ioredis with TLS support for cloud providers
4. **Cache Factory** - Redis with memory fallback
5. **Event System**
   - TypedEventEmitter with EventMap
   - Events: content:created/updated/deleted/restored, chat events, circuit events, cache events, admin events
6. **Event Handlers** - Cache invalidation, audit logging
7. **Idempotency Migration** - Migrated from in-memory Map to cache provider

### Key Files

```
src/
  cache/cache.interface.ts, memory-cache.ts, redis-cache.ts, cache-factory.ts, index.ts
  events/event-map.ts, event-emitter.ts, index.ts
  events/handlers/cache-handler.ts, audit-handler.ts
  middleware/idempotency.ts (updated)
  services/content.service.ts (updated)
  index.ts (updated)
```

### Definition of Done

- Cache works with both providers
- Factory falls back to memory when Redis unavailable
- Events fire on content mutations
- Cache invalidation on content changes

---

## Phase 6: AI Chat System with Rate Limiting and PII Obfuscation [DONE]

**Status**: Completed

**Goal**: Implement chat service with LLM integration, rate limiting, PII protection, and circuit breaker.

### Components to Implement

1. **Rate Limiter** - Token bucket algorithm, cache-backed state
2. **PII Obfuscation Service** - Pattern detection, token replacement, deobfuscation
3. **LLM Provider Abstraction** - LLMProvider interface, OpenAI implementation
4. **Circuit Breaker** - Three states (closed/open/half-open), configurable thresholds
5. **Chat Service** - Full flow: rate limit, obfuscate, LLM call, deobfuscate, persist
6. **Chat Routes**
   - `POST /api/v1/chat` - send message
   - Admin routes for session management

### Key Files

```
src/
  services/chat.service.ts, obfuscation.service.ts
  llm/llm.interface.ts, openai.provider.ts
  resilience/rate-limiter.ts, circuit-breaker.ts
  routes/v1/chat.ts, admin/chat.ts
```

### Definition of Done

- Chat endpoint returns AI responses
- Rate limiting enforced per IP (429 when exceeded)
- PII never reaches LLM
- Circuit breaker opens after failures (502 when open)
- Sessions and messages persisted

---

## Phase 7: Observability - Metrics and Tracing [DONE]

**Status**: Completed

**Goal**: Add Prometheus metrics endpoint and OpenTelemetry tracing.

### Components to Implement

1. **Prometheus Metrics** (prom-client)
   - HTTP: http_requests_total, http_request_duration_seconds
   - Chat: chat_messages_total, chat_tokens_total
   - LLM: llm_requests_total, llm_request_duration_seconds
   - Circuit breaker state, rate limit hits, cache hit/miss
2. **Metrics Middleware** - Request duration, count by method/path/status
3. **Metrics Endpoint** - `GET /api/metrics`
4. **OpenTelemetry Integration** - OTEL SDK, auto-instrumentation, trace ID in logs

### Key Files

```
src/
  observability/metrics.ts, metrics-middleware.ts, tracing.ts
  routes/metrics.ts
```

### Definition of Done

- /api/metrics returns Prometheus format
- All metrics update correctly
- Trace IDs correlate logs with spans

---

## Phase 8: MCP Server Integration [DONE]

**Status**: Completed

**Goal**: Implement Model Context Protocol server for AI tool integration with generic content operations.

### Components to Implement

1. **MCP Server Setup** - MCP SDK, stdio/SSE transport
2. **MCP Generic Tools** (6 tools)
   - `list_content` - List content by type with status filter
   - `get_content` - Get single content by type and slug
   - `search_content` - Search across content by query
   - `create_content` - Create new content with validation
   - `update_content` - Update content with version history
   - `delete_content` - Soft delete content
3. **MCP Generic Resources**
   - `portfolio://content` - All published content
   - `portfolio://content/{type}` - Content by type (project, experience, education, skill, about, contact)
   - `portfolio://content/{type}/{slug}` - Single content item
4. **MCP Prompts** (specialized by design)
   - summarize_portfolio, explain_project, compare_skills
5. **SSE Transport Route** (optional) - `GET /mcp/sse`

### Key Files

```
src/
  mcp/server.ts
  mcp/types.ts
  mcp/tools/index.ts
  mcp/tools/list-content.ts
  mcp/tools/get-content.ts
  mcp/tools/search-content.ts
  mcp/tools/create-content.ts
  mcp/tools/update-content.ts
  mcp/tools/delete-content.ts
  mcp/resources/index.ts
  mcp/resources/content.ts
  mcp/prompts/*.ts
```

### Definition of Done

- MCP server runs standalone (stdio)
- All generic tools work with any content type
- Resources resolve portfolio content dynamically
- Claude Desktop config documented

---

## Implementation Order

```
Phase 1: Foundation
    |
    v
Phase 2: Database & Repositories
    |
    v
Phase 3: Content Service & Public API
    |
    +------------------+
    |                  |
    v                  v
Phase 4: Admin API    Phase 5: Cache & Events
    |                  |
    +--------+---------+
             |
             v
      Phase 6: Chat System
             |
             v
      Phase 7: Observability
             |
             v
      Phase 8: MCP Server
             |
             v
      Phase 9: Test Suite
```

---

## Critical Reference Files

| Document | Purpose |
|----------|---------|
| `docs/architecture/LLD.md` | Component design, class diagrams, database schema, sequence diagrams |
| `docs/architecture/api.yaml` | OpenAPI 3.0 specification for all endpoints |
| `docs/architecture/content-model.md` | Content type schemas, Zod validation rules |
| `docs/architecture/mcp-server.md` | MCP tools, resources, prompts specifications |
| `docs/architecture/adr/` | Architecture Decision Records (7 decisions) |

---

## Testing Strategy

**Framework**: Jest with ts-jest for TypeScript support

### Test Categories
| Category | Directory | Tools |
|----------|-----------|-------|
| Unit | `tests/unit/` | Jest, mocks |
| Integration | `tests/integration/` | Supertest, in-memory SQLite |
| E2E | `tests/e2e/` | Supertest, test containers |

### Coverage Targets
- Line Coverage: 80%
- Branch Coverage: 75%
- Critical Paths (auth, rate limiting, mutations): 100%

---

## Caching Strategy

**Primary**: Redis (ioredis)
**Fallback**: In-memory LRU cache

Redis will be configured from Phase 5, with automatic fallback to memory cache when Redis is unavailable. This ensures the application remains functional during Redis outages.

---

## Verification

After each phase:
1. Run `npm run lint` - no errors
2. Run `npm run test` - all tests pass
3. Run `npm run build` - compiles successfully
4. Manual API testing with curl/httpie
5. Check logs for structured output

Final verification:
- Full API test suite with Supertest
- Load test for rate limiting verification
- MCP server test with Claude Desktop (if available)

---

## Phase 9: Test Suite [DONE]

**Status**: Completed

**Goal**: Implement comprehensive unit and integration tests using Jest with ts-jest, targeting 80% line coverage and 75% branch coverage, with 100% coverage on critical paths.

### Components to Implement

1. **Test Infrastructure Setup**
   - Jest configuration (`jest.config.ts`)
   - TypeScript test config (`tsconfig.test.json`)
   - Package.json test scripts: `test`, `test:watch`, `test:coverage`, `test:unit`, `test:integration`
   - Install dependencies: jest, ts-jest, @types/jest, supertest, @types/supertest

2. **Test Helpers**
   - `tests/helpers/test-db.ts` - In-memory SQLite setup with libsql
   - `tests/helpers/test-factories.ts` - Data factories for content, sessions, messages
   - `tests/helpers/mock-cache.ts` - Mock CacheProvider implementation
   - `tests/helpers/mock-llm.ts` - Mock LLMProvider implementation
   - `tests/helpers/test-app.ts` - Express app factory for integration tests
   - `tests/helpers/mock-env.ts` - Test environment variables
   - `tests/setup.ts` - Global Jest setup

3. **Unit Tests** (`tests/unit/`)
   - Services: content.service, chat.service, obfuscation.service
   - Repositories: content.repository, chat.repository
   - Middleware: admin-auth (100%), idempotency, error-handler, request-id, security, cors
   - Resilience: rate-limiter (100%), circuit-breaker
   - Cache: memory-cache, cache-factory
   - LLM: openai.provider
   - Utilities: id, sanitize, ip, etag, slugify
   - Validation: content.schemas, chat.schemas
   - Errors: app-error

4. **Integration Tests** (`tests/integration/`)
   - Routes: health, content.public, content.admin, chat, metrics
   - Flows: content-lifecycle, chat-conversation, auth-flows

### Key Files

```
jest.config.ts
tsconfig.test.json
tests/
  setup.ts
  helpers/
    test-db.ts, test-factories.ts, mock-cache.ts, mock-llm.ts, test-app.ts, mock-env.ts
  unit/
    services/content.service.test.ts, chat.service.test.ts, obfuscation.service.test.ts
    repositories/content.repository.test.ts, chat.repository.test.ts
    middleware/admin-auth.test.ts, idempotency.test.ts, error-handler.test.ts, ...
    resilience/rate-limiter.test.ts, circuit-breaker.test.ts
    cache/memory-cache.test.ts, cache-factory.test.ts
    lib/id.test.ts, sanitize.test.ts, ip.test.ts, etag.test.ts, slugify.test.ts
    validation/content.schemas.test.ts, chat.schemas.test.ts
    errors/app-error.test.ts
  integration/
    routes/health.test.ts, content.public.test.ts, content.admin.test.ts, chat.test.ts
    flows/content-lifecycle.test.ts, chat-conversation.test.ts
```

### Implementation Priority

1. **Phase 9.1: Foundation** - Jest config, helpers, test-db, factories, mocks
2. **Phase 9.2: Critical Path Tests (100% coverage)**
   - admin-auth.test.ts
   - rate-limiter.test.ts
   - content.service.test.ts (mutations)
3. **Phase 9.3: Core Services** - chat.service, obfuscation.service, repositories
4. **Phase 9.4: Middleware & Utilities** - All middleware and lib functions
5. **Phase 9.5: Integration Tests** - Route tests and flow tests
6. **Phase 9.6: Coverage Gap Analysis** - Fill gaps to reach targets

### Coverage Targets

| Scope | Line | Branch |
|-------|------|--------|
| Global | 80% | 75% |
| admin-auth.ts | 100% | 100% |
| rate-limiter.ts | 100% | 100% |
| content.service.ts (mutations) | 100% | 90% |

### Definition of Done

- `npm run test` passes all tests
- `npm run test:coverage` meets thresholds (80% line, 75% branch)
- Critical paths have 100% coverage
- No tests depend on external services (all mocked)
- Tests run in isolation (parallel execution works)

### Achieved Results

**Total Tests**: 374 passing

**Coverage Results** (all targets exceeded):

| Metric | Target | Achieved |
|--------|--------|----------|
| Statements | 80% | 90.74% |
| Branches | 75% | 78.40% |
| Functions | 80% | 82.05% |
| Lines | 80% | 91.48% |

**Critical Path Coverage** (100% achieved):

| File | Lines | Branches |
|------|-------|----------|
| admin-auth.ts | 100% | 100% |
| rate-limiter.ts | 100% | 100% |
| obfuscation.service.ts | 100% | 100% |
