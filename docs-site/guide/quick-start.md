---
title: Quick Start
description: Get the Portfolio Backend running locally
---

# Quick Start

This guide will help you get the Portfolio Backend running locally in a few minutes.

## Prerequisites

- **Node.js** 18+ or **Bun** 1.0+
- **Turso CLI** (for database)
- **Redis** (optional, for distributed caching)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/spencerjirehcebrian/portfolio-cms-express-backend-with-mcp-server.git
cd portfolio-cms-express-backend-with-mcp-server
```

### 2. Install Dependencies

::: code-group

```bash [bun]
bun install
```

```bash [npm]
npm install
```

:::

### 3. Set Up Database

Create a Turso database:

```bash
# Install Turso CLI if not already installed
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create portfolio-backend

# Get connection details
turso db show portfolio-backend --url
turso db tokens create portfolio-backend
```

### 4. Configure Environment

Copy the example environment file and update it:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Database
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Admin API Key (generate a secure random string)
ADMIN_API_KEY=your-secure-key

# Optional: LLM Provider
LLM_API_KEY=your-openai-key

# Optional: Redis
REDIS_URL=redis://localhost:6379
```

### 5. Run Migrations

```bash
bun run db:migrate
```

### 6. Start the Server

::: code-group

```bash [Development]
bun run dev
```

```bash [Production]
bun run build
bun run start
```

:::

The API will be available at `http://localhost:3000`.

## Verify Installation

### Health Check

```bash
curl http://localhost:3000/api/health/ready
```

Expected response:

```json
{
  "status": "ready",
  "checks": {
    "database": "ok"
  }
}
```

### Create Test Content

```bash
curl -X POST http://localhost:3000/api/v1/admin/content \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-secure-key" \
  -d '{
    "type": "project",
    "slug": "test-project",
    "data": {
      "title": "Test Project",
      "description": "A test project",
      "tags": ["test"],
      "featured": false
    },
    "status": "published"
  }'
```

### Fetch Content

```bash
curl http://localhost:3000/api/v1/content/bundle
```

## Docker Setup

For a containerized setup:

```bash
# Build image
docker build -t portfolio-backend .

# Run with environment variables
docker run -p 3000:3000 \
  -e TURSO_DATABASE_URL=... \
  -e TURSO_AUTH_TOKEN=... \
  -e ADMIN_API_KEY=... \
  portfolio-backend
```

Or use Docker Compose:

```bash
docker-compose up
```

## Next Steps

- [Configuration](/guide/configuration) - All environment variables
- [API Reference](/api/reference) - Full API documentation
- [MCP Server](/integrations/mcp-server) - Set up AI integration
