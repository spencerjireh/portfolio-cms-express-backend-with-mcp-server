---
title: Low-Level Design
description: Component design, class diagrams, and sequence diagrams
---

# Low-Level Design (LLD)

**Version**: 1.0.0
**Last Updated**: 2025-01-25
**Status**: Approved

## Component Design

### C4 Level 3: Component Diagram

```
                            EXPRESS APPLICATION

+-------------------------------------------------------------------------+
|                              ROUTES LAYER                                |
|                                                                          |
|  +--------------+  +--------------+  +--------------+  +--------------+  |
|  |   v1/        |  |   v1/        |  |   v1/admin/  |  |   health/    |  |
|  |   content    |  |   chat       |  |   *          |  |   *          |  |
|  |              |  |              |  |              |  |              |  |
|  | GET /        |  | POST /       |  | GET /content |  | GET /live    |  |
|  | GET /:type/  |  |              |  | POST /content|  | GET /ready   |  |
|  |     :slug    |  |              |  | PUT /content |  | GET /startup |  |
|  | GET /bundle  |  |              |  | DELETE /     |  |              |  |
|  +------+-------+  +------+-------+  +------+-------+  +--------------+  |
|         |                 |                 |                            |
+---------+-----------------+-----------------+----------------------------+
          |                 |                 |
          v                 v                 v
+-------------------------------------------------------------------------+
|                             SERVICES LAYER                               |
|                                                                          |
|  +----------------------+  +----------------------+                      |
|  |    ContentService    |  |     ChatService      |                      |
|  |                      |  |                      |                      |
|  | + getAll(filters)    |  | + processMessage()   |                      |
|  | + getBySlug()        |  | + getOrCreateSession |                      |
|  | + getBundle()        |  | + endSession()       |                      |
|  | + create()           |  |                      |                      |
|  | + update()           |  |      Uses:           |                      |
|  | + delete()           |  |  - ObfuscationSvc    |                      |
|  | + getHistory()       |  |  - LLMProvider       |                      |
|  | + restoreVersion()   |  |  - CircuitBreaker    |                      |
|  +----------+-----------+  +----------+-----------+                      |
|             |                         |                                  |
+-------------+-------------------------+----------------------------------+
              |                         |
              v                         v
+-------------------------------------------------------------------------+
|                           REPOSITORIES LAYER                             |
|                                                                          |
|  +----------------------+  +----------------------+                      |
|  |  ContentRepository   |  |   ChatRepository     |                      |
|  |                      |  |                      |                      |
|  | + findById()         |  | + createSession()    |                      |
|  | + findBySlug()       |  | + findSession()      |                      |
|  | + findAll()          |  | + updateActivity()   |                      |
|  | + create()           |  | + endSession()       |                      |
|  | + update()           |  | + addMessage()       |                      |
|  | + delete()           |  | + getMessages()      |                      |
|  | + search()           |  | + getStats()         |                      |
|  | + getHistory()       |  | + findExpired()      |                      |
|  +----------+-----------+  +----------+-----------+                      |
|             |                         |                                  |
+-------------+------------+------------+----------------------------------+
                           |
                           v
+-------------------------------------------------------------------------+
|                          INFRASTRUCTURE LAYER                            |
|                                                                          |
|  +------------+  +------------+  +------------+  +------------+          |
|  |   Cache    |  |  Circuit   |  |   Rate     |  |   Event    |          |
|  |  Provider  |  |  Breaker   |  |  Limiter   |  |    Bus     |          |
|  |            |  |            |  |            |  |            |          |
|  | Memory /   |  | States:    |  | Token      |  | Typed      |          |
|  | Redis      |  | closed/    |  | Bucket     |  | Emitter    |          |
|  |            |  | open/      |  | Algorithm  |  |            |          |
|  |            |  | half_open  |  |            |  |            |          |
|  +------------+  +------------+  +------------+  +------------+          |
|                                                                          |
|  +------------+  +------------+  +------------+  +------------+          |
|  |    LLM     |  | Obfuscation|  |   Job      |  |  Request   |          |
|  |  Provider  |  |  Context   |  | Scheduler  |  |  Context   |          |
|  |            |  |            |  |            |  |            |          |
|  | OpenAI-    |  | PII        |  | Background |  | AsyncLocal |          |
|  | compatible |  | Detection  |  | Tasks      |  | Storage    |          |
|  +------------+  +------------+  +------------+  +------------+          |
+-------------------------------------------------------------------------+
```

### Shared Tools Layer

The tools layer provides unified tool implementations used by both MCP and Chat:

```
                                  SHARED TOOLS ARCHITECTURE

+------------------------------------------------------------------+
|                           src/tools/                              |
|                                                                   |
|  +--------------------+                                           |
|  |     types.ts       |  ToolResult<T>, ContentItem types         |
|  +--------------------+                                           |
|                                                                   |
|  +--------------------+                                           |
|  |      core/         |  Core tool implementations                |
|  |  +---------------+ |                                           |
|  |  | list-content  | |  listContent() - List by type             |
|  |  +---------------+ |                                           |
|  |  | get-content   | |  getContent() - Get by type/slug          |
|  |  +---------------+ |                                           |
|  |  | search-content| |  searchContent() - Search content         |
|  |  +---------------+ |                                           |
|  +--------------------+                                           |
|                                                                   |
|  +--------------------+                                           |
|  | openai-adapter.ts  |  chatToolDefinitions, executeToolCall()   |
|  +--------------------+                                           |
|                                                                   |
+------------------------------------------------------------------+
          |                              |
          v                              v
+------------------+          +------------------+
|   MCP Server     |          |   Chat Service   |
|   (MCP SDK)      |          |   (OpenAI API)   |
|                  |          |                  |
| Wraps core with  |          | Wraps core with  |
| MCP response     |          | JSON response    |
| format           |          | format           |
+------------------+          +------------------+
          |                              |
          +---------------+--------------+
                          |
                          v
               +---------------------+
               | Content Repository  |
               +---------------------+
                          |
                          v
               +---------------------+
               |     Turso DB        |
               +---------------------+
```

**Key components:**

| File | Purpose |
|------|---------|
| `types.ts` | Shared types: `ToolResult<T>`, `ContentItem`, result types |
| `core/list-content.ts` | `listContent()` - List content by type with filters |
| `core/get-content.ts` | `getContent()` - Get single item by type and slug |
| `core/search-content.ts` | `searchContent()` - Search content by keywords |
| `openai-adapter.ts` | `chatToolDefinitions` (JSON Schema), `executeToolCall()` |

**Schema conversion:**

```typescript
// Zod schema in src/mcp/types.ts
export const ListContentInputSchema = z.object({
  type: z.enum(['project', 'experience', 'education', 'skill', 'about', 'contact']),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  limit: z.number().int().min(1).max(100).default(50),
})

// Converted to JSON Schema for OpenAI via zod-to-json-schema
import { zodToJsonSchema } from 'zod-to-json-schema'
const jsonSchema = zodToJsonSchema(ListContentInputSchema)
```

## Class Diagrams

### Repository Interfaces

```
                        <<interface>>
                    +---------------------+
                    |    Repository<T>    |
                    +---------------------+
                    | + findById(id)      |
                    | + findAll(filters)  |
                    | + create(data)      |
                    | + update(id, data)  |
                    | + delete(id)        |
                    | + count(filters)    |
                    +---------+-----------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
    <<interface>>                   <<interface>>
+---------------------+       +---------------------+
| ContentRepository   |       |   ChatRepository    |
+---------------------+       +---------------------+
| + findBySlug()      |       | + createSession()   |
| + search()          |       | + findSession()     |
| + getBundle()       |       | + updateActivity()  |
| + getHistory()      |       | + addMessage()      |
| + restoreVersion()  |       | + getMessages()     |
+---------+-----------+       +---------+-----------+
          |                             |
          v                             v
+---------------------+       +---------------------+
|DrizzleContentRepo   |       | DrizzleChatRepo     |
+---------------------+       +---------------------+
| - db: DrizzleClient |       | - db: DrizzleClient |
|                     |       |                     |
| + findById()        |       | + createSession()   |
| + findBySlug()      |       | + findSession()     |
| + create()          |       | + addMessage()      |
| + update()          |       | + getStats()        |
| ...                 |       | ...                 |
+---------------------+       +---------------------+
```

### Cache Provider Pattern

```
                        <<interface>>
                    +---------------------+
                    |    CacheProvider    |
                    +---------------------+
                    | + get<T>(key)       |
                    | + set(key, val, ttl)|
                    | + del(key)          |
                    | + incr(key, ttl)    |
                    | + decr(key)         |
                    | + getTokenBucket()  |
                    | + setTokenBucket()  |
                    | + ping()            |
                    | + close()           |
                    +---------+-----------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
+---------------------+       +---------------------+
|MemoryCacheProvider  |       | RedisCacheProvider  |
+---------------------+       +---------------------+
| - store: Map        |       | - client: Redis     |
| - cleanupInterval   |       | - isConnected       |
|                     |       |                     |
| + get<T>()          |       | + get<T>()          |
| + set()             |       | + set()             |
| + cleanup()         |       | + hgetall()         |
| ...                 |       | ...                 |
+---------------------+       +---------------------+

                    +---------------------+
                    |    CacheFactory     |
                    +---------------------+
                    | - instance: Cache   |
                    +---------------------+
                    | + getCache()        |--> Returns Redis if available
                    | + closeCache()      |    else Memory fallback
                    +---------------------+
```

### Error Class Hierarchy

```
                          +---------------+
                          |     Error     |
                          |   (builtin)   |
                          +-------+-------+
                                  |
                                  v
                          +---------------+
                          |   AppError    |
                          +---------------+
                          | + message     |
                          | + code        |
                          | + statusCode  |
                          | + isOperational|
                          +-------+-------+
                                  |
          +-----------+-----------+-----------+-----------+
          |           |           |           |           |
          v           v           v           v           v
   +------------+ +------------+ +------------+ +------------+ +------------+
   |Validation  | | NotFound   | | RateLimit  | |   LLM      | |Unauthorized|
   |   Error    | |   Error    | |   Error    | |   Error    | |   Error    |
   +------------+ +------------+ +------------+ +------------+ +------------+
   | + fields   | |            | |+ retryAfter| | + provider | |            |
   |            | |            | |            | |            | |            |
   | code: 400  | | code: 404  | | code: 429  | | code: 502  | | code: 401  |
   +------------+ +------------+ +------------+ +------------+ +------------+
```

### Event System

```
+-------------------------------------------------------------------------+
|                              EventMap                                    |
|  (TypeScript interface defining all event types and payloads)            |
+-------------------------------------------------------------------------+
|  'content:created'  -> { id, type, slug, version }                       |
|  'content:updated'  -> { id, type, version, previousVersion, ... }       |
|  'content:deleted'  -> { id, type, hard }                                |
|  'content:restored' -> { id, type, fromVersion, toVersion }              |
|  'chat:session_started' -> { sessionId, visitorId, ipHash }              |
|  'chat:message_sent'    -> { sessionId, messageId, role, tokensUsed }    |
|  'chat:session_ended'   -> { sessionId, messageCount, totalTokens }      |
|  'chat:rate_limited'    -> { ipHash, sessionId }                         |
|  'circuit:state_changed' -> { name, previousState, newState }            |
|  'cache:invalidated'     -> { pattern, reason }                          |
|  'admin:action'          -> { action, resourceType, resourceId, ... }    |
+------------------------------------+------------------------------------+
                                    |
                                    v
                    +-------------------------------+
                    |       TypedEventEmitter       |
                    +-------------------------------+
                    | - emitter: EventEmitter       |
                    +-------------------------------+
                    | + emit<K>(event, data)        |  Type-safe emit
                    | + on<K>(event, handler)       |  Type-safe subscribe
                    | + off<K>(event, handler)      |  Unsubscribe
                    | + listenerCount<K>(event)     |
                    +-------------------------------+
                                    |
                                    v
                    +-------------------------------+
                    |         Event Handlers        |
                    +-------------------------------+
                    | - Metrics tracking            |
                    | - Cache invalidation          |
                    | - Audit logging               |
                    | - (Future: Webhooks)          |
                    +-------------------------------+
```

## Database Design

### Entity Relationship Diagram

```
+-----------------------------+       +-----------------------------+
|          content            |       |      content_history        |
+-----------------------------+       +-----------------------------+
| PK id          TEXT         |       | PK id          TEXT         |
|    type        TEXT    NN   |<------| FK content_id  TEXT    NN   |
|    slug        TEXT         |       |    version     INTEGER NN   |
|    data        JSON    NN   |       |    data        JSON    NN   |
|    status      TEXT         |       |    change_type TEXT    NN   |
|    version     INTEGER      |       |    changed_by  TEXT         |
|    sort_order  INTEGER      |       |    change_summary TEXT      |
|    created_at  TIMESTAMP    |       |    created_at  TIMESTAMP    |
|    updated_at  TIMESTAMP    |       +-----------------------------+
|    deleted_at  TIMESTAMP    |
+-----------------------------+       Indexes:
| IDX content_type_idx        |       - content_history_version_idx
| UNQ content_type_slug_idx   |       - content_history_content_idx
| IDX content_deleted_idx     |       - content_history_type_idx
+-----------------------------+


+-----------------------------+       +-----------------------------+
|       chat_sessions         |       |       chat_messages         |
+-----------------------------+       +-----------------------------+
| PK id          TEXT         |       | PK id          TEXT         |
|    visitor_id  TEXT    NN   |<------| FK session_id  TEXT    NN   |
|    ip_hash     TEXT         |       |    role        TEXT    NN   |
|    user_agent  TEXT         |       |    content     TEXT    NN   |
|    message_count INTEGER    |       |    tokens_used INTEGER      |
|    status      TEXT         |       |    model       TEXT         |
|    started_at  TIMESTAMP    |       |    created_at  TIMESTAMP    |
|    last_active_at TIMESTAMP |       +-----------------------------+
|    expires_at  TIMESTAMP    |
+-----------------------------+       Indexes:
| IDX chat_sessions_visitor   |       - chat_messages_session_idx
| IDX chat_sessions_ip_hash   |
| IDX chat_sessions_expires   |
+-----------------------------+


Relationships:
  content --------< content_history    (1:N, cascade delete)
  chat_sessions --< chat_messages      (1:N, cascade delete)
```

## Sequence Diagrams

### Content Bundle Request (Cache Hit)

```
+--------+          +---------+          +---------+          +---------+
| Client |          |  Route  |          | Service |          |  Cache  |
+---+----+          +----+----+          +----+----+          +----+----+
    |                    |                    |                    |
    | GET /api/v1/       |                    |                    |
    | content/bundle     |                    |                    |
    | If-None-Match: "x" |                    |                    |
    |------------------->|                    |                    |
    |                    |                    |                    |
    |                    | getBundle()        |                    |
    |                    |------------------->|                    |
    |                    |                    |                    |
    |                    |                    | get("content:      |
    |                    |                    |     bundle")       |
    |                    |                    |------------------->|
    |                    |                    |                    |
    |                    |                    |    cached data     |
    |                    |                    |<-------------------|
    |                    |                    |                    |
    |                    |    bundle data     |                    |
    |                    |<-------------------|                    |
    |                    |                    |                    |
    |                    | generateETag()     |                    |
    |                    | compare with       |                    |
    |                    | If-None-Match      |                    |
    |                    |                    |                    |
    |    304 Not         |                    |                    |
    |    Modified        |                    |                    |
    |<-------------------|                    |                    |
    |                    |                    |                    |
```

### Chat Message Flow (Full)

```
+--------+     +---------+     +---------+     +---------+     +---------+     +---------+     +---------+
| Client |     |  Route  |     |RateLim  |     |ChatSvc  |     |Obfusc   |     |Circuit  |     |   LLM   |
+---+----+     +----+----+     +----+----+     +----+----+     +----+----+     +----+----+     +----+----+
    |               |               |               |               |               |               |
    | POST /chat    |               |               |               |               |               |
    | {message}     |               |               |               |               |               |
    |-------------->|               |               |               |               |               |
    |               |               |               |               |               |               |
    |               | consume(ip)   |               |               |               |               |
    |               |-------------->|               |               |               |               |
    |               |               |               |               |               |               |
    |               | {allowed:true}|               |               |               |               |
    |               |<--------------|               |               |               |               |
    |               |               |               |               |               |               |
    |               | processMsg()  |               |               |               |               |
    |               |------------------------------>|               |               |               |
    |               |               |               |               |               |               |
    |               |               |               | obfuscate()   |               |               |
    |               |               |               |-------------->|               |               |
    |               |               |               |               |               |               |
    |               |               |               | obfuscated    |               |               |
    |               |               |               |<--------------|               |               |
    |               |               |               |               |               |               |
    |               |               |               | execute()     |               |               |
    |               |               |               |------------------------------>|               |
    |               |               |               |               |               |               |
    |               |               |               |               | isAvailable() |               |
    |               |               |               |               |-------------->|               |
    |               |               |               |               |               |               |
    |               |               |               |               |    true       |               |
    |               |               |               |               |<--------------|               |
    |               |               |               |               |               |               |
    |               |               |               |               | chat()        |               |
    |               |               |               |               |------------------------------>|
    |               |               |               |               |               |               |
    |               |               |               |               |   response    |               |
    |               |               |               |               |<------------------------------|
    |               |               |               |               |               |               |
    |               |               |               |               |recordSuccess()|               |
    |               |               |               |               |-------------->|               |
    |               |               |               |               |               |               |
    |               |               |               | response      |               |               |
    |               |               |               |<------------------------------|               |
    |               |               |               |               |               |               |
    |               |               |               | deobfuscate() |               |               |
    |               |               |               |-------------->|               |               |
    |               |               |               |               |               |               |
    |               |               |               | deobfuscated  |               |               |
    |               |               |               |<--------------|               |               |
    |               |               |               |               |               |               |
    |               |               |               | emit events   |               |               |
    |               |               |               |--------------> (async)        |               |
    |               |               |               |               |               |               |
    |               |   response    |               |               |               |               |
    |               |<------------------------------|               |               |               |
    |               |               |               |               |               |               |
    |  200 OK       |               |               |               |               |               |
    |  {sessionId,  |               |               |               |               |               |
    |   message}    |               |               |               |               |               |
    |<--------------|               |               |               |               |               |
    |               |               |               |               |               |               |
```

### Content Versioning Transaction Flow

```
                    CONTENT UPDATE WITH VERSIONING

+--------+     +---------+     +---------+     +---------+     +---------+
| Admin  |     |  Route  |     | Service |     |  Repo   |     |   DB    |
| Client |     |         |     |         |     |         |     | (Turso) |
+---+----+     +----+----+     +----+----+     +----+----+     +----+----+
    |               |               |               |               |
    | PUT /admin/   |               |               |               |
    | content/:id   |               |               |               |
    | + Idempotency |               |               |               |
    |   -Key        |               |               |               |
    |-------------->|               |               |               |
    |               |               |               |               |
    |               | check         |               |               |
    |               | idempotency   |               |               |
    |               |-------------->|               |               |
    |               |               |               |               |
    |               | update()      |               |               |
    |               |-------------->|               |               |
    |               |               |               |               |
    |               |               | updateWithHistory()           |
    |               |               |-------------->|               |
    |               |               |               |               |
    |               |               |               | BEGIN         |
    |               |               |               | TRANSACTION   |
    |               |               |               |-------------->|
    |               |               |               |               |
    |               |               |               | 1. SELECT     |
    |               |               |               |    current    |
    |               |               |               |    content    |
    |               |               |               |-------------->|
    |               |               |               |               |
    |               |               |               |    current    |
    |               |               |               |    row        |
    |               |               |               |<--------------|
    |               |               |               |               |
    |               |               |               | 2. INSERT     |
    |               |               |               |    INTO       |
    |               |               |               |    content_   |
    |               |               |               |    history    |
    |               |               |               |-------------->|
    |               |               |               |               |
    |               |               |               | 3. UPDATE     |
    |               |               |               |    content    |
    |               |               |               |    SET data,  |
    |               |               |               |    version++  |
    |               |               |               |-------------->|
    |               |               |               |               |
    |               |               |               | COMMIT        |
    |               |               |               |-------------->|
    |               |               |               |               |
    |               |               |  updated row  |               |
    |               |               |<--------------|               |
    |               |               |               |               |
    |               |               | emit('content:updated')       |
    |               |               |--------------> Event Bus      |
    |               |               |               |               |
    |               |  updated row  |               |               |
    |               |<--------------|               |               |
    |               |               |               |               |
    |               | cache         |               |               |
    |               | idempotency   |               |               |
    |               | response      |               |               |
    |               |               |               |               |
    |  200 OK       |               |               |               |
    |  {content}    |               |               |               |
    |<--------------|               |               |               |
    |               |               |               |               |


                         Event Handlers (Async)
                                    |
                    +---------------+---------------+
                    |               |               |
                    v               v               v
              +---------+    +---------+    +---------+
              | Cache   |    | Metrics |    |  Audit  |
              |Invalidate|   | Update  |    |   Log   |
              +---------+    +---------+    +---------+
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
                       RESTORE PREVIOUS VERSION

+--------+     +---------+     +---------+     +---------+
| Admin  |     | Service |     |  Repo   |     |   DB    |
+---+----+     +----+----+     +----+----+     +----+----+
    |               |               |               |
    | POST /content |               |               |
    | /:id/restore  |               |               |
    | {version: 3}  |               |               |
    |-------------->|               |               |
    |               |               |               |
    |               | 1. Get target version         |
    |               | from history                  |
    |               |-------------->|               |
    |               |               |-------------->|
    |               |               |<--------------|
    |               |               |               |
    |               | 2. Call updateWithHistory()   |
    |               |    using history.data         |
    |               |-------------->|               |
    |               |               |               |
    |               |               | [transaction] |
    |               |               | - archive     |
    |               |               |   current     |
    |               |               | - restore     |
    |               |               |   old data    |
    |               |               | - version++   |
    |               |               |-------------->|
    |               |               |               |
    |               |<--------------|               |
    |               |               |               |
    |  200 OK       |               |               |
    |  {restored}   |               |               |
    |<--------------|               |               |
    |               |               |               |


  Version Timeline:

  v1        v2        v3        v4 (current)    v5 (after restore)
   |         |         |              |               |
   o---------o---------o--------------o---------------o
   |         |         |              |               |
 create   update    update       update         restore v3
                      ^                               |
                      +-------------------------------+
                            data copied from v3
```

### Circuit Breaker State Transitions

```
                       CIRCUIT BREAKER STATE MACHINE

                              +---------------------+
                              |                     |
                              |       CLOSED        |<------------------------+
                              |                     |                         |
                              |  - Allow all calls  |                         |
                              |  - Count failures   |                         |
                              |                     |                         |
                              +----------+----------+                         |
                                         |                                    |
                                         | failures >= threshold              |
                                         |                                    |
                                         v                                    |
                              +---------------------+                         |
                              |                     |                         |
                              |        OPEN         |                         |
                              |                     |                         |
                              |  - Reject all calls |                         |
                              |  - Return error     |                         |
                              |  - Start timer      |                         |
                              |                     |                         |
                              +----------+----------+                         |
                                         |                                    |
                                         | timeout elapsed                    |
                                         |                                    |
                                         v                                    |
                              +---------------------+                         |
                              |                     |                         |
                              |     HALF_OPEN       |-------------------------+
                              |                     |      success >= threshold
                              |  - Allow limited    |
                              |  - Test if healthy  |
                              |                     |
                              +----------+----------+
                                         |
                                         | any failure
                                         |
                                         v
                              +---------------------+
                              |        OPEN         |
                              +---------------------+


Configuration:
  - failureThreshold: 5       (failures before opening)
  - resetTimeout: 30000ms     (time before trying half-open)
  - halfOpenMaxAttempts: 2    (successes needed to close)
```

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

## Testing Strategy

### Test Pyramid

```
                    +-------------+
                    |    E2E      |  Few, slow, high confidence
                    |   Tests     |  (~5% of tests)
                    +------+------+
                           |
                    +------+------+
                    | Integration |  Some, moderate speed
                    |   Tests     |  (~25% of tests)
                    +------+------+
                           |
              +------------+------------+
              |       Unit Tests        |  Many, fast, isolated
              |                         |  (~70% of tests)
              +-------------------------+
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
                         DATABASE TEST STRATEGY

  Unit Tests                Integration Tests              E2E Tests
       |                           |                            |
       v                           v                            v
  +---------+               +-------------+              +-------------+
  |  Mocked |               | In-Memory   |              | Test Turso  |
  |  Repos  |               |   SQLite    |              |  Database   |
  +---------+               +-------------+              +-------------+
       |                           |                            |
  No real DB               libsql :memory:               Separate DB
  Fast, isolated           Real SQL, fast                Full fidelity
```

> See `tests/` directory for implementation examples including mocks, fixtures, and test utilities.

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
