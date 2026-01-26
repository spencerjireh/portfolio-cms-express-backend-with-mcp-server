---
title: Operations Overview
description: Operational guides and deployment documentation
---

# Operations Overview

This section covers operational aspects of running the Portfolio Backend in production.

## Documentation

| Document | Description |
|----------|-------------|
| [Runbook](/operations/runbook) | Troubleshooting and incident response |
| [Deployment](/operations/deployment) | Deployment guides and procedures |

## Quick Reference

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | Basic health check |
| `/api/health/live` | Liveness probe (is process alive?) |
| `/api/health/ready` | Readiness probe (can accept traffic?) |
| `/api/health/startup` | Startup probe (has initialization completed?) |

### Key Metrics

| Metric | Alert Threshold |
|--------|-----------------|
| `http_request_duration_seconds` | p99 > 1s |
| `http_errors_total` | > 10/min |
| `circuit_breaker_state` | state = 2 (open) |
| `rate_limit_hits_total` | > 100/hour |

### Quick Commands

```bash
# Health check
curl -s https://api.yoursite.com/api/health/ready | jq

# View metrics
curl -s https://api.yoursite.com/api/metrics

# Test admin auth
curl -H "X-Admin-Key: $ADMIN_API_KEY" \
  https://api.yoursite.com/api/v1/admin/content

# View logs (Docker)
docker logs portfolio-api --tail 100 -f
```

## Common Issues

| Issue | Quick Fix |
|-------|-----------|
| 502 on chat | Check LLM provider, wait for circuit breaker reset |
| 429 rate limited | Wait for Retry-After duration |
| Stale content | Check cache, restart if needed |
| Database errors | Verify Turso credentials, check token expiry |

See the [Runbook](/operations/runbook) for detailed troubleshooting procedures.
