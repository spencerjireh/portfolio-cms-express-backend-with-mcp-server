# Low-Level Design (LLD)

## Portfolio Backend

**Version**: 1.0.0
**Last Updated**: 2025-01-25
**Status**: Approved

---

## Table of Contents

1. [Component Design](#component-design)
2. [Class Diagrams](#class-diagrams)
3. [Database Design](#database-design)
4. [API Contracts](#api-contracts)
5. [Sequence Diagrams](#sequence-diagrams)
6. [Error Handling](#error-handling)
7. [Testing Strategy](#testing-strategy)

---

## Component Design

### C4 Level 3: Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXPRESS APPLICATION                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              ROUTES LAYER                                    │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   v1/        │  │   v1/        │  │   v1/admin/  │  │   health/    │   │
│  │   content    │  │   chat       │  │   *          │  │   *          │   │
│  │              │  │              │  │              │  │              │   │
│  │ GET /        │  │ POST /       │  │ GET /content │  │ GET /live    │   │
│  │ GET /:type/  │  │              │  │ POST /content│  │ GET /ready   │   │
│  │     :slug    │  │              │  │ PUT /content │  │ GET /startup │   │
│  │ GET /bundle  │  │              │  │ DELETE /     │  │              │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────────┘   │
│         │                 │                 │                              │
└─────────┼─────────────────┼─────────────────┼──────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SERVICES LAYER                                   │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │    ContentService    │  │     ChatService      │                        │
│  │                      │  │                      │                        │
│  │ + getAll(filters)    │  │ + processMessage()   │                        │
│  │ + getBySlug()        │  │ + getOrCreateSession │                        │
│  │ + getBundle()        │  │ + endSession()       │                        │
│  │ + create()           │  │                      │                        │
│  │ + update()           │  │      Uses:           │                        │
│  │ + delete()           │  │  - ObfuscationSvc    │                        │
│  │ + getHistory()       │  │  - LLMProvider       │                        │
│  │ + restoreVersion()   │  │  - CircuitBreaker    │                        │
│  └──────────┬───────────┘  └──────────┬───────────┘                        │
│             │                         │                                     │
└─────────────┼─────────────────────────┼─────────────────────────────────────┘
              │                         │
              ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REPOSITORIES LAYER                                 │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │  ContentRepository   │  │   ChatRepository     │                        │
│  │                      │  │                      │                        │
│  │ + findById()         │  │ + createSession()    │                        │
│  │ + findBySlug()       │  │ + findSession()      │                        │
│  │ + findAll()          │  │ + updateActivity()   │                        │
│  │ + create()           │  │ + endSession()       │                        │
│  │ + update()           │  │ + addMessage()       │                        │
│  │ + delete()           │  │ + getMessages()      │                        │
│  │ + search()           │  │ + getStats()         │                        │
│  │ + getHistory()       │  │ + findExpired()      │                        │
│  └──────────┬───────────┘  └──────────┬───────────┘                        │
│             │                         │                                     │
└─────────────┼─────────────────────────┼─────────────────────────────────────┘
              │                         │
              └───────────┬─────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INFRASTRUCTURE LAYER                                │
│                                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   Cache    │  │  Circuit   │  │   Rate     │  │   Event    │           │
│  │  Provider  │  │  Breaker   │  │  Limiter   │  │    Bus     │           │
│  │            │  │            │  │            │  │            │           │
│  │ Memory /   │  │ States:    │  │ Token      │  │ Typed      │           │
│  │ Redis      │  │ closed/    │  │ Bucket     │  │ Emitter    │           │
│  │            │  │ open/      │  │ Algorithm  │  │            │           │
│  │            │  │ half_open  │  │            │  │            │           │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘           │
│                                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │    LLM     │  │ Obfuscation│  │   Job      │  │  Request   │           │
│  │  Provider  │  │  Context   │  │ Scheduler  │  │  Context   │           │
│  │            │  │            │  │            │  │            │           │
│  │ OpenAI-    │  │ PII        │  │ Background │  │ AsyncLocal │           │
│  │ compatible │  │ Detection  │  │ Tasks      │  │ Storage    │           │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SYSTEMS                                   │
│                                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   Turso    │  │   Redis    │  │  LLM API   │  │   OTLP     │           │
│  │  Database  │  │   Cache    │  │  (OpenAI)  │  │ Collector  │           │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Class Diagrams

### Repository Interfaces

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REPOSITORY PATTERN                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                        <<interface>>
                    ┌─────────────────────┐
                    │    Repository<T>    │
                    ├─────────────────────┤
                    │ + findById(id)      │
                    │ + findAll(filters)  │
                    │ + create(data)      │
                    │ + update(id, data)  │
                    │ + delete(id)        │
                    │ + count(filters)    │
                    └─────────┬───────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    <<interface>>                   <<interface>>
┌─────────────────────┐       ┌─────────────────────┐
│ ContentRepository   │       │   ChatRepository    │
├─────────────────────┤       ├─────────────────────┤
│ + findBySlug()      │       │ + createSession()   │
│ + search()          │       │ + findSession()     │
│ + getBundle()       │       │ + updateActivity()  │
│ + getHistory()      │       │ + addMessage()      │
│ + restoreVersion()  │       │ + getMessages()     │
└─────────┬───────────┘       └─────────┬───────────┘
          │                             │
          ▼                             ▼
┌─────────────────────┐       ┌─────────────────────┐
│DrizzleContentRepo   │       │ DrizzleChatRepo     │
├─────────────────────┤       ├─────────────────────┤
│ - db: DrizzleClient │       │ - db: DrizzleClient │
│                     │       │                     │
│ + findById()        │       │ + createSession()   │
│ + findBySlug()      │       │ + findSession()     │
│ + create()          │       │ + addMessage()      │
│ + update()          │       │ + getStats()        │
│ ...                 │       │ ...                 │
└─────────────────────┘       └─────────────────────┘
```

### Cache Provider Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CACHE PROVIDER PATTERN                              │
└─────────────────────────────────────────────────────────────────────────────┘

                        <<interface>>
                    ┌─────────────────────┐
                    │    CacheProvider    │
                    ├─────────────────────┤
                    │ + get<T>(key)       │
                    │ + set(key, val, ttl)│
                    │ + del(key)          │
                    │ + incr(key, ttl)    │
                    │ + decr(key)         │
                    │ + getTokenBucket()  │
                    │ + setTokenBucket()  │
                    │ + ping()            │
                    │ + close()           │
                    └─────────┬───────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│MemoryCacheProvider  │       │ RedisCacheProvider  │
├─────────────────────┤       ├─────────────────────┤
│ - store: Map        │       │ - client: Redis     │
│ - cleanupInterval   │       │ - isConnected       │
│                     │       │                     │
│ + get<T>()          │       │ + get<T>()          │
│ + set()             │       │ + set()             │
│ + cleanup()         │       │ + hgetall()         │
│ ...                 │       │ ...                 │
└─────────────────────┘       └─────────────────────┘

                    ┌─────────────────────┐
                    │    CacheFactory     │
                    ├─────────────────────┤
                    │ - instance: Cache   │
                    ├─────────────────────┤
                    │ + getCache()        │──▶ Returns Redis if available
                    │ + closeCache()      │    else Memory fallback
                    └─────────────────────┘
```

### Error Class Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ERROR HIERARCHY                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌───────────────┐
                          │     Error     │
                          │   (builtin)   │
                          └───────┬───────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │   AppError    │
                          ├───────────────┤
                          │ + message     │
                          │ + code        │
                          │ + statusCode  │
                          │ + isOperational│
                          └───────┬───────┘
                                  │
          ┌───────────┬───────────┼───────────┬───────────┐
          │           │           │           │           │
          ▼           ▼           ▼           ▼           ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
   │Validation  │ │ NotFound   │ │ RateLimit  │ │   LLM      │ │Unauthorized│
   │   Error    │ │   Error    │ │   Error    │ │   Error    │ │   Error    │
   ├────────────┤ ├────────────┤ ├────────────┤ ├────────────┤ ├────────────┤
   │ + fields   │ │            │ │+ retryAfter│ │ + provider │ │            │
   │            │ │            │ │            │ │            │ │            │
   │ code: 400  │ │ code: 404  │ │ code: 429  │ │ code: 502  │ │ code: 401  │
   └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘
```

### Event System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EVENT SYSTEM                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              EventMap                                        │
│  (TypeScript interface defining all event types and payloads)               │
├─────────────────────────────────────────────────────────────────────────────┤
│  'content:created'  → { id, type, slug, version }                           │
│  'content:updated'  → { id, type, version, previousVersion, changedFields } │
│  'content:deleted'  → { id, type, hard }                                    │
│  'content:restored' → { id, type, fromVersion, toVersion }                  │
│  'chat:session_started' → { sessionId, visitorId, ipHash }                  │
│  'chat:message_sent'    → { sessionId, messageId, role, tokensUsed }        │
│  'chat:session_ended'   → { sessionId, messageCount, totalTokens }          │
│  'chat:rate_limited'    → { ipHash, sessionId }                             │
│  'circuit:state_changed' → { name, previousState, newState }                │
│  'cache:invalidated'     → { pattern, reason }                              │
│  'admin:action'          → { action, resourceType, resourceId, changes }    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │       TypedEventEmitter       │
                    ├───────────────────────────────┤
                    │ - emitter: EventEmitter       │
                    ├───────────────────────────────┤
                    │ + emit<K>(event, data)        │  Type-safe emit
                    │ + on<K>(event, handler)       │  Type-safe subscribe
                    │ + off<K>(event, handler)      │  Unsubscribe
                    │ + listenerCount<K>(event)     │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │         Event Handlers        │
                    ├───────────────────────────────┤
                    │ • Metrics tracking            │
                    │ • Cache invalidation          │
                    │ • Audit logging               │
                    │ • (Future: Webhooks)          │
                    └───────────────────────────────┘
```

---

## Database Design

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐       ┌─────────────────────────────┐
│          content            │       │      content_history        │
├─────────────────────────────┤       ├─────────────────────────────┤
│ PK id          TEXT         │       │ PK id          TEXT         │
│    type        TEXT    NN   │◀──────│ FK content_id  TEXT    NN   │
│    slug        TEXT         │       │    version     INTEGER NN   │
│    data        JSON    NN   │       │    data        JSON    NN   │
│    status      TEXT         │       │    change_type TEXT    NN   │
│    version     INTEGER      │       │    changed_by  TEXT         │
│    sort_order  INTEGER      │       │    change_summary TEXT      │
│    created_at  TIMESTAMP    │       │    created_at  TIMESTAMP    │
│    updated_at  TIMESTAMP    │       └─────────────────────────────┘
│    deleted_at  TIMESTAMP    │
├─────────────────────────────┤       Indexes:
│ IDX content_type_idx        │       • content_history_version_idx (content_id, version) UNIQUE
│ UNQ content_type_slug_idx   │       • content_history_content_idx (content_id)
│ IDX content_deleted_idx     │       • content_history_type_idx (change_type)
└─────────────────────────────┘


┌─────────────────────────────┐       ┌─────────────────────────────┐
│       chat_sessions         │       │       chat_messages         │
├─────────────────────────────┤       ├─────────────────────────────┤
│ PK id          TEXT         │       │ PK id          TEXT         │
│    visitor_id  TEXT    NN   │◀──────│ FK session_id  TEXT    NN   │
│    ip_hash     TEXT         │       │    role        TEXT    NN   │
│    user_agent  TEXT         │       │    content     TEXT    NN   │
│    message_count INTEGER    │       │    tokens_used INTEGER      │
│    status      TEXT         │       │    model       TEXT         │
│    started_at  TIMESTAMP    │       │    created_at  TIMESTAMP    │
│    last_active_at TIMESTAMP │       └─────────────────────────────┘
│    expires_at  TIMESTAMP    │
├─────────────────────────────┤       Indexes:
│ IDX chat_sessions_visitor   │       • chat_messages_session_idx (session_id)
│ IDX chat_sessions_ip_hash   │
│ IDX chat_sessions_expires   │
└─────────────────────────────┘


Relationships:
─────────────
content ──────< content_history    (1:N, cascade delete)
chat_sessions ──────< chat_messages (1:N, cascade delete)
```

### Content Data Column Schemas

> See [content-model.md](content-model.md) for detailed content type schemas, validation rules, and examples.

---

## API Contracts

> **Full specification**: See [api.yaml](api.yaml) for the complete OpenAPI 3.0 specification.

### Public Endpoints

#### GET /api/v1/content

```yaml
summary: List content items
parameters:
  - name: type
    in: query
    schema:
      type: string
      enum: [project, page, list, config]
  - name: status
    in: query
    schema:
      type: string
      enum: [draft, published]
      default: published
responses:
  200:
    description: Content list
    headers:
      ETag:
        schema:
          type: string
      Cache-Control:
        schema:
          type: string
    content:
      application/json:
        schema:
          type: array
          items:
            $ref: '#/components/schemas/ContentRow'
  304:
    description: Not Modified (ETag match)
```

#### GET /api/v1/content/:type/:slug

```yaml
summary: Get single content item
parameters:
  - name: type
    in: path
    required: true
    schema:
      type: string
  - name: slug
    in: path
    required: true
    schema:
      type: string
responses:
  200:
    description: Content item
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ContentRow'
  404:
    description: Not found
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
```

#### POST /api/v1/chat

```yaml
summary: Send chat message
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        properties:
          sessionId:
            type: string
            description: Existing session ID (optional for new sessions)
          message:
            type: string
            maxLength: 2000
        required:
          - message
responses:
  200:
    description: Chat response
    content:
      application/json:
        schema:
          type: object
          properties:
            sessionId:
              type: string
            message:
              type: object
              properties:
                id:
                  type: string
                role:
                  type: string
                  enum: [assistant]
                content:
                  type: string
            rateLimit:
              type: object
              properties:
                remaining:
                  type: integer
                resetAt:
                  type: string
                  format: date-time
  429:
    description: Rate limited
    headers:
      Retry-After:
        schema:
          type: integer
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/RateLimitError'
  502:
    description: LLM service unavailable
```

### Admin Endpoints

#### POST /api/v1/admin/content

```yaml
summary: Create content
security:
  - adminKey: []
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        properties:
          type:
            type: string
            enum: [project, page, list, config]
          slug:
            type: string
            pattern: '^[a-z0-9-]+$'
          data:
            type: object
          status:
            type: string
            enum: [draft, published]
            default: draft
          sortOrder:
            type: integer
            default: 0
        required:
          - type
          - data
responses:
  201:
    description: Created
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ContentRow'
  400:
    description: Validation error
  401:
    description: Unauthorized
  409:
    description: Slug already exists
```

#### PUT /api/v1/admin/content/:id

```yaml
summary: Update content
security:
  - adminKey: []
parameters:
  - name: id
    in: path
    required: true
    schema:
      type: string
  - name: Idempotency-Key
    in: header
    schema:
      type: string
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          type:
            type: string
          slug:
            type: string
          data:
            type: object
          status:
            type: string
          sortOrder:
            type: integer
responses:
  200:
    description: Updated
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ContentRow'
  404:
    description: Not found
```

### Component Schemas

```yaml
components:
  schemas:
    ContentRow:
      type: object
      properties:
        id:
          type: string
        type:
          type: string
        slug:
          type: string
          nullable: true
        data:
          type: object
        status:
          type: string
          enum: [draft, published]
        version:
          type: integer
        sortOrder:
          type: integer
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        deletedAt:
          type: string
          format: date-time
          nullable: true

    Error:
      type: object
      properties:
        error:
          type: string
        code:
          type: string
        requestId:
          type: string
        fields:
          type: object
          additionalProperties:
            type: array
            items:
              type: string

    RateLimitError:
      allOf:
        - $ref: '#/components/schemas/Error'
        - type: object
          properties:
            retryAfter:
              type: integer

  securitySchemes:
    adminKey:
      type: apiKey
      in: header
      name: X-Admin-Key
```

---

## Sequence Diagrams

### Content Bundle Request (Cache Hit)

```
┌────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
│ Client │          │  Route  │          │ Service │          │  Cache  │
└───┬────┘          └────┬────┘          └────┬────┘          └────┬────┘
    │                    │                    │                    │
    │ GET /api/v1/       │                    │                    │
    │ content/bundle     │                    │                    │
    │ If-None-Match: "x" │                    │                    │
    │───────────────────▶│                    │                    │
    │                    │                    │                    │
    │                    │ getBundle()        │                    │
    │                    │───────────────────▶│                    │
    │                    │                    │                    │
    │                    │                    │ get("content:      │
    │                    │                    │     bundle")       │
    │                    │                    │───────────────────▶│
    │                    │                    │                    │
    │                    │                    │    cached data     │
    │                    │                    │◀───────────────────│
    │                    │                    │                    │
    │                    │    bundle data     │                    │
    │                    │◀───────────────────│                    │
    │                    │                    │                    │
    │                    │ generateETag()     │                    │
    │                    │ compare with       │                    │
    │                    │ If-None-Match      │                    │
    │                    │                    │                    │
    │    304 Not         │                    │                    │
    │    Modified        │                    │                    │
    │◀───────────────────│                    │                    │
    │                    │                    │                    │
```

### Chat Message Flow (Full)

```
┌────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client │     │  Route  │     │RateLim  │     │ChatSvc  │     │Obfusc   │     │Circuit  │     │   LLM   │
└───┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
    │               │               │               │               │               │               │
    │ POST /chat    │               │               │               │               │               │
    │ {message}     │               │               │               │               │               │
    │──────────────▶│               │               │               │               │               │
    │               │               │               │               │               │               │
    │               │ consume(ip)   │               │               │               │               │
    │               │──────────────▶│               │               │               │               │
    │               │               │               │               │               │               │
    │               │ {allowed:true}│               │               │               │               │
    │               │◀──────────────│               │               │               │               │
    │               │               │               │               │               │               │
    │               │ processMsg()  │               │               │               │               │
    │               │──────────────────────────────▶│               │               │               │
    │               │               │               │               │               │               │
    │               │               │               │ obfuscate()   │               │               │
    │               │               │               │──────────────▶│               │               │
    │               │               │               │               │               │               │
    │               │               │               │ obfuscated    │               │               │
    │               │               │               │◀──────────────│               │               │
    │               │               │               │               │               │               │
    │               │               │               │ execute()     │               │               │
    │               │               │               │──────────────────────────────▶│               │
    │               │               │               │               │               │               │
    │               │               │               │               │ isAvailable() │               │
    │               │               │               │               │──────────────▶│               │
    │               │               │               │               │               │               │
    │               │               │               │               │    true       │               │
    │               │               │               │               │◀──────────────│               │
    │               │               │               │               │               │               │
    │               │               │               │               │ chat()        │               │
    │               │               │               │               │──────────────────────────────▶│
    │               │               │               │               │               │               │
    │               │               │               │               │   response    │               │
    │               │               │               │               │◀──────────────────────────────│
    │               │               │               │               │               │               │
    │               │               │               │               │recordSuccess()│               │
    │               │               │               │               │──────────────▶│               │
    │               │               │               │               │               │               │
    │               │               │               │ response      │               │               │
    │               │               │               │◀──────────────────────────────│               │
    │               │               │               │               │               │               │
    │               │               │               │ deobfuscate() │               │               │
    │               │               │               │──────────────▶│               │               │
    │               │               │               │               │               │               │
    │               │               │               │ deobfuscated  │               │               │
    │               │               │               │◀──────────────│               │               │
    │               │               │               │               │               │               │
    │               │               │               │ emit events   │               │               │
    │               │               │               │──────────────▶ (async)        │               │
    │               │               │               │               │               │               │
    │               │   response    │               │               │               │               │
    │               │◀──────────────────────────────│               │               │               │
    │               │               │               │               │               │               │
    │  200 OK       │               │               │               │               │               │
    │  {sessionId,  │               │               │               │               │               │
    │   message}    │               │               │               │               │               │
    │◀──────────────│               │               │               │               │               │
    │               │               │               │               │               │               │
```

### Circuit Breaker State Transitions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CIRCUIT BREAKER STATE MACHINE                          │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────────┐
                              │                     │
                              │       CLOSED        │◀─────────────────────────┐
                              │                     │                          │
                              │  • Allow all calls  │                          │
                              │  • Count failures   │                          │
                              │                     │                          │
                              └──────────┬──────────┘                          │
                                         │                                     │
                                         │ failures >= threshold               │
                                         │                                     │
                                         ▼                                     │
                              ┌─────────────────────┐                          │
                              │                     │                          │
                              │        OPEN         │                          │
                              │                     │                          │
                              │  • Reject all calls │                          │
                              │  • Return error     │                          │
                              │  • Start timer      │                          │
                              │                     │                          │
                              └──────────┬──────────┘                          │
                                         │                                     │
                                         │ timeout elapsed                     │
                                         │                                     │
                                         ▼                                     │
                              ┌─────────────────────┐                          │
                              │                     │                          │
                              │     HALF_OPEN       │──────────────────────────┘
                              │                     │      success >= threshold
                              │  • Allow limited    │
                              │  • Test if healthy  │
                              │                     │
                              └──────────┬──────────┘
                                         │
                                         │ any failure
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │                     │
                              │        OPEN         │
                              │                     │
                              └─────────────────────┘


Configuration:
─────────────
• failureThreshold: 5       (failures before opening)
• resetTimeout: 30000ms     (time before trying half-open)
• halfOpenMaxAttempts: 2    (successes needed to close)
```

### Content Versioning Transaction Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    CONTENT UPDATE WITH VERSIONING                           │
└────────────────────────────────────────────────────────────────────────────┘

┌────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Admin  │     │  Route  │     │ Service │     │  Repo   │     │   DB    │
│ Client │     │         │     │         │     │         │     │ (Turso) │
└───┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
    │               │               │               │               │
    │ PUT /admin/   │               │               │               │
    │ content/:id   │               │               │               │
    │ + Idempotency │               │               │               │
    │   -Key        │               │               │               │
    │──────────────▶│               │               │               │
    │               │               │               │               │
    │               │ check         │               │               │
    │               │ idempotency   │               │               │
    │               │──────────────▶│               │               │
    │               │               │               │               │
    │               │ update()      │               │               │
    │               │──────────────▶│               │               │
    │               │               │               │               │
    │               │               │ updateWithHistory()           │
    │               │               │──────────────▶│               │
    │               │               │               │               │
    │               │               │               │ BEGIN         │
    │               │               │               │ TRANSACTION   │
    │               │               │               │──────────────▶│
    │               │               │               │               │
    │               │               │               │ 1. SELECT     │
    │               │               │               │    current    │
    │               │               │               │    content    │
    │               │               │               │──────────────▶│
    │               │               │               │               │
    │               │               │               │    current    │
    │               │               │               │    row        │
    │               │               │               │◀──────────────│
    │               │               │               │               │
    │               │               │               │ 2. INSERT     │
    │               │               │               │    INTO       │
    │               │               │               │    content_   │
    │               │               │               │    history    │
    │               │               │               │──────────────▶│
    │               │               │               │               │
    │               │               │               │ 3. UPDATE     │
    │               │               │               │    content    │
    │               │               │               │    SET data,  │
    │               │               │               │    version++  │
    │               │               │               │──────────────▶│
    │               │               │               │               │
    │               │               │               │ COMMIT        │
    │               │               │               │──────────────▶│
    │               │               │               │               │
    │               │               │  updated row  │               │
    │               │               │◀──────────────│               │
    │               │               │               │               │
    │               │               │ emit('content:updated')       │
    │               │               │──────────────▶ Event Bus      │
    │               │               │               │               │
    │               │  updated row  │               │               │
    │               │◀──────────────│               │               │
    │               │               │               │               │
    │               │ cache         │               │               │
    │               │ idempotency   │               │               │
    │               │ response      │               │               │
    │               │               │               │               │
    │  200 OK       │               │               │               │
    │  {content}    │               │               │               │
    │◀──────────────│               │               │               │
    │               │               │               │               │


                         Event Handlers (Async)
                         ─────────────────────────
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
              ┌─────────┐    ┌─────────┐    ┌─────────┐
              │ Cache   │    │ Metrics │    │  Audit  │
              │Invalidate│   │ Update  │    │   Log   │
              └─────────┘    └─────────┘    └─────────┘
```

**Transaction Details:**

```typescript
// src/repositories/content.repository.ts
async updateWithHistory(
  id: string,
  updates: Partial<ContentUpdate>,
  changedBy?: string
): Promise<Content> {
  return this.db.transaction(async (tx) => {
    // 1. Read current state
    const [current] = await tx
      .select()
      .from(content)
      .where(eq(content.id, id))

    if (!current) {
      throw new NotFoundError('Content', id)
    }

    // 2. Archive current version to history
    await tx.insert(contentHistory).values({
      id: generateId(),
      contentId: id,
      version: current.version,
      data: current.data,
      changeType: 'update',
      changedBy,
      changeSummary: this.summarizeChanges(current.data, updates.data),
      createdAt: new Date(),
    })

    // 3. Update content with new version
    const [updated] = await tx
      .update(content)
      .set({
        ...updates,
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(content.id, id))
      .returning()

    return updated
  })
}
```

### Content Restore Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                       RESTORE PREVIOUS VERSION                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Admin  │     │ Service │     │  Repo   │     │   DB    │
└───┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
    │               │               │               │
    │ POST /content │               │               │
    │ /:id/restore  │               │               │
    │ {version: 3}  │               │               │
    │──────────────▶│               │               │
    │               │               │               │
    │               │ 1. Get target version         │
    │               │ from history                  │
    │               │──────────────▶│               │
    │               │               │──────────────▶│
    │               │               │◀──────────────│
    │               │               │               │
    │               │ 2. Call updateWithHistory()   │
    │               │    using history.data         │
    │               │──────────────▶│               │
    │               │               │               │
    │               │               │ [transaction] │
    │               │               │ - archive     │
    │               │               │   current     │
    │               │               │ - restore     │
    │               │               │   old data    │
    │               │               │ - version++   │
    │               │               │──────────────▶│
    │               │               │               │
    │               │◀──────────────│               │
    │               │               │               │
    │  200 OK       │               │               │
    │  {restored}   │               │               │
    │◀──────────────│               │               │
    │               │               │               │


  Version Timeline:
  ─────────────────

  v1        v2        v3        v4 (current)    v5 (after restore)
   │         │         │              │               │
   ●─────────●─────────●──────────────●───────────────●
   │         │         │              │               │
 create   update    update       update         restore v3
                      ▲                               │
                      └───────────────────────────────┘
                            data copied from v3
```

---

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: string           // Human-readable message
  code: string            // Machine-readable code
  requestId: string       // For tracing
  fields?: Record<string, string[]>  // Validation errors
  retryAfter?: number     // For rate limiting
  stack?: string          // Dev mode only
}
```

### HTTP Status Code Mapping

| Status | Code | Scenario |
|--------|------|----------|
| 400 | VALIDATION_ERROR | Invalid request body/params |
| 401 | UNAUTHORIZED | Missing/invalid admin key |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Duplicate slug |
| 429 | RATE_LIMITED | Token bucket empty |
| 500 | INTERNAL_ERROR | Unexpected server error |
| 502 | LLM_ERROR | LLM provider failure |

### Error Class Implementation

```typescript
// src/errors/app-error.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly isOperational: boolean = true,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

// Specialized error classes
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 400, true, { fields })
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string) {
    super(
      `${resource} not found: ${identifier}`,
      'NOT_FOUND',
      404
    )
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Invalid or missing authentication') {
    super(message, 'UNAUTHORIZED', 401)
  }
}

export class RateLimitError extends AppError {
  constructor(public readonly retryAfter: number) {
    super(
      'Rate limit exceeded',
      'RATE_LIMITED',
      429,
      true,
      { retryAfter }
    )
  }
}

export class ConflictError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'CONFLICT', 409, true, field ? { field } : undefined)
  }
}

export class LLMError extends AppError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly originalError?: Error
  ) {
    super(message, 'LLM_ERROR', 502, true, { provider })
  }
}
```

### Throwing Errors in Services

```typescript
// src/services/content.service.ts
export class ContentService {
  async getBySlug(type: string, slug: string): Promise<Content> {
    const content = await this.repository.findBySlug(type, slug)

    if (!content) {
      throw new NotFoundError('Content', `${type}/${slug}`)
    }

    if (content.status !== 'published') {
      throw new NotFoundError('Content', `${type}/${slug}`)
    }

    return content
  }

  async create(data: CreateContentInput): Promise<Content> {
    // Check for duplicate slug
    if (data.slug) {
      const existing = await this.repository.findBySlug(data.type, data.slug)
      if (existing) {
        throw new ConflictError(
          `Content with slug '${data.slug}' already exists`,
          'slug'
        )
      }
    }

    return this.repository.create(data)
  }
}

// src/services/chat.service.ts
export class ChatService {
  async processMessage(input: ChatInput): Promise<ChatResponse> {
    // Rate limit check happens in middleware, but we double-check here
    const allowed = await this.rateLimiter.consume(input.ipHash, 1)
    if (!allowed.allowed) {
      throw new RateLimitError(allowed.retryAfter)
    }

    try {
      const response = await this.circuitBreaker.execute(() =>
        this.llmProvider.chat(messages, options)
      )
      return response
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        throw new LLMError(
          'AI service temporarily unavailable',
          this.llmProvider.name
        )
      }
      throw error
    }
  }
}
```

### Example Error Responses

**Validation Error (400):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "fields": {
    "slug": ["Slug must be lowercase alphanumeric with hyphens"],
    "data.title": ["Required"]
  }
}
```

**Not Found (404):**
```json
{
  "error": "Content not found: project/nonexistent",
  "code": "NOT_FOUND",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Rate Limited (429):**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "retryAfter": 30
}
```
*Headers: `Retry-After: 30`*

**LLM Error (502):**
```json
{
  "error": "AI service temporarily unavailable",
  "code": "LLM_ERROR",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Testing Strategy

### Test Pyramid

```
                    ┌───────────┐
                    │    E2E    │  Few, slow, high confidence
                    │   Tests   │  (~5% of tests)
                    └─────┬─────┘
                          │
                    ┌─────┴─────┐
                    │Integration│  Some, moderate speed
                    │   Tests   │  (~25% of tests)
                    └─────┬─────┘
                          │
              ┌───────────┴───────────┐
              │       Unit Tests      │  Many, fast, isolated
              │                       │  (~70% of tests)
              └───────────────────────┘
```

### Coverage Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Line Coverage | 80% | Balance between confidence and maintenance |
| Branch Coverage | 75% | Ensure error paths are tested |
| Critical Paths | 100% | Auth, rate limiting, data mutations |
| Infrastructure | 60% | Harder to test, rely on integration tests |

### Test Categories

| Category | Directory | Focus | Tools |
|----------|-----------|-------|-------|
| Unit | `tests/unit/` | Functions, classes in isolation | Vitest, mocks |
| Integration | `tests/integration/` | API endpoints, DB operations | Supertest, in-memory SQLite |
| E2E | `tests/e2e/` | Full user flows | Supertest, test containers |

### Database Testing Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE TEST STRATEGY                               │
└─────────────────────────────────────────────────────────────────────────────┘

  Unit Tests                Integration Tests              E2E Tests
       │                           │                            │
       ▼                           ▼                            ▼
  ┌─────────┐               ┌─────────────┐              ┌─────────────┐
  │  Mocked │               │ In-Memory   │              │ Test Turso  │
  │  Repos  │               │   SQLite    │              │  Database   │
  └─────────┘               └─────────────┘              └─────────────┘
       │                           │                            │
  No real DB               libsql :memory:               Separate DB
  Fast, isolated           Real SQL, fast                Full fidelity
```

> See `tests/` directory for implementation examples including mocks, fixtures, and test utilities.

---

## Appendix

### File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Routes | `{resource}.ts` | `content.ts`, `chat.ts` |
| Services | `{name}.ts` | `obfuscation.ts` |
| Repositories | `{entity}.repository.ts` | `content.repository.ts` |
| Middleware | `{name}.ts` | `idempotency.ts` |
| Types | `{name}.ts` | `content.ts` |
| Tests | `{name}.test.ts` | `rate-limiter.test.ts` |

### Code Style

- Use `async/await` over Promise chains
- Prefer `const` over `let`
- Use explicit return types on public functions
- Use `unknown` over `any` where possible
- Document public APIs with JSDoc comments
