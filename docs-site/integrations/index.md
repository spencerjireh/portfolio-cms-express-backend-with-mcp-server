---
title: Integrations Overview
description: Guide to integrating with the Portfolio Backend
---

# Integrations Overview

The Portfolio Backend provides multiple integration points for different use cases.

## Integration Options

| Integration | Description | Use Case |
|-------------|-------------|----------|
| [MCP Server](/integrations/mcp-server) | Model Context Protocol | AI assistants (Claude, etc.) |
| [Frontend](/integrations/frontend) | REST API client | Web applications |

## MCP Server

The Model Context Protocol (MCP) server enables AI assistants like Claude Desktop to interact with portfolio content directly.

**Features:**
- Query projects and content
- Search by keyword
- Create, update, delete content (with auth)
- Pre-defined prompts for common tasks

**Quick Setup:**

```json
{
  "mcpServers": {
    "portfolio": {
      "command": "bun",
      "args": ["run", "mcp"],
      "cwd": "/path/to/portfolio-backend"
    }
  }
}
```

[Learn more about MCP integration](/integrations/mcp-server)

## Frontend Integration

The REST API provides everything needed for frontend applications:

**Features:**
- Content bundle endpoint for fast initial load
- Individual content endpoints with caching
- AI chat integration
- ETag support for efficient caching

**Quick Example:**

```typescript
// Fetch all content at once
const bundle = await fetch('/api/v1/content/bundle').then(r => r.json())

// Send chat message
const chat = await fetch('/api/v1/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello!' })
}).then(r => r.json())
```

[Learn more about frontend integration](/integrations/frontend)

## Architecture

Both integrations share the same data layer:

```
+------------------+              +------------------+
|   REST API       |              |   MCP Server     |
|   (Express)      |              |   (MCP SDK)      |
+--------+---------+              +--------+---------+
         |                                 |
         +----------------+----------------+
                          |
                +---------+---------+
                | Content Repository |
                |                    |
                | - findAll()        |
                | - findBySlug()     |
                | - create()         |
                | - update()         |
                +----------+---------+
                           |
                           v
                     +----------+
                     | Turso DB |
                     +----------+
```

This ensures:
- Consistent data access
- Shared validation
- Single source of truth
