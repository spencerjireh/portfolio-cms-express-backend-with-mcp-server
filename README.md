<p align="center">
  <img src="docs-site/public/logo.png" alt="Portfolio CMS Backend" width="140" height="140">
</p>

<h1 align="center">Portfolio CMS Backend</h1>

<p align="center">
  <strong>AI & MCP enhanced portfolio content management system</strong>
</p>

<p align="center">
  <a href="https://spencerjirehcebrian.github.io/portfolio-cms-express-backend-with-mcp-server/">Documentation</a> &bull;
  <a href="https://spencerjirehcebrian.github.io/portfolio-cms-express-backend-with-mcp-server/api/">API Reference</a> &bull;
  <a href="https://spencerjirehcebrian.github.io/portfolio-cms-express-backend-with-mcp-server/guide/quick-start.html">Quick Start</a>
</p>

---

## Overview

A TypeScript/Express backend for portfolio websites featuring a flexible CMS, AI-powered chat with tool use, and Model Context Protocol (MCP) server integration.

### Key Features

- **Flexible CMS** - Free-form JSON content with versioning, soft delete, and full audit trail
- **AI Chat** - Rate-limited chat with PII obfuscation and tool use for content queries
- **MCP Server** - Expose content tools to AI assistants via Model Context Protocol
- **Resilient** - Circuit breaker for LLM, token bucket rate limiting, graceful degradation
- **Observable** - OpenTelemetry tracing, Prometheus metrics, structured logging

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Framework | Express + TypeScript |
| Database | Turso (libSQL/SQLite) |
| ORM | Drizzle |
| Cache | Redis (optional, memory fallback) |
| Validation | Zod |
| LLM | OpenAI-compatible API |
| Tracing | OpenTelemetry |
| Metrics | Prometheus |

## Quick Start

```bash
# Install
bun install

# Configure
cp .env.example .env
# Edit .env with your Turso and API keys

# Database
bun run db:migrate

# Run
bun run dev
```

See the [Configuration Guide](https://spencerjirehcebrian.github.io/portfolio-cms-express-backend-with-mcp-server/guide/configuration.html) for environment variables.

## API

### Public

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/content` | List published content |
| `GET /api/v1/content/:type/:slug` | Get content item |
| `GET /api/v1/content/bundle` | Get all content |
| `POST /api/v1/chat` | Chat with AI |
| `GET /api/health` | Health check |
| `GET /api/metrics` | Prometheus metrics |

### Admin

Requires `X-Admin-Key` header.

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/admin/content` | Create content |
| `PUT /api/v1/admin/content/:id` | Update content |
| `DELETE /api/v1/admin/content/:id` | Soft delete |
| `GET /api/v1/admin/content/:id/history` | Version history |
| `POST /api/v1/admin/content/:id/restore` | Restore version |

Full specification: [API Reference](https://spencerjirehcebrian.github.io/portfolio-cms-express-backend-with-mcp-server/api/reference.html)

## Architecture

```
src/
├── routes/        # HTTP handlers
├── services/      # Business logic
├── repositories/  # Data access
├── middleware/    # Express middleware
├── cache/         # Redis with memory fallback
├── resilience/    # Rate limiter, circuit breaker
├── events/        # Typed event emitter
├── llm/           # LLM provider abstraction
├── tools/         # Shared tools (chat & MCP)
├── mcp/           # MCP server (stdio transport)
└── observability/ # Metrics, tracing
```

See [Architecture Overview](https://spencerjirehcebrian.github.io/portfolio-cms-express-backend-with-mcp-server/architecture/) for details.

## Documentation

| Topic | Link |
|-------|------|
| Getting Started | [Quick Start Guide](https://spencerjirehcebrian.github.io/portfolio-cms-express-backend-with-mcp-server/guide/quick-start.html) |
| Configuration | [Environment & Settings](https://spencerjirehcebrian.github.io/portfolio-cms-express-backend-with-mcp-server/guide/configuration.html) |
| Architecture | [High-Level Design](https://spencerjirehcebrian.github.io/portfolio-cms-express-backend-with-mcp-server/architecture/high-level-design.html) |
| API | [OpenAPI Reference](https://spencerjirehcebrian.github.io/portfolio-cms-express-backend-with-mcp-server/api/reference.html) |
| MCP Server | [Integration Guide](https://spencerjirehcebrian.github.io/portfolio-cms-express-backend-with-mcp-server/integrations/mcp-server.html) |
| Operations | [Runbook](https://spencerjirehcebrian.github.io/portfolio-cms-express-backend-with-mcp-server/operations/runbook.html) |

## Scripts

```bash
bun run dev        # Development server
bun run build      # Production build
bun run test       # Run tests
bun run lint       # Lint code
bun run db:studio  # Drizzle Studio GUI
bun run mcp        # Start MCP server
```

## License

MIT
