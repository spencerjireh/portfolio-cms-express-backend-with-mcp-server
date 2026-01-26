---
title: Configuration
description: Environment variables and configuration options
---

# Configuration

The Portfolio Backend is configured via environment variables. This page documents all available options.

## Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TURSO_DATABASE_URL` | Turso database URL | `libsql://db-name.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso authentication token | `eyJ...` |
| `ADMIN_API_KEY` | API key for admin endpoints | `secure-random-string` |

## Optional Variables

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `development` | Environment (`development`, `production`, `test`) |

### CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `''` | Comma-separated list of allowed origins |

### Caching

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | - | Redis connection URL (optional) |

::: tip
If `REDIS_URL` is not set, the application falls back to in-memory caching. This works fine for single-instance deployments.
:::

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_CAPACITY` | `5` | Token bucket capacity |
| `RATE_LIMIT_REFILL_RATE` | `0.333` | Tokens per second |

### LLM Provider

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `openai` | LLM provider (currently only `openai` supported) |
| `LLM_API_KEY` | - | LLM provider API key |
| `LLM_MODEL` | `gpt-4o-mini` | Model to use for chat |
| `LLM_MAX_TOKENS` | `500` | Maximum response tokens |
| `LLM_TEMPERATURE` | `0.7` | Response temperature (0-1) |

### Observability

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_ENABLED` | `false` | Enable OpenTelemetry tracing (app-level gate) |

::: tip OpenTelemetry SDK Variables
When `OTEL_ENABLED=true`, the OpenTelemetry SDK reads these standard environment variables directly. They are not validated by our application but are required for trace export.
:::

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | - | OTLP collector endpoint (e.g., `http://localhost:4318`) |
| `OTEL_EXPORTER_OTLP_HEADERS` | - | Headers for OTLP exporter (e.g., `Authorization=Bearer token`) |
| `OTEL_SERVICE_NAME` | `portfolio-backend` | Service name in traces (hardcoded, but SDK allows override) |

See [OpenTelemetry Environment Variables](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/) for the full list of SDK configuration options.

## Example `.env` File

```bash
# Required
TURSO_DATABASE_URL=libsql://portfolio-db.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
ADMIN_API_KEY=super-secure-random-key-here

# Server
PORT=3000
NODE_ENV=production

# CORS
CORS_ORIGINS=https://myportfolio.com,https://www.myportfolio.com

# Caching (optional - falls back to in-memory)
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_CAPACITY=5
RATE_LIMIT_REFILL_RATE=0.333

# LLM
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
LLM_MAX_TOKENS=500
LLM_TEMPERATURE=0.7

# Observability
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

## Configuration by Environment

### Development

```bash
NODE_ENV=development
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Production

```bash
NODE_ENV=production
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-collector.example.com:4318
```

### Testing

```bash
NODE_ENV=test
TURSO_DATABASE_URL=file:test.db  # Use local SQLite
```

## Security Best Practices

::: warning
Never commit `.env` files to version control. Add `.env` to your `.gitignore`.
:::

### API Key Generation

Generate a secure admin API key:

```bash
openssl rand -base64 32
```

### Secret Rotation

To rotate the admin API key:

1. Generate a new key
2. Update the environment variable
3. Redeploy the application
4. Update any clients using the old key

### Secrets Management

For production, consider using:

- **Docker secrets** for containerized deployments
- **Cloud provider secrets** (AWS Secrets Manager, GCP Secret Manager)
- **Vault** for centralized secrets management
