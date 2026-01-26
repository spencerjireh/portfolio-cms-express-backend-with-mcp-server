---
title: High-Level Design
description: System context, containers, and deployment architecture
---

# High-Level Design (HLD)

**Version**: 1.0.0
**Last Updated**: 2025-01-25
**Status**: Approved

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

## System Context

### C4 Level 1: System Context Diagram

```mermaid
C4Context
    title System Context Diagram - Portfolio Backend

    Person(visitor, "Portfolio Visitor", "Views portfolio and chats with AI")
    Person(admin, "Admin User", "Manages content and views analytics")
    System_Ext(aiTools, "AI Tools", "Claude Desktop, other MCP clients")

    System(backend, "Portfolio Backend", "Serves portfolio content, handles AI chat, provides MCP tools")

    System_Ext(turso, "Turso", "Edge-replicated SQLite database")
    System_Ext(redis, "Redis", "Cache and rate limiting state")
    System_Ext(llm, "LLM API", "OpenAI-compatible API")

    Rel(visitor, backend, "Views portfolio, Chats with AI")
    Rel(admin, backend, "Manages content, Views analytics")
    Rel(aiTools, backend, "Uses MCP tools")

    Rel(backend, turso, "Stores data")
    Rel(backend, redis, "Caches data")
    Rel(backend, llm, "AI responses")
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

## Container Architecture

### C4 Level 2: Container Diagram

```mermaid
C4Container
    title Container Diagram - Portfolio Backend

    Person(client, "Client", "Browser or API consumer")

    Container_Boundary(app, "Express Application") {
        Container(routes, "Routes Layer", "Express", "Public, Admin, Health routes")
        Container(middleware, "Middleware Stack", "Express", "Security, Context, Logger, Rate Limit, Idempotency")
        Container(services, "Services Layer", "TypeScript", "ContentService, ChatService, ObfuscationService")
        Container(repos, "Repositories", "Drizzle ORM", "ContentRepository, ChatRepository")
        Container(infra, "Infrastructure", "TypeScript", "Cache, Circuit Breaker, Rate Limiter, Event Bus")
    }

    System_Ext(turso, "Turso DB", "Database")
    System_Ext(redis, "Redis Cache", "Cache")
    System_Ext(llm, "LLM API", "AI Provider")
    System_Ext(otlp, "OTLP Collector", "Observability")

    Rel(client, routes, "HTTP requests")
    Rel(routes, middleware, "Processes through")
    Rel(middleware, services, "Calls")
    Rel(services, repos, "Data access")
    Rel(repos, turso, "Queries")
    Rel(infra, redis, "Cache ops")
    Rel(services, llm, "Chat requests")
    Rel(infra, otlp, "Traces")
```

### Container Responsibilities

| Container | Technology | Responsibility |
|-----------|------------|----------------|
| **Express App** | Express.js | HTTP API, routing, middleware |
| **Services** | TypeScript | Business logic, orchestration |
| **Repositories** | Drizzle ORM | Data access abstraction |
| **Infrastructure** | Various | Cross-cutting concerns |
| **MCP Server** | MCP SDK | AI tool integration |

::: tip
For detailed rationale on architectural decisions, see the [Architecture Decision Records](/decisions/).
:::

## Data Flow

### Content Read Flow

```mermaid
flowchart LR
    Client([Client]) --> Route[Route]
    Route --> Service[Service]
    Service --> Cache{Cache}
    Cache -->|Hit| Return[Return Cached]
    Cache -->|Miss| Repo[Repository]
    Repo --> DB[(Turso DB)]
    DB --> Repo
    Repo --> Store[Cache Store]
    Store --> Return2[Return Data]
```

### Chat Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant RateLimit as Rate Limiter
    participant ChatRoute as Chat Route
    participant ChatSvc as Chat Service
    participant Obfuscate as Obfuscator
    participant Circuit as Circuit Breaker
    participant LLM

    Client->>RateLimit: POST /api/v1/chat
    alt Token bucket empty
        RateLimit-->>Client: 429 Too Many Requests
    else Allowed
        RateLimit->>ChatRoute: Pass
        ChatRoute->>ChatSvc: processMessage()
        ChatSvc->>Obfuscate: obfuscate(message)
        Obfuscate-->>ChatSvc: obfuscated message
        ChatSvc->>Circuit: execute()
        alt Breaker open
            Circuit-->>Client: 502 Service Unavailable
        else Breaker closed
            Circuit->>LLM: chat()
            LLM-->>Circuit: response
            Circuit-->>ChatSvc: response
        end
        ChatSvc->>Obfuscate: deobfuscate(response)
        Obfuscate-->>ChatSvc: clean response
        ChatSvc->>ChatSvc: store messages (obfuscated)
        ChatSvc->>ChatSvc: emit events
        ChatSvc-->>Client: 200 OK {sessionId, message}
    end
```

### Chat Message Flow with Tools

The chat service uses OpenAI function calling to query portfolio data:

```mermaid
sequenceDiagram
    participant Client
    participant ChatSvc as Chat Service
    participant LLM as LLM (OpenAI)
    participant Tools as Tool Executor
    participant Repo as Content Repo

    Client->>ChatSvc: message
    ChatSvc->>LLM: messages + tools
    LLM-->>ChatSvc: tool_call

    loop Up to 5 iterations
        ChatSvc->>Tools: executeToolCall
        Tools->>Repo: query
        Repo-->>Tools: results
        Tools-->>ChatSvc: tool_result
        ChatSvc->>LLM: messages + tool_result
        alt LLM needs more data
            LLM-->>ChatSvc: another tool_call
        else LLM has enough context
            LLM-->>ChatSvc: final response
        end
    end

    ChatSvc-->>Client: response
```

**Key components:**

| Component | Description |
|-----------|-------------|
| `chatToolDefinitions` | OpenAI function schemas for list_content, get_content, search_content |
| `executeToolCall()` | Executes tool calls and returns JSON results |
| Tool loop | Up to 5 iterations until LLM has enough context |
| Core tools | Shared implementation with MCP server (see [ADR-008](/decisions/008-shared-tools-architecture)) |

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

## Security Architecture

### Authentication & Authorization

```mermaid
flowchart TD
    Request([Request]) --> IsAdmin{Is Admin Route?<br/>/api/v1/admin/*}

    IsAdmin -->|Yes| CheckKey{Check<br/>X-Admin-Key}
    IsAdmin -->|No| Public[Public Access]

    CheckKey -->|Valid| Process[Process Request]
    CheckKey -->|Invalid| Reject[401 Reject]

    Public --> Process
```

### Data Protection

| Data Type | Protection | Storage |
|-----------|------------|---------|
| Admin API Key | Environment variable | Never logged |
| User Messages | Obfuscated | DB stores obfuscated |
| IP Addresses | Hashed (SHA-256) | Logs, rate limit keys |
| Visitor IDs | Client-generated | Session tracking only |

## Deployment Architecture

### Container Deployment

```mermaid
flowchart TB
    subgraph Docker["Docker Host"]
        subgraph Compose["docker-compose"]
            API["portfolio-api<br/>Node.js App<br/>Port 3000<br/>Memory: 512MB"]
            Redis["redis<br/>Redis 7<br/>Port 6379<br/>Memory: 128MB"]
        end
        API <--> Redis
    end

    Docker --> Proxy["Reverse Proxy<br/>(Nginx/Caddy)"]
    Proxy --> Internet["Internet<br/>HTTPS :443"]
```

### Health Checks

| Probe | Endpoint | Purpose | Interval |
|-------|----------|---------|----------|
| Liveness | `/api/health/live` | Is process alive? | 30s |
| Readiness | `/api/health/ready` | Can accept traffic? | 10s |
| Startup | `/api/health/startup` | Has initialization completed? | 5s |

## Monitoring & Observability

### Three Pillars

```mermaid
flowchart TB
    subgraph App["Application"]
        Pino["Pino Logger"]
        Prom["Prometheus Client"]
        OTEL["OpenTelemetry SDK"]
    end

    Pino -->|JSON stdout| Loki["Log Aggregator<br/>(Loki)"]
    Prom -->|/metrics scrape| Prometheus["Prometheus"]
    OTEL -->|OTLP export| Tempo["Tempo/Jaeger"]

    Loki --> Grafana["Grafana Dashboard"]
    Prometheus --> Grafana
    Tempo --> Grafana
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
