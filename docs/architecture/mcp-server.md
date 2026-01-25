# MCP Server Integration

## Overview

The portfolio backend exposes a **Model Context Protocol (MCP)** server, enabling AI assistants like Claude Desktop to interact with portfolio content programmatically. This allows AI tools to:

- Query portfolio projects and content
- Understand the portfolio owner's skills and experience
- Answer questions about the portfolio with accurate, up-to-date information
- Create, update, and delete content (with proper authentication)

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
│  │  (Generic)  │  │  (Generic)  │  │   (Specialized)         │ │
│  │             │  │             │  │                         │ │
│  │ list_content│  │ portfolio://│  │ summarize_portfolio    │ │
│  │ get_content │  │   content   │  │ explain_project        │ │
│  │ search_     │  │   content/  │  │ compare_skills         │ │
│  │   content   │  │    {type}   │  │                         │ │
│  │ create_     │  │   content/  │  │                         │ │
│  │   content   │  │  {type}/    │  │                         │ │
│  │ update_     │  │   {slug}    │  │                         │ │
│  │   content   │  │             │  │                         │ │
│  │ delete_     │  │             │  │                         │ │
│  │   content   │  │             │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│                 ┌─────────────────────┐                         │
│                 │ Content Repository  │                         │
│                 │   (shared with API) │                         │
│                 └─────────────────────┘                         │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │   Turso DB      │
                    └─────────────────┘
```

## Content Types

All tools and resources operate on the unified content model with these types:

| Type | Description |
|------|-------------|
| `project` | Portfolio projects with title, description, tags, links |
| `experience` | Work experience history |
| `education` | Educational background |
| `skill` | Skills grouped by category |
| `about` | About page content |
| `contact` | Contact information and social links |

## Tools

Tools are functions that AI can call to perform actions or retrieve specific data. The MCP server provides 6 generic tools that work with any content type.

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

interface CreateContentOutput {
  success: boolean
  content: {
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
}
```

**Example invocation:**
```
User: "Create a new project called 'My New App'"
AI calls: create_content({
  type: "project",
  data: {
    title: "My New App",
    description: "A new application",
    tags: ["typescript", "react"]
  }
})
```

### `update_content`

Update existing content with version history tracking.

```typescript
interface UpdateContentInput {
  id: string                                     // Content ID to update
  slug?: string                                  // New slug
  data?: Record<string, unknown>                 // Updated data (validated against type schema)
  status?: 'draft' | 'published' | 'archived'
  sortOrder?: number
}

interface UpdateContentOutput {
  success: boolean
  content: {
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
}
```

**Example invocation:**
```
User: "Update the project description"
AI calls: update_content({
  id: "content_abc123",
  data: { ...existingData, description: "Updated description" }
})
```

### `delete_content`

Soft delete content (can be restored later).

```typescript
interface DeleteContentInput {
  id: string                                     // Content ID to delete
}

interface DeleteContentOutput {
  success: boolean
  message: string
  id: string
}
```

**Example invocation:**
```
User: "Delete the old project"
AI calls: delete_content({ id: "content_abc123" })
```

## Resources

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

**Example resource reads:**
```
AI reads: portfolio://content/project
Returns: [{ slug: "portfolio-backend", ... }, { slug: "task-manager", ... }]

AI reads: portfolio://content/project/portfolio-backend
Returns: { id: "...", slug: "portfolio-backend", title: "Portfolio Backend", ... }
```

## Prompts

Pre-defined prompt templates for common use cases. These are specialized by design to provide optimal responses for specific scenarios.

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

## Data Schemas

Content data is validated against type-specific schemas:

### Project Data
```typescript
interface ProjectData {
  title: string
  description: string
  content?: string
  tags: string[]
  links?: {
    github?: string
    live?: string
    demo?: string
  }
  coverImage?: string
  featured: boolean
}
```

### Skills List Data
```typescript
interface SkillsListData {
  items: Array<{
    name: string
    category: 'language' | 'framework' | 'tool' | 'soft'
    icon?: string
    proficiency?: 1 | 2 | 3 | 4 | 5
  }>
}
```

### Experience List Data
```typescript
interface ExperienceListData {
  items: Array<{
    company: string
    role: string
    description?: string
    startDate: string      // YYYY-MM format
    endDate: string | null // null = current
    location?: string
    type?: 'full-time' | 'part-time' | 'contract' | 'freelance'
    skills: string[]
  }>
}
```

### Education List Data
```typescript
interface EducationListData {
  items: Array<{
    institution: string
    degree: string
    field?: string
    startDate: string      // YYYY-MM format
    endDate: string | null
    location?: string
    gpa?: string
    highlights?: string[]
  }>
}
```

### Page Data (About)
```typescript
interface PageData {
  title: string
  content: string
  image?: string
}
```

### Site Config Data (Contact)
```typescript
interface SiteConfigData {
  name: string
  title: string
  email: string
  social: Record<string, string>
  chatEnabled: boolean
  chatSystemPrompt?: string
}
```

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
│                 │ Content Repository  │                         │
│                 │                     │                         │
│                 │ - findAll()         │                         │
│                 │ - findBySlug()      │                         │
│                 │ - findPublished()   │                         │
│                 │ - create()          │                         │
│                 │ - updateWithHistory()│                        │
│                 │ - delete()          │                         │
│                 └─────────────────────┘                         │
│                           │                                      │
│                           ▼                                      │
│                 ┌─────────────────────┐                         │
│                 │     Turso DB        │                         │
│                 └─────────────────────┘                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

This ensures:
- Consistent data access
- Shared validation schemas
- Version history tracking
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