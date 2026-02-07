---
title: MCP Server & AI Tools
description: Model Context Protocol server and chat tool integration
---

# MCP Server & AI Tools

## Overview

The portfolio backend provides AI tools through two interfaces:

1. **MCP Server** -- a standalone [Model Context Protocol](https://modelcontextprotocol.io/) server for AI assistants like Claude Desktop. Supports 6 tools (read + write).
2. **Chat Service** -- an OpenAI function-calling integration that gives the chat endpoint access to the 3 read-only tools.

Both share the same core tool implementations in `src/tools/core/`, ensuring consistent behavior.

```mermaid
flowchart TB
    subgraph SharedTools["Shared Tools Layer (src/tools/core/)"]
        List["listContent()"]
        Get["getContent()"]
        Search["searchContent()"]
    end

    MCP["MCP Server\n6 tools (read + write)\nMCP SDK response format"]
    Chat["Chat Service\n3 tools (read only)\nOpenAI function calling"]

    SharedTools --> MCP
    SharedTools --> Chat
```

## Content Types

All tools operate on the unified content model:

| Type | Description |
|------|-------------|
| `project` | Portfolio projects with title, description, tags, links |
| `experience` | Work experience history |
| `education` | Educational background |
| `skill` | Skills grouped by category |
| `about` | About page content |
| `contact` | Contact information and social links |

See [Content Model Reference](/architecture/content-model) for detailed data schemas.

---

## Shared Read Tools

These 3 tools are available in both the MCP server and the chat service.

### `list_content`

List content items by type with optional status filter.

```typescript
interface ListContentInput {
  type: 'project' | 'experience' | 'education' | 'skill' | 'about' | 'contact'
  status?: 'draft' | 'published' | 'archived'  // default: 'published'
  limit?: number                                // default: 50, max: 100
}

interface ListContentOutput {
  items: Array<{
    id: string
    slug: string
    type: string
    data: Record<string, unknown>
    status: string
    version: number
    sortOrder: number
    createdAt: string
    updatedAt: string
  }>
}
```

**Example invocation:**
```
User: "Show me all published projects"
AI calls: list_content({ type: "project", status: "published" })
```

### `get_content`

Get a single content item by type and slug.

```typescript
interface GetContentInput {
  type: 'project' | 'experience' | 'education' | 'skill' | 'about' | 'contact'
  slug: string
}

interface GetContentOutput {
  id: string
  slug: string
  type: string
  data: Record<string, unknown>
  status: string
  version: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}
```

**Example invocation:**
```
User: "Tell me about the portfolio-backend project"
AI calls: get_content({ type: "project", slug: "portfolio-backend" })
```

### `search_content`

Search content by query across title, description, name, and other text fields.

```typescript
interface SearchContentInput {
  query: string                                  // Search query
  type?: 'project' | 'experience' | 'education' | 'skill' | 'about' | 'contact'
  limit?: number                                 // default: 10, max: 50
}

interface SearchContentOutput {
  items: Array<{
    id: string
    slug: string
    type: string
    data: Record<string, unknown>
    status: string
  }>
}
```

**Example invocation:**
```
User: "What projects use TypeScript?"
AI calls: search_content({ query: "typescript", type: "project" })
```

---

## MCP-Only Write Tools

These tools are only available through the MCP server (not in chat).

### `create_content`

Create new content with type-specific data validation.

```typescript
interface CreateContentInput {
  type: 'project' | 'experience' | 'education' | 'skill' | 'about' | 'contact'
  slug?: string                                  // Auto-generated from title/name if not provided
  data: Record<string, unknown>                  // Must match type-specific schema
  status?: 'draft' | 'published' | 'archived'   // default: 'draft'
  sortOrder?: number                             // default: 0
}
```

### `update_content`

Update existing content with version history tracking.

```typescript
interface UpdateContentInput {
  id: string                                     // Content ID to update
  slug?: string
  data?: Record<string, unknown>
  status?: 'draft' | 'published' | 'archived'
  sortOrder?: number
}
```

### `delete_content`

Soft delete content (can be restored later).

```typescript
interface DeleteContentInput {
  id: string                                     // Content ID to delete
}
```

---

## MCP Resources

Resources are URIs that AI can read to get content. Unlike tools, resources are read-only and follow a URI pattern.

| URI | Description | Returns |
|-----|-------------|---------|
| `portfolio://content` | All published content | JSON array of all content items |
| `portfolio://content/{type}` | Content by type | JSON array of content for specified type |
| `portfolio://content/{type}/{slug}` | Single content item | Full content item JSON |

**Supported types in URI:**
- `portfolio://content/project`
- `portfolio://content/experience`
- `portfolio://content/education`
- `portfolio://content/skill`
- `portfolio://content/about`
- `portfolio://content/contact`

## MCP Prompts

Pre-defined prompt templates for common use cases.

### `summarize_portfolio`

Generate a summary of the entire portfolio suitable for a specific audience.

```typescript
interface SummarizePortfolioInput {
  audience: 'recruiter' | 'technical' | 'general'
}
```

### `explain_project`

Explain a project's technical decisions and architecture.

```typescript
interface ExplainProjectInput {
  slug: string
  depth: 'overview' | 'detailed' | 'deep-dive'
}
```

### `compare_skills`

Compare the portfolio owner's skills to a job requirement.

```typescript
interface CompareSkillsInput {
  requiredSkills: string[]
  niceToHave?: string[]
}
```

---

## Chat Integration

The chat service (`POST /api/v1/chat`) uses OpenAI function calling to give the AI assistant access to the same 3 read tools. The chat service also includes:

- **Input guardrails** -- validates and sanitizes user messages before sending to the LLM
- **Output guardrails** -- checks LLM responses for PII leakage before returning to the user
- **PII sanitization** -- LLM responses are checked for PII and redacted before returning to the user

### Tool Call Flow

```mermaid
flowchart TD
    A[1. User sends message] --> B[2. Input guardrails check]
    B -->|Blocked| F2[Return guardrail response]
    B -->|Passed| C[3. Build conversation + system prompt]
    C --> D[4. Call LLM with tools]
    D --> E{LLM decides}

    E -->|tool_call| G[5. Execute tool]
    E -->|response| H[6. Output guardrails check]

    G --> I[7. Add tool result to history]
    I --> J{Iteration < 5?}
    J -->|Yes| D
    J -->|No| H

    H -->|Passed| F[Return to user]
    H -->|PII detected| F3[Return sanitized response]
```

### Sequence Diagram

```mermaid
sequenceDiagram
    participant Client
    participant ChatSvc as Chat Service
    participant LLM
    participant Tools

    Client->>ChatSvc: POST /chat "What projects use React?"
    ChatSvc->>ChatSvc: Input guardrails
    ChatSvc->>LLM: messages + tools
    LLM-->>ChatSvc: tool_call: search_content {query: "react"}
    ChatSvc->>Tools: search_content({query: "react"})
    Tools-->>ChatSvc: [{slug: "portfolio", data: {tags: ["react"]}}]
    ChatSvc->>LLM: messages + tool_result
    LLM-->>ChatSvc: "I found 2 React projects..."
    ChatSvc->>ChatSvc: Output guardrails
    ChatSvc-->>Client: {message: "I found 2 React..."}
```

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_TOOL_ITERATIONS` | 5 | Maximum tool call rounds per request |

---

## Configuration

### Claude Desktop Setup

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "portfolio": {
      "command": "bun",
      "args": ["run", "mcp"],
      "cwd": "/path/to/portfolio-backend",
      "env": {
        "TURSO_DATABASE_URL": "libsql://...",
        "TURSO_AUTH_TOKEN": "..."
      }
    }
  }
}
```

Restart Claude Desktop to activate the integration.

### SSE Transport (Web-based clients)

For web-based MCP clients, the server exposes an SSE endpoint:

```
GET /mcp/sse
Headers:
  Accept: text/event-stream
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MCP_TRANSPORT` | `stdio` or `sse` | No (default: stdio) |
| `TURSO_DATABASE_URL` | Database connection | Yes |
| `TURSO_AUTH_TOKEN` | Database auth | Yes |
| `ADMIN_API_KEY` | For write operations | For admin tools |
| `LLM_API_KEY` | LLM provider API key | For chat only |
| `LLM_MODEL` | Model to use | No (default: `gpt-4o-mini`) |
| `LLM_MAX_TOKENS` | Maximum response tokens | No (default: `500`) |
| `LLM_TEMPERATURE` | Response temperature | No (default: `0.7`) |

## Shared Architecture

The MCP server shares the same data layer as the REST API:

```mermaid
flowchart TB
    subgraph App["Application"]
        REST["REST API (Express)"]
        MCP["MCP Server (MCP SDK)"]
        Chat["Chat Service (OpenAI)"]

        REST --> Repo
        MCP --> Repo
        Chat --> Repo

        Repo["Content Repository"]
    end

    Repo --> DB[(Turso DB)]
```

This ensures consistent data access, shared validation schemas, and version history tracking.

**Schema conversion** for OpenAI function calling:

```typescript
// Zod schemas are converted to JSON Schema for OpenAI via zod-to-json-schema
import { zodToJsonSchema } from 'zod-to-json-schema'
const jsonSchema = zodToJsonSchema(ListContentInputSchema)
```

See [ADR-008: Shared Tools Architecture](/decisions/008-shared-tools-architecture) for the full decision record.

## Error Handling

MCP errors follow the protocol specification:

| Code | Meaning |
|------|---------|
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32001 | Resource not found |
| -32002 | Validation failed |

## Example Session

```
Human: What TypeScript projects does this portfolio have?

[Claude calls search_content({ query: "typescript", type: "project" })]

Claude: Based on the portfolio, there are 3 TypeScript projects:

1. **Portfolio Backend** - A full-featured Express API with content management...
2. **Task Manager CLI** - A command-line task manager with local SQLite...
3. **React Dashboard** - An admin dashboard using TypeScript and React Query...

Would you like more details about any of these?
```
