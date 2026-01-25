# High-Level Design (HLD)

## Portfolio Backend

**Version**: 1.0.0
**Last Updated**: 2025-01-25
**Status**: Approved

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Context](#system-context)
3. [Container Architecture](#container-architecture)
4. [Data Flow](#data-flow)
5. [Non-Functional Requirements](#non-functional-requirements)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)
8. [Monitoring & Observability](#monitoring--observability)

---

## Executive Summary

### Purpose

A TypeScript/Express backend serving a personal portfolio website with:
- Content Management System (CMS) for portfolio content
- AI-powered chat for visitor engagement
- MCP (Model Context Protocol) server for AI tooling integration

### Goals

1. **Showcase Backend Skills**: Demonstrate proficiency in modern backend patterns
2. **Production-Ready**: Deployable with proper observability, security, and resilience
3. **Maintainable**: Clean architecture with clear separation of concerns
4. **Extensible**: Easy to add new features without major refactoring

### Scope

| In Scope | Out of Scope |
|----------|--------------|
| REST API for content and chat | User authentication (admin-only API key) |
| AI chat with rate limiting | Multi-tenant support |
| MCP server integration | Real-time features (WebSocket) |
| Content versioning | Media file storage |
| Observability (logs, metrics, traces) | Full-text search engine |

---

## System Context

### C4 Level 1: System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM CONTEXT                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
    │   Portfolio  │         │    Admin     │         │  AI Tools    │
    │   Visitor    │         │    User      │         │ (Claude etc) │
    │   [Person]   │         │   [Person]   │         │   [System]   │
    └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
           │                        │                        │
           │ Views portfolio        │ Manages content        │ Uses MCP
           │ Chats with AI          │ Views analytics        │ tools
           │                        │                        │
           ▼                        ▼                        ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                                                                 │
    │                    PORTFOLIO BACKEND                            │
    │                       [System]                                  │
    │                                                                 │
    │  Serves portfolio content, handles AI chat, provides           │
    │  MCP tools for AI integration                                  │
    │                                                                 │
    └───────────────────────────┬─────────────────────────────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
           ▼                    ▼                    ▼
    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │    Turso     │     │    Redis     │     │  LLM API     │
    │  (Database)  │     │   (Cache)    │     │  (OpenAI)    │
    │  [External]  │     │  [External]  │     │  [External]  │
    └──────────────┘     └──────────────┘     └──────────────┘
```

### External Systems

| System | Purpose | Protocol | Notes |
|--------|---------|----------|-------|
| **Turso** | Primary database (libSQL/SQLite) | HTTPS | Edge-replicated SQLite |
| **Redis** | Caching, rate limiting state | TCP | Optional, falls back to memory |
| **LLM Provider** | AI chat responses | HTTPS | OpenAI-compatible API |
| **OTLP Collector** | Trace collection | HTTPS | Optional, for observability |

### Actors

| Actor | Description | Interaction |
|-------|-------------|-------------|
| **Portfolio Visitor** | Anonymous users viewing the portfolio | Read content, use chat |
| **Admin** | Portfolio owner managing content | CRUD operations via API key |
| **AI Tools** | Claude Desktop, other MCP clients | Query portfolio via MCP protocol |

---

## Container Architecture

### C4 Level 2: Container Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PORTFOLIO BACKEND                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Express Application                          │   │
│  │                                                                      │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │   │   Public    │  │   Admin     │  │   Health    │                │   │
│  │   │   Routes    │  │   Routes    │  │   Routes    │                │   │
│  │   │ /api/v1/*   │  │ /api/v1/    │  │ /api/health │                │   │
│  │   │             │  │   admin/*   │  │ /api/metrics│                │   │
│  │   └──────┬──────┘  └──────┬──────┘  └─────────────┘                │   │
│  │          │                │                                         │   │
│  │          ▼                ▼                                         │   │
│  │   ┌─────────────────────────────────────────────────────────┐      │   │
│  │   │                   Middleware Stack                       │      │   │
│  │   │  Security → Context → Logger → Rate Limit → Idempotency │      │   │
│  │   └─────────────────────────────────────────────────────────┘      │   │
│  │                              │                                      │   │
│  │          ┌───────────────────┼───────────────────┐                 │   │
│  │          ▼                   ▼                   ▼                 │   │
│  │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐         │   │
│  │   │  Content    │     │    Chat     │     │Obfuscation  │         │   │
│  │   │  Service    │     │  Service    │     │  Service    │         │   │
│  │   └──────┬──────┘     └──────┬──────┘     └─────────────┘         │   │
│  │          │                   │                                     │   │
│  │          ▼                   ▼                                     │   │
│  │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐         │   │
│  │   │  Content    │     │    Chat     │     │    LLM      │         │   │
│  │   │ Repository  │     │ Repository  │     │  Provider   │         │   │
│  │   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘         │   │
│  │          │                   │                   │                 │   │
│  └──────────┼───────────────────┼───────────────────┼─────────────────┘   │
│             │                   │                   │                     │
│  ┌──────────┼───────────────────┼───────────────────┼─────────────────┐   │
│  │          ▼                   ▼                   ▼                 │   │
│  │   ┌─────────────────────────────────────────────────────────┐      │   │
│  │   │                   Infrastructure                         │      │   │
│  │   │                                                          │      │   │
│  │   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │      │   │
│  │   │  │  Cache  │  │ Circuit │  │  Rate   │  │  Event  │    │      │   │
│  │   │  │ Provider│  │ Breaker │  │ Limiter │  │   Bus   │    │      │   │
│  │   │  └────┬────┘  └─────────┘  └─────────┘  └─────────┘    │      │   │
│  │   │       │                                                  │      │   │
│  │   └───────┼──────────────────────────────────────────────────┘      │   │
│  │           │                                                         │   │
│  └───────────┼─────────────────────────────────────────────────────────┘   │
│              │                                                             │
│  ┌───────────┼─────────────────────────────────────────────────────────┐   │
│  │           ▼                MCP Server                               │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │   │   Public    │  │   Admin     │  │  Resources  │                │   │
│  │   │   Tools     │  │   Tools     │  │             │                │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
    │  Turso  │   │  Redis  │   │ LLM API │   │  OTLP   │
    │   DB    │   │  Cache  │   │         │   │Collector│
    └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

### Container Responsibilities

| Container | Technology | Responsibility |
|-----------|------------|----------------|
| **Express App** | Express.js | HTTP API, routing, middleware |
| **Services** | TypeScript | Business logic, orchestration |
| **Repositories** | Drizzle ORM | Data access abstraction |
| **Infrastructure** | Various | Cross-cutting concerns |
| **MCP Server** | MCP SDK | AI tool integration |

---

> **Note**: For detailed rationale on architectural decisions, see the [Architecture Decision Records (ADRs)](adr/).

---

## Data Flow

### Content Read Flow

```
┌────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client │────▶│  Route  │────▶│ Service │────▶│  Cache  │────▶│  Repo   │
└────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
                                                    │               │
                                              cache hit?            │
                                                    │               │
                                              ┌─────┴─────┐         │
                                              │           │         │
                                            Yes          No         │
                                              │           │         │
                                              ▼           ▼         ▼
                                         ┌─────────┐  ┌─────────┐  ┌─────────┐
                                         │ Return  │  │  Query  │  │  Turso  │
                                         │ Cached  │  │   DB    │──│   DB    │
                                         └─────────┘  └────┬────┘  └─────────┘
                                                           │
                                                           ▼
                                                      ┌─────────┐
                                                      │  Cache  │
                                                      │  Store  │
                                                      └─────────┘
```

### Chat Message Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            CHAT MESSAGE FLOW                                │
└────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐
  │  Client  │
  └────┬─────┘
       │ POST /api/v1/chat
       ▼
  ┌──────────┐
  │  Rate    │◀──── Check token bucket
  │  Limit   │───▶ Reject if empty (429)
  └────┬─────┘
       │ Pass
       ▼
  ┌──────────┐
  │  Chat    │
  │  Route   │
  └────┬─────┘
       │
       ▼
  ┌──────────┐
  │  Chat    │
  │ Service  │
  └────┬─────┘
       │
       ├──────────────────────┐
       ▼                      ▼
  ┌──────────┐          ┌──────────┐
  │ Get/Create│          │Obfuscate │
  │ Session  │          │ Message  │
  └────┬─────┘          └────┬─────┘
       │                     │
       │                     ▼
       │               ┌──────────┐
       │               │  Build   │
       │               │ Messages │
       │               └────┬─────┘
       │                    │
       │                    ▼
       │               ┌──────────┐
       │               │ Circuit  │◀──── Check breaker state
       │               │ Breaker  │───▶ Reject if open (502)
       │               └────┬─────┘
       │                    │ Pass
       │                    ▼
       │               ┌──────────┐
       │               │   LLM    │
       │               │   Call   │────▶ OpenAI API
       │               └────┬─────┘
       │                    │
       │                    ▼
       │               ┌──────────┐
       │               │Deobfuscate│
       │               │ Response │
       │               └────┬─────┘
       │                    │
       ├◀───────────────────┘
       │
       ▼
  ┌──────────┐
  │  Store   │
  │ Messages │────▶ DB (obfuscated)
  └────┬─────┘
       │
       ▼
  ┌──────────┐
  │  Emit    │────▶ chat:message_sent
  │  Events  │
  └────┬─────┘
       │
       ▼
  ┌──────────┐
  │ Response │────▶ Client
  └──────────┘
```

### Admin Content Update Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         CONTENT UPDATE FLOW                                 │
└────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐
  │  Admin   │
  │  Client  │
  └────┬─────┘
       │ PUT /api/v1/admin/content/:id
       │ Headers: X-Admin-Key, Idempotency-Key
       ▼
  ┌──────────┐
  │  Admin   │◀──── Validate API key
  │   Auth   │───▶ Reject if invalid (401)
  └────┬─────┘
       │ Pass
       ▼
  ┌──────────┐
  │Idempotency│◀──── Check cache for key
  │Middleware│───▶ Return cached response if exists
  └────┬─────┘
       │ New request
       ▼
  ┌──────────┐
  │ Content  │
  │  Route   │
  └────┬─────┘
       │
       ▼
  ┌──────────┐
  │ Content  │
  │ Service  │
  └────┬─────┘
       │
       ▼
  ┌──────────┐      ┌──────────┐
  │ Content  │─────▶│Transaction│
  │Repository│      │          │
  └────┬─────┘      │ 1. Read  │
       │            │ 2. History│
       │            │ 3. Update │
       │            └────┬─────┘
       │                 │
       │◀────────────────┘
       │
       ▼
  ┌──────────┐
  │  Emit    │
  │  Events  │
  └────┬─────┘
       │
       ├──────────────────────────────┐
       ▼                              ▼
  ┌──────────┐                  ┌──────────┐
  │  Cache   │                  │  Audit   │
  │Invalidate│                  │   Log    │
  └──────────┘                  └──────────┘
```

---

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | < 200ms | Prometheus histogram |
| API Response Time (p99) | < 500ms | Prometheus histogram |
| Chat Response Time (p95) | < 5s | Prometheus histogram |
| Content Bundle Load | < 100ms | Prometheus histogram |
| Throughput | 100 req/s | Load testing |

### Availability

| Metric | Target | Strategy |
|--------|--------|----------|
| Uptime | 99.9% | Health checks, graceful degradation |
| Recovery Time | < 30s | Container restart, circuit breaker |
| Data Durability | 99.99% | Turso replication |

### Scalability

| Dimension | Current | Path to Scale |
|-----------|---------|---------------|
| Concurrent Users | 10-50 | Single instance sufficient |
| Content Items | 1000s | SQLite handles well |
| Chat Sessions | 100s/day | Rate limiting protects resources |
| Horizontal Scale | N/A | Redis enables multi-instance |

### Security

| Concern | Mitigation |
|---------|------------|
| API Authentication | API key for admin routes |
| Input Validation | Zod schemas, sanitization |
| Rate Limiting | Token bucket per IP |
| Data Privacy | PII obfuscation for LLM |
| Transport | HTTPS only in production |
| Headers | Helmet security headers |

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │            Request                   │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │         Is Admin Route?             │
                    │         /api/v1/admin/*             │
                    └─────────────────┬───────────────────┘
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                        Yes                        No
                         │                         │
                         ▼                         ▼
                    ┌─────────────┐          ┌─────────────┐
                    │   Check     │          │   Public    │
                    │ X-Admin-Key │          │   Access    │
                    └──────┬──────┘          └─────────────┘
                           │
                  ┌────────┴────────┐
                  │                 │
               Valid            Invalid
                  │                 │
                  ▼                 ▼
             ┌─────────┐      ┌─────────┐
             │ Process │      │  401    │
             │ Request │      │ Reject  │
             └─────────┘      └─────────┘
```

### Data Protection

| Data Type | Protection | Storage |
|-----------|------------|---------|
| Admin API Key | Environment variable | Never logged |
| User Messages | Obfuscated | DB stores obfuscated |
| IP Addresses | Hashed (SHA-256) | Logs, rate limit keys |
| Visitor IDs | Client-generated | Session tracking only |

### Threat Model Summary

Key security controls:
- **Authentication**: API key for admin routes, stored in environment variables
- **Abuse Prevention**: Token bucket rate limiting, circuit breaker for LLM
- **Privacy**: PII obfuscation before sending to external LLM providers

### Input Validation & Sanitization

```typescript
// All inputs validated at route boundary
const ContentCreateSchema = z.object({
  type: z.enum(['project', 'page', 'list', 'config']),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/)           // Alphanumeric + hyphen only
    .max(100)
    .optional(),
  data: z.record(z.unknown())
    .refine(validateNoScriptTags),    // XSS prevention
  status: z.enum(['draft', 'published']).default('draft'),
})

// Content sanitization for stored HTML/Markdown
function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'a', 'code', 'pre', 'ul', 'ol', 'li', 'strong', 'em'],
    ALLOWED_ATTR: ['href', 'class'],
  })
}
```

#### CORS Policy

| Origin Type | Policy | Rationale |
|-------------|--------|-----------|
| Configured origins (`CORS_ORIGINS`) | Allow with credentials | Frontend domains |
| Localhost (dev only) | Allow | Development convenience |
| Other origins | Reject | Prevent CSRF |

```typescript
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = process.env.CORS_ORIGINS?.split(',') ?? []
    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('CORS not allowed'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Admin-Key', 'Idempotency-Key'],
}
```

### Audit Logging

| Event | Logged Data | Retention |
|-------|-------------|-----------|
| Admin authentication | Timestamp, IP hash, success/failure | 90 days |
| Content mutations | Action, content ID, version, changed fields | Indefinite (content_history) |
| Rate limit hits | IP hash, endpoint, timestamp | 7 days |
| LLM requests | Session ID, token count, latency | 30 days |
| Errors (4xx/5xx) | Request ID, error code, sanitized message | 30 days |

**Log sanitization:**
- Never log API keys (mask as `***`)
- Hash IPs before logging
- Redact PII from error messages

### Security Headers (Helmet)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}))
```

### Dependency Security

- **npm audit**: Run in CI, fail on high/critical vulnerabilities
- **Dependabot**: Automated security updates
- **Lock file**: Committed `package-lock.json` for reproducible builds
- **Minimal dependencies**: Prefer stdlib over third-party when feasible

---

## Deployment Architecture

### Container Deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DOCKER HOST                                     │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        docker-compose                                │   │
│   │                                                                      │   │
│   │   ┌─────────────────────────┐      ┌─────────────────────────┐     │   │
│   │   │     portfolio-api       │      │        redis            │     │   │
│   │   │                         │      │                         │     │   │
│   │   │   ┌─────────────────┐   │      │   ┌─────────────────┐   │     │   │
│   │   │   │   Node.js App   │   │◀────▶│   │   Redis 7       │   │     │   │
│   │   │   │   Port 3000     │   │      │   │   Port 6379     │   │     │   │
│   │   │   └─────────────────┘   │      │   └─────────────────┘   │     │   │
│   │   │                         │      │                         │     │   │
│   │   │   Memory: 512MB         │      │   Memory: 128MB         │     │   │
│   │   │   CPU: 1 core           │      │   Persistence: AOF      │     │   │
│   │   │                         │      │                         │     │   │
│   │   └───────────┬─────────────┘      └─────────────────────────┘     │   │
│   │               │                                                     │   │
│   └───────────────┼─────────────────────────────────────────────────────┘   │
│                   │                                                         │
└───────────────────┼─────────────────────────────────────────────────────────┘
                    │
                    │ Port 3000
                    ▼
            ┌───────────────┐
            │  Reverse Proxy │
            │  (Nginx/Caddy) │
            └───────────────┘
                    │
                    │ HTTPS :443
                    ▼
            ┌───────────────┐
            │   Internet    │
            └───────────────┘
```

### Health Checks

| Probe | Endpoint | Purpose | Interval |
|-------|----------|---------|----------|
| Liveness | `/api/health/live` | Is process alive? | 30s |
| Readiness | `/api/health/ready` | Can accept traffic? | 10s |
| Startup | `/api/health/startup` | Has initialization completed? | 5s |

---

## Monitoring & Observability

### Three Pillars

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OBSERVABILITY STACK                                │
└─────────────────────────────────────────────────────────────────────────────┘

     LOGS                      METRICS                    TRACES
       │                          │                          │
       ▼                          ▼                          ▼
  ┌─────────┐              ┌─────────┐              ┌─────────┐
  │  Pino   │              │ Prom-   │              │  OTEL   │
  │ Logger  │              │ Client  │              │   SDK   │
  └────┬────┘              └────┬────┘              └────┬────┘
       │                        │                        │
       │ JSON                   │ /metrics               │ OTLP
       │ stdout                 │ scrape                 │ export
       │                        │                        │
       ▼                        ▼                        ▼
  ┌─────────┐              ┌─────────┐              ┌─────────┐
  │  Log    │              │Prometheus│             │  Tempo  │
  │Aggregator│             │         │              │ /Jaeger │
  │(Loki)   │              └────┬────┘              └────┬────┘
  └────┬────┘                   │                        │
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                │
                                ▼
                          ┌─────────┐
                          │ Grafana │
                          │Dashboard│
                          └─────────┘
```

### Key Metrics

| Category | Metric | Labels | Alert Threshold |
|----------|--------|--------|-----------------|
| HTTP | `http_requests_total` | method, path, status | - |
| HTTP | `http_request_duration_seconds` | method, path, status | p99 > 1s |
| HTTP | `http_errors_total` | status, code | > 10/min |
| Chat | `chat_messages_total` | role | - |
| Chat | `chat_tokens_total` | type | > 10k/hour |
| LLM | `llm_requests_total` | provider, status | errors > 5/min |
| LLM | `llm_request_duration_seconds` | provider | p95 > 10s |
| Circuit | `circuit_breaker_state` | name | state = 2 (open) |
| Rate | `rate_limit_hits_total` | - | > 100/hour |
| Cache | `cache_hits_total` | key_prefix | - |
| Cache | `cache_misses_total` | key_prefix | ratio < 0.5 |

### Log Structure

```json
{
  "level": "info",
  "time": 1706184000000,
  "context": "http",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "abc123...",
  "method": "POST",
  "path": "/api/v1/chat",
  "statusCode": 200,
  "duration": 1523,
  "ip": "sha256:...",
  "userAgent": "Mozilla/5.0..."
}
```

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **ADR** | Architecture Decision Record |
| **Circuit Breaker** | Pattern to prevent cascading failures |
| **CQRS** | Command Query Responsibility Segregation |
| **LLM** | Large Language Model |
| **MCP** | Model Context Protocol |
| **OTLP** | OpenTelemetry Protocol |
| **PII** | Personally Identifiable Information |
| **Token Bucket** | Rate limiting algorithm |

### References

- [C4 Model](https://c4model.com/)
- [OpenTelemetry](https://opentelemetry.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Turso Documentation](https://docs.turso.tech/)
