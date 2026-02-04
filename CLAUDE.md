# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Development
bun run dev                    # Start server with hot reload
bun run build                  # Build to dist/
bun run start                  # Run production build

# Code Quality
bun run lint                   # ESLint
bun run format                 # Prettier

# Database (Drizzle + Turso)
bun run db:push                # Push schema to database
bun run db:migrate             # Run migrations
bun run db:studio              # Open Drizzle Studio GUI

# Testing
bun run test                   # All tests (Jest + ESM)
bun run test:unit              # Unit tests only
bun run test:integration       # Integration tests only
bun run test:watch             # Watch mode
bun run test:coverage          # With coverage report

# Run single test file
NODE_OPTIONS='--experimental-vm-modules' jest tests/unit/services/chat.service.test.ts

# Smoke tests (external services)
bun run smoke                  # All services
bun run smoke:redis            # Redis only
bun run smoke:turso            # Turso only
bun run smoke:openai           # OpenAI only

# LLM Evaluation
bun run eval                   # Full evaluation suite
bun run eval:safety            # Single category (relevance, accuracy, safety, pii, tone, refusal)

# MCP Server
bun run mcp                    # Start MCP server (stdio transport)
```

## Architecture Overview

This is a TypeScript/Express portfolio backend with CMS, AI chat, and MCP server capabilities. Uses Bun runtime, Turso (libSQL) database, optional Redis caching, and OpenAI-compatible LLM.

### Layer Structure

```
src/
├── routes/           # HTTP handlers (v1/content, v1/chat, v1/admin/*)
├── services/         # Business logic (ContentService, ChatService)
├── repositories/     # Data access (ContentRepository, ChatRepository)
├── middleware/       # Express middleware chain
├── cache/            # Redis with memory fallback
├── resilience/       # Rate limiter (token bucket), circuit breaker
├── events/           # Typed event emitter with handlers
├── llm/              # LLM provider abstraction
├── tools/            # Shared tool implementations for chat & MCP
├── mcp/              # Model Context Protocol server (standalone)
├── observability/    # Prometheus metrics, OpenTelemetry tracing
├── validation/       # Zod schemas
├── errors/           # AppError hierarchy (ValidationError, NotFoundError, etc.)
└── lib/              # Utilities (logger, id, etag, sanitize, slugify)
```

### Key Patterns

- **Repository Pattern**: All DB access through ContentRepository/ChatRepository
- **Singleton Exports**: `getCache()`, `contentRepository`, `chatRepository`, `eventEmitter`
- **Event-Driven Side Effects**: Mutations emit events; handlers do cache invalidation, audit logging, metrics
- **Request Context**: AsyncLocalStorage provides request ID, user context throughout request lifecycle
- **Typed Events**: EventEmitter with TypeScript generics for type-safe event handling

### Database Schema (Drizzle ORM)

4 tables: `content`, `content_history`, `chat_sessions`, `chat_messages`
- Content uses soft delete (`deletedAt`), versioning, and type+slug unique constraint
- Content history tracks all changes with `changeType` (created/updated/deleted/restored)

### Chat Flow

1. Rate limit check (token bucket per IP)
2. LLM call with tool use (list_content, get_content, search_content)
3. Message persistence

### MCP Server Tools

MCP server (`src/mcp/`) exposes a superset of chat tools:
- Read: list_content, get_content, search_content (shared with chat)
- Write: create_content, update_content, delete_content (MCP only)

### Path Alias

`@/*` maps to `src/*` in both tsconfig.json and Jest config.

## Testing

- Jest with ts-jest ESM preset - requires `NODE_OPTIONS='--experimental-vm-modules'`
- Test helpers in `tests/helpers/`: test-factories, mock-cache, mock-llm, mock-env, test-app
- Coverage thresholds: 80% global, 100% for admin-auth and rate-limiter
- Integration tests use in-memory SQLite via test-db helper

## API Authentication

- Public endpoints: `/api/v1/content`, `/api/v1/chat`, `/api/health`, `/api/metrics`
- Admin endpoints (`/api/v1/admin/*`): Require `X-Admin-Key` header with timing-safe validation
- Idempotency: Admin mutations support `Idempotency-Key` header (24h cache)

## Environment

Required: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_API_KEY` (min 32 chars)
For chat: `LLM_PROVIDER=openai`, `LLM_API_KEY`
Optional: `REDIS_URL` (falls back to in-memory cache)
