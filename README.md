# Portfolio Backend

A TypeScript/Express backend for a portfolio website featuring a flexible CMS, AI-powered chat, and MCP server integration.

## Features

- **Flexible CMS** - Free-form JSON content with versioning and soft delete
- **AI Chat** - Rate-limited chat with PII obfuscation before sending to LLM
- **MCP Server** - Model Context Protocol integration for AI tooling
- **API Key Auth** - Simple admin authentication
- **Optional Redis** - Distributed caching with in-memory fallback

## Architecture Highlights

- **Repository Pattern** - Clean separation between business logic and data access
- **Event-Driven** - Decoupled side effects via typed event emitter
- **Request Context** - AsyncLocalStorage for request-scoped data propagation
- **Distributed Tracing** - OpenTelemetry integration
- **Resilience Patterns** - Circuit breaker for LLM, token bucket rate limiting
- **Content Versioning** - Full audit trail with restore capability

See [docs/architecture/HLD.md](docs/architecture/HLD.md) for system design and [docs/architecture/LLD.md](docs/architecture/LLD.md) for implementation details.

## Tech Stack

| Component | Choice |
|-----------|--------|
| Runtime | Bun |
| Framework | Express |
| Language | TypeScript |
| Database | Turso (libSQL/SQLite) |
| Cache | Redis (optional, memory fallback) |
| ORM | Drizzle |
| Validation | Zod |
| Logging | Pino |
| Tracing | OpenTelemetry |
| Metrics | prom-client |
| Security | Helmet |
| LLM | OpenAI-compatible API |

## Quick Start

```bash
# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Run database migrations
bun run db:migrate

# Start development server
bun run dev
```

## Environment Variables

```bash
# Application
NODE_ENV=development          # development | production | test
PORT=3000

# Database (required)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Cache (optional - falls back to in-memory)
REDIS_URL=redis://localhost:6379

# Security (required)
ADMIN_API_KEY=your-secure-random-key-min-32-chars  # Generate: openssl rand -base64 32

# LLM (required for chat)
LLM_PROVIDER=openai           # openai | custom
LLM_API_KEY=sk-...
LLM_BASE_URL=                 # Optional: for custom endpoints
LLM_MODEL=gpt-4o-mini         # Optional: override default
LLM_MAX_TOKENS=500
LLM_TEMPERATURE=0.7

# Rate Limiting
RATE_LIMIT_CAPACITY=5         # Max burst size
RATE_LIMIT_REFILL_RATE=0.333  # Tokens per second

# CORS (comma-separated origins)
CORS_ORIGINS=https://yourportfolio.com,https://admin.yourportfolio.com

# Observability (optional)
OTEL_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector:4318/v1/traces
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer token
```

## API Overview

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/content` | List published content |
| GET | `/api/v1/content/:type/:slug` | Get single content item |
| GET | `/api/v1/content/bundle` | Get all content in one request |
| POST | `/api/v1/chat` | Send chat message |
| GET | `/api/health` | Health check |
| GET | `/api/metrics` | Prometheus metrics |

### Admin Endpoints

All require `X-Admin-Key` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/content` | List all content (including drafts) |
| POST | `/api/v1/admin/content` | Create content |
| PUT | `/api/v1/admin/content/:id` | Update content |
| DELETE | `/api/v1/admin/content/:id` | Delete content |
| GET | `/api/v1/admin/content/:id/history` | Get version history |
| POST | `/api/v1/admin/content/:id/restore` | Restore to previous version |

See [docs/architecture/api.yaml](docs/architecture/api.yaml) for full OpenAPI specification.

## Documentation

| Document | Purpose |
|----------|---------|
| [HLD.md](docs/architecture/HLD.md) | High-level design, system context, security architecture |
| [LLD.md](docs/architecture/LLD.md) | Component design, database schema, API contracts, testing strategy |
| [api.yaml](docs/architecture/api.yaml) | OpenAPI 3.0 specification |
| [ADRs](docs/architecture/adr/) | Architecture Decision Records (7 decisions) |
| [MCP Server](docs/architecture/mcp-server.md) | Model Context Protocol integration guide |
| [Content Model](docs/architecture/content-model.md) | Content types, schemas, and validation rules |
| [Frontend Integration](docs/architecture/frontend-integration.md) | TypeScript client, patterns, and examples |
| [Runbook](docs/architecture/runbook.md) | Operational procedures and troubleshooting |

## Scripts

```bash
bun run dev          # Start development server with hot reload
bun run build        # Build for production
bun run start        # Start production server
bun run test         # Run tests
bun run lint         # Lint code
bun run db:migrate   # Run database migrations
bun run db:studio    # Open Drizzle Studio
```

## License

MIT
