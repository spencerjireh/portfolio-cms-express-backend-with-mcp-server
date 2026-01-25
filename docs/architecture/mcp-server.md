# MCP Server Integration

## Overview

The portfolio backend exposes a **Model Context Protocol (MCP)** server, enabling AI assistants like Claude Desktop to interact with portfolio content programmatically. This allows AI tools to:

- Query portfolio projects and content
- Understand the portfolio owner's skills and experience
- Answer questions about the portfolio with accurate, up-to-date information

## What is MCP?

Model Context Protocol is an open standard for connecting AI assistants to external data sources and tools. Instead of copy-pasting content into chat, MCP allows AI to directly query structured data.

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Claude Desktop │◀──MCP──▶│  MCP Server     │◀───────▶│  Portfolio DB   │
│  or other AI    │         │  (stdio/SSE)    │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Architecture

The MCP server runs as a separate process or can be embedded in the main Express application:

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Server                                │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Tools     │  │  Resources  │  │      Prompts            │ │
│  │             │  │             │  │                         │ │
│  │ search_     │  │ portfolio:// │ │ summarize_portfolio    │ │
│  │   projects  │  │   projects  │  │ explain_project        │ │
│  │ get_project │  │   skills    │  │ compare_skills         │ │
│  │ list_skills │  │   experience│  │                         │ │
│  │ get_contact │  │   about     │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│                 ┌─────────────────────┐                         │
│                 │   Content Service   │                         │
│                 │   (shared with API) │                         │
│                 └─────────────────────┘                         │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │   Turso DB      │
                    └─────────────────┘
```

## Tools

Tools are functions that AI can call to perform actions or retrieve specific data.

### `search_projects`

Search portfolio projects by keyword, tag, or technology.

```typescript
interface SearchProjectsInput {
  query?: string        // Full-text search in title/description
  tags?: string[]       // Filter by tags
  featured?: boolean    // Only featured projects
  limit?: number        // Max results (default: 10)
}

interface SearchProjectsOutput {
  projects: Array<{
    slug: string
    title: string
    description: string
    tags: string[]
    featured: boolean
  }>
  total: number
}
```

**Example invocation:**
```
User: "What projects use TypeScript?"
AI calls: search_projects({ tags: ["typescript"] })
```

### `get_project`

Get detailed information about a specific project.

```typescript
interface GetProjectInput {
  slug: string          // Project identifier
}

interface GetProjectOutput {
  slug: string
  title: string
  description: string
  content: string       // Full markdown content
  tags: string[]
  links: {
    github?: string
    live?: string
    demo?: string
  }
  featured: boolean
}
```

### `list_skills`

Get all skills grouped by category.

```typescript
interface ListSkillsInput {
  category?: 'language' | 'framework' | 'tool' | 'soft'
}

interface ListSkillsOutput {
  skills: Array<{
    name: string
    category: string
    proficiency: 1 | 2 | 3 | 4 | 5
    icon?: string
  }>
}
```

### `get_experience`

Get work experience history.

```typescript
interface GetExperienceInput {
  current_only?: boolean    // Only current positions
}

interface GetExperienceOutput {
  positions: Array<{
    company: string
    role: string
    description: string
    startDate: string
    endDate: string | null  // null = current
    skills: string[]
  }>
}
```

### `get_contact`

Get contact information and social links.

```typescript
interface GetContactOutput {
  name: string
  title: string
  email: string
  social: Record<string, string>
}
```

## Resources

Resources are URIs that AI can read to get content. Unlike tools, resources are read-only and follow a URI pattern.

| URI | Description | Returns |
|-----|-------------|---------|
| `portfolio://projects` | All published projects | JSON array of projects |
| `portfolio://projects/{slug}` | Single project | Project detail JSON |
| `portfolio://skills` | Skills list | Grouped skills JSON |
| `portfolio://experience` | Work history | Experience array JSON |
| `portfolio://about` | About page content | Page content JSON |
| `portfolio://config` | Site configuration | Config JSON |

**Example resource read:**
```
AI reads: portfolio://projects/portfolio-backend
Returns: { slug: "portfolio-backend", title: "Portfolio Backend", ... }
```

## Prompts

Pre-defined prompt templates for common use cases.

### `summarize_portfolio`

Generate a summary of the entire portfolio suitable for a specific audience.

```typescript
interface SummarizePortfolioInput {
  audience: 'recruiter' | 'technical' | 'general'
  max_length?: number
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
  required_skills: string[]
  nice_to_have?: string[]
}
```

## Configuration

### Claude Desktop Setup

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "portfolio": {
      "command": "node",
      "args": ["/path/to/portfolio-backend/dist/mcp/server.js"],
      "env": {
        "TURSO_DATABASE_URL": "libsql://...",
        "TURSO_AUTH_TOKEN": "..."
      }
    }
  }
}
```

### SSE Transport (Web-based clients)

For web-based MCP clients, the server exposes an SSE endpoint:

```
GET /mcp/sse
Headers:
  Accept: text/event-stream
  X-Admin-Key: <optional, for admin tools>
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MCP_TRANSPORT` | `stdio` or `sse` | No (default: stdio) |
| `MCP_ADMIN_ENABLED` | Enable admin tools | No (default: false) |
| `TURSO_DATABASE_URL` | Database connection | Yes |
| `TURSO_AUTH_TOKEN` | Database auth | Yes |

## Admin Tools (Optional)

When `MCP_ADMIN_ENABLED=true` and valid admin key is provided:

### `create_content`

Create new content items.

### `update_content`

Update existing content.

### `publish_content`

Change content status from draft to published.

**Security Note:** Admin tools require the same `X-Admin-Key` authentication as the REST API. Never expose admin tools in public MCP configurations.

## Integration with REST API

The MCP server shares the same data layer as the REST API:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application                                 │
│                                                                  │
│  ┌─────────────────┐              ┌─────────────────┐          │
│  │   REST API      │              │   MCP Server    │          │
│  │   (Express)     │              │   (MCP SDK)     │          │
│  └────────┬────────┘              └────────┬────────┘          │
│           │                                │                     │
│           └───────────────┬───────────────┘                     │
│                           ▼                                      │
│                 ┌─────────────────────┐                         │
│                 │   Content Service   │                         │
│                 │                     │                         │
│                 │ - getAll()          │                         │
│                 │ - getBySlug()       │                         │
│                 │ - getBundle()       │                         │
│                 │ - search()          │                         │
│                 └─────────────────────┘                         │
│                           │                                      │
│                           ▼                                      │
│                 ┌─────────────────────┐                         │
│                 │ Content Repository  │                         │
│                 └─────────────────────┘                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

This ensures:
- Consistent data access
- Shared caching
- Unified event emission
- Single source of truth

## Error Handling

MCP errors follow the protocol specification:

```typescript
interface MCPError {
  code: number
  message: string
  data?: unknown
}
```

| Code | Meaning |
|------|---------|
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32001 | Resource not found |
| -32002 | Unauthorized |

## Example Session

```
Human: What TypeScript projects does this portfolio have?

[Claude calls search_projects({ tags: ["typescript"] })]

Claude: Based on the portfolio, there are 3 TypeScript projects:

1. **Portfolio Backend** - A full-featured Express API with content management...
2. **Task Manager CLI** - A command-line task manager with local SQLite...
3. **React Dashboard** - An admin dashboard using TypeScript and React Query...

Would you like more details about any of these?
```

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
