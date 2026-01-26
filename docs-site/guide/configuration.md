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
| `HOST` | `0.0.0.0` | HTTP server host |
| `NODE_ENV` | `development` | Environment (`development`, `production`, `test`) |
| `LOG_LEVEL` | `info` | Logging level (`debug`, `info`, `warn`, `error`) |

### CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `*` | Comma-separated list of allowed origins |

### Caching

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | - | Redis connection URL (optional) |
| `CACHE_TTL_CONTENT` | `300` | Content cache TTL in seconds |
| `CACHE_TTL_BUNDLE` | `300` | Bundle cache TTL in seconds |

::: tip
If `REDIS_URL` is not set, the application falls back to in-memory caching. This works fine for single-instance deployments.
:::

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_CAPACITY` | `5` | Token bucket capacity |
| `RATE_LIMIT_REFILL_RATE` | `0.333` | Tokens per second |
| `RATE_LIMIT_WHITELIST` | - | Comma-separated IPs to skip limiting |

### LLM Provider

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_API_KEY` | - | LLM provider API key |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | LLM API base URL |
| `LLM_MODEL` | `gpt-4o-mini` | Model to use for chat |
| `LLM_TIMEOUT` | `30000` | Request timeout in ms |
| `LLM_MAX_TOKENS` | `500` | Maximum response tokens |

### Circuit Breaker

| Variable | Default | Description |
|----------|---------|-------------|
| `CIRCUIT_FAILURE_THRESHOLD` | `5` | Failures before opening |
| `CIRCUIT_RESET_TIMEOUT` | `30000` | Time before half-open (ms) |
| `CIRCUIT_HALF_OPEN_ATTEMPTS` | `2` | Successes needed to close |

### Observability

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | - | OTLP collector endpoint |
| `OTEL_SERVICE_NAME` | `portfolio-backend` | Service name for traces |
| `OTEL_SAMPLE_RATE` | `0.1` | Trace sampling rate (0-1) |

## Example `.env` File

```bash
# Required
TURSO_DATABASE_URL=libsql://portfolio-db.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
ADMIN_API_KEY=super-secure-random-key-here

# Server
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# CORS
CORS_ORIGINS=https://myportfolio.com,https://www.myportfolio.com

# Caching
REDIS_URL=redis://localhost:6379
CACHE_TTL_CONTENT=300

# Rate Limiting
RATE_LIMIT_CAPACITY=5
RATE_LIMIT_REFILL_RATE=0.333

# LLM
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_MAX_TOKENS=500

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SAMPLE_RATE=0.1
```

## Configuration by Environment

### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
OTEL_SAMPLE_RATE=1.0  # Trace everything
```

### Production

```bash
NODE_ENV=production
LOG_LEVEL=info
OTEL_SAMPLE_RATE=0.1  # Sample 10%
```

### Testing

```bash
NODE_ENV=test
LOG_LEVEL=error
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
