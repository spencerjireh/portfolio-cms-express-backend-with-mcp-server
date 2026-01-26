---
title: API Reference
description: Complete API endpoint documentation
---

# API Reference

This page provides the complete OpenAPI specification for the Portfolio Backend API.

## OpenAPI Specification

The full OpenAPI 3.0 specification is available at:

- **Development**: `http://localhost:3000/api/docs`
- **Download**: [openapi.yaml](/openapi.yaml)

## Endpoints Summary

### Content (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/content` | List content items |
| GET | `/api/v1/content/:type/:slug` | Get single content item |
| GET | `/api/v1/content/bundle` | Get all content in one request |

### Chat (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat` | Send chat message |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Basic health check |
| GET | `/api/health/live` | Liveness probe |
| GET | `/api/health/ready` | Readiness probe |
| GET | `/api/health/startup` | Startup probe |
| GET | `/api/metrics` | Prometheus metrics |

### Admin Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/content` | List all content (including drafts) |
| POST | `/api/v1/admin/content` | Create content |
| PUT | `/api/v1/admin/content/:id` | Update content |
| DELETE | `/api/v1/admin/content/:id` | Delete content |
| GET | `/api/v1/admin/content/:id/history` | Get version history |
| POST | `/api/v1/admin/content/:id/restore` | Restore to previous version |
| GET | `/api/v1/admin/content/:id/diff` | Compare versions |
| GET | `/api/v1/admin/export` | Export all content |

### Admin Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/chat/sessions` | List chat sessions |
| GET | `/api/v1/admin/chat/sessions/:id` | Get session with messages |
| DELETE | `/api/v1/admin/chat/sessions/:id` | Delete session |
| GET | `/api/v1/admin/chat/stats` | Get chat statistics |

## Detailed Endpoint Documentation

### GET /content

List content items with optional filtering.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | - | Filter by content type |
| `status` | string | `published` | Filter by status |

**Response**

```json
[
  {
    "id": "content_abc123",
    "type": "project",
    "slug": "my-project",
    "data": {
      "title": "My Project",
      "description": "A great project"
    },
    "status": "published",
    "version": 1,
    "sortOrder": 0,
    "createdAt": "2025-01-25T10:00:00Z",
    "updatedAt": "2025-01-25T10:00:00Z"
  }
]
```

### GET /content/:type/:slug

Get a single content item by type and slug.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Content type (project, page, list, config) |
| `slug` | string | URL-friendly identifier |

**Response**

```json
{
  "id": "content_abc123",
  "type": "project",
  "slug": "my-project",
  "data": {
    "title": "My Project",
    "description": "A great project",
    "content": "## Overview\n\nThis project...",
    "tags": ["typescript", "express"],
    "featured": true
  },
  "status": "published",
  "version": 3,
  "sortOrder": 1,
  "createdAt": "2025-01-25T10:00:00Z",
  "updatedAt": "2025-01-26T15:30:00Z"
}
```

### GET /content/bundle

Get all published content organized by type.

**Response**

```json
{
  "projects": [...],
  "pages": [...],
  "lists": {
    "skills": {...},
    "experience": {...},
    "education": {...}
  },
  "config": {
    "name": "Jane Developer",
    "title": "Full Stack Engineer",
    "email": "jane@example.com",
    "social": {...},
    "chatEnabled": true
  }
}
```

### POST /chat

Send a chat message and receive an AI response.

**Request Body**

```json
{
  "sessionId": "session_abc123",  // Optional
  "message": "Tell me about your TypeScript experience"
}
```

**Response**

```json
{
  "sessionId": "session_abc123",
  "message": {
    "id": "msg_xyz789",
    "role": "assistant",
    "content": "I have extensive experience with TypeScript..."
  },
  "rateLimit": {
    "remaining": 4,
    "resetAt": "2025-01-25T10:05:00Z"
  }
}
```

**Error Responses**

- `429 Too Many Requests` - Rate limited
- `502 Bad Gateway` - LLM service unavailable

### POST /admin/content

Create new content.

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `X-Admin-Key` | Yes | Admin API key |
| `Idempotency-Key` | Recommended | Unique request ID |

**Request Body**

```json
{
  "type": "project",
  "slug": "new-project",
  "data": {
    "title": "New Project",
    "description": "An exciting new project",
    "tags": ["typescript"],
    "featured": false
  },
  "status": "draft",
  "sortOrder": 0
}
```

**Response** (201 Created)

```json
{
  "id": "content_new123",
  "type": "project",
  "slug": "new-project",
  "data": {...},
  "status": "draft",
  "version": 1,
  "sortOrder": 0,
  "createdAt": "2025-01-26T10:00:00Z",
  "updatedAt": "2025-01-26T10:00:00Z"
}
```

### PUT /admin/content/:id

Update existing content.

**Request Body**

```json
{
  "data": {
    "title": "Updated Title",
    "description": "Updated description"
  },
  "status": "published"
}
```

**Response**

Returns the updated content item with incremented version.

### GET /admin/content/:id/history

Get version history for a content item.

**Response**

```json
[
  {
    "id": "history_xyz789",
    "contentId": "content_abc123",
    "version": 3,
    "data": {...},
    "changeType": "update",
    "changedBy": "admin",
    "changeSummary": "Updated title, description",
    "createdAt": "2025-01-26T15:30:00Z"
  },
  {
    "id": "history_xyz788",
    "contentId": "content_abc123",
    "version": 2,
    "data": {...},
    "changeType": "update",
    "createdAt": "2025-01-25T12:00:00Z"
  }
]
```

### POST /admin/content/:id/restore

Restore content to a previous version.

**Request Body**

```json
{
  "version": 2
}
```

**Response**

Returns the content item with the restored data and a new version number.

### GET /health/ready

Check if the service is ready to accept traffic.

**Response**

```json
{
  "status": "ready",
  "checks": {
    "database": {
      "status": "connected",
      "latency": 12
    },
    "cache": {
      "status": "connected",
      "type": "redis"
    },
    "llm": {
      "status": "available",
      "circuitBreaker": "closed"
    }
  }
}
```

## Data Schemas

### ContentRow

```typescript
interface ContentRow {
  id: string
  type: 'project' | 'page' | 'list' | 'config'
  slug: string | null
  data: Record<string, unknown>
  status: 'draft' | 'published'
  version: number
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
```

### ChatResponse

```typescript
interface ChatResponse {
  sessionId: string
  message: {
    id: string
    role: 'assistant'
    content: string
  }
  rateLimit: {
    remaining: number
    resetAt: string
  }
}
```

### Error

```typescript
interface Error {
  error: string
  code: string
  requestId: string
  fields?: Record<string, string[]>  // For validation errors
  retryAfter?: number                // For rate limit errors
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body or parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid admin key |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate slug or version conflict |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `LLM_ERROR` | 502 | LLM provider unavailable |
