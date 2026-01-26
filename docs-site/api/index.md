---
title: API Overview
description: REST API overview and conventions
---

# API Overview

The Portfolio Backend exposes a REST API for content management and AI chat functionality.

## Base URL

```
https://your-domain.com/api/v1
```

## Authentication

### Public Endpoints

Public endpoints require no authentication:
- `GET /content/*` - Read content
- `POST /chat` - Send chat messages
- `GET /health/*` - Health checks

### Admin Endpoints

Admin endpoints require the `X-Admin-Key` header:

```bash
curl -H "X-Admin-Key: your-api-key" \
  https://your-domain.com/api/v1/admin/content
```

## Response Format

### Success Response

```json
{
  "id": "content_abc123",
  "type": "project",
  "slug": "my-project",
  "data": { ... },
  "status": "published",
  "version": 1,
  "createdAt": "2025-01-25T10:00:00Z",
  "updatedAt": "2025-01-25T10:00:00Z"
}
```

### Error Response

```json
{
  "error": "Content not found",
  "code": "NOT_FOUND",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Common Headers

### Request Headers

| Header | Description | Required |
|--------|-------------|----------|
| `X-Admin-Key` | Admin API key | For admin endpoints |
| `Content-Type` | `application/json` | For POST/PUT requests |
| `Idempotency-Key` | Unique request ID | Recommended for mutations |
| `If-None-Match` | ETag for caching | Optional for GET requests |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-Request-Id` | Unique request identifier |
| `ETag` | Entity tag for caching |
| `Cache-Control` | Caching directives |
| `X-RateLimit-Remaining` | Remaining rate limit tokens |
| `Retry-After` | Seconds to wait (when rate limited) |

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 304 | Not Modified (ETag match) |
| 400 | Validation Error |
| 401 | Unauthorized |
| 404 | Not Found |
| 409 | Conflict (e.g., duplicate slug) |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway (LLM unavailable) |

## Rate Limiting

The API uses token bucket rate limiting:

- **Chat endpoint**: 5 tokens, refills at 1 per 3 seconds
- **Content endpoints**: 100 tokens, refills at 10 per second

When rate limited, the response includes:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Remaining: 0

{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "retryAfter": 30
}
```

## Pagination

List endpoints support pagination:

```
GET /api/v1/admin/content?limit=10&offset=20
```

| Parameter | Default | Max |
|-----------|---------|-----|
| `limit` | 50 | 100 |
| `offset` | 0 | - |

## Filtering

Content can be filtered by type and status:

```
GET /api/v1/content?type=project&status=published
```

## Caching

Content responses include ETag headers for efficient caching:

```bash
# First request
curl -i https://api.example.com/api/v1/content/bundle
# Returns: ETag: "abc123"

# Subsequent request
curl -H "If-None-Match: abc123" \
  https://api.example.com/api/v1/content/bundle
# Returns: 304 Not Modified (if unchanged)
```

## API Sections

| Section | Description |
|---------|-------------|
| [Content API](#content-endpoints) | CRUD operations for portfolio content |
| [Chat API](#chat-endpoints) | AI-powered chat functionality |
| [Admin API](#admin-endpoints) | Content management (authenticated) |
| [Health API](#health-endpoints) | Health checks and metrics |

See the [API Reference](/api/reference) for detailed endpoint documentation.

## Content Endpoints

### List Content

```http
GET /api/v1/content
```

Query parameters:
- `type`: Filter by content type
- `status`: Filter by status (default: `published`)

### Get Content by Slug

```http
GET /api/v1/content/:type/:slug
```

### Get Content Bundle

```http
GET /api/v1/content/bundle
```

Returns all published content in a single request, organized by type.

## Chat Endpoints

### Send Message

```http
POST /api/v1/chat
Content-Type: application/json

{
  "sessionId": "optional-existing-session",
  "message": "Tell me about your projects"
}
```

Response:
```json
{
  "sessionId": "session_abc123",
  "message": {
    "id": "msg_xyz789",
    "role": "assistant",
    "content": "I'd be happy to tell you about..."
  },
  "rateLimit": {
    "remaining": 4,
    "resetAt": "2025-01-25T10:05:00Z"
  }
}
```

## Admin Endpoints

All admin endpoints require the `X-Admin-Key` header.

### Create Content

```http
POST /api/v1/admin/content
X-Admin-Key: your-api-key
Content-Type: application/json

{
  "type": "project",
  "slug": "new-project",
  "data": {
    "title": "New Project",
    "description": "A new project"
  },
  "status": "draft"
}
```

### Update Content

```http
PUT /api/v1/admin/content/:id
X-Admin-Key: your-api-key
Idempotency-Key: unique-request-id
Content-Type: application/json

{
  "data": {
    "title": "Updated Title"
  },
  "status": "published"
}
```

### Delete Content

```http
DELETE /api/v1/admin/content/:id
X-Admin-Key: your-api-key
```

Query parameters:
- `hard`: Set to `true` for permanent deletion (default: soft delete)

### Get Version History

```http
GET /api/v1/admin/content/:id/history
X-Admin-Key: your-api-key
```

### Restore Version

```http
POST /api/v1/admin/content/:id/restore
X-Admin-Key: your-api-key
Content-Type: application/json

{
  "version": 3
}
```

## Health Endpoints

### Basic Health

```http
GET /api/health
```

### Liveness Probe

```http
GET /api/health/live
```

### Readiness Probe

```http
GET /api/health/ready
```

### Prometheus Metrics

```http
GET /api/metrics
```
