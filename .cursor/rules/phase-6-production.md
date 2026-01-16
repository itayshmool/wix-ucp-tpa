# Phase 6: Production Readiness

## Context
Prepare for production with security, monitoring, and scalability.

## Reference Documentation
- UCP Security: https://ucp.dev/specification/overview#security-authentication

## Goal
Production-grade deployment.

---

## Part A: Security

### 1. Request Authentication (src/ucp/middleware/ucp-auth.ts)

API Key: `Authorization: ApiKey {key}`
- Store keys with platformId, permissions[], expiresAt
- Validate and check expiry

JWT Bearer: `Authorization: Bearer {token}`
- Verify signature, issuer, expiration
- Extract platform identity

Permissions:
- checkout:read, checkout:write
- products:read
- orders:read, orders:webhooks

### 2. Webhook Signatures

Outgoing: HMAC-SHA256, header X-UCP-Signature: sha256={hex}
Incoming: Verify with timing-safe comparison

### 3. Response Signing (Optional)

EC P-256 keys, publish in profile's signing_keys
JWS signatures on critical responses

### 4. Input Validation

JSON schema validation
Sanitize strings, validate formats
Reject oversized payloads

---

## Part B: Rate Limiting

### Limits
- Profile discovery: 100/min
- Product search: 60/min
- Checkout operations: 30/min
- Order queries: 30/min

### Implementation
- Sliding window algorithm
- Key by IP + API key
- 429 with Retry-After header
- X-RateLimit-* headers

### Request Limits
- Max body: 1MB
- Max line items: 100
- Max discount codes: 10

---

## Part C: Monitoring

### 1. Structured Logging

JSON format, include: timestamp, level, message, requestId, instanceId, platformId

Levels: ERROR, WARN, INFO, DEBUG

Key events: profile requests, checkout lifecycle, payment attempts, webhook deliveries, auth failures

### 2. Metrics (Prometheus)

Request: count, latency (p50/p95/p99), error rate
Business: checkouts created/completed, abandonment, AOV
External: Wix API latency/errors, webhook success rate

Endpoint: GET /metrics

### 3. Health Checks

GET /health/live - Process running
GET /health/ready - All dependencies OK
GET /health/status - Detailed component status

### 4. Distributed Tracing

X-Request-ID header propagation through all calls

---

## Part D: Scalability

### Stateless Design

All state in Redis/DB
Profile cache in Redis
Session tracking in Redis

### Caching

Platform profiles: 1 hour
Products: 5 minutes
Business profiles: 1 hour

### Graceful Shutdown

Stop new requests
Complete in-flight (30s)
Close connections
Flush metrics

---

## Part E: Database

### Models

AppInstance: instanceId, accessToken (encrypted), tokenExpiresAt, siteId, installedAt, settings

WebhookRegistration: id, instanceId, platformId, webhookUrl, events[], secret (encrypted), createdAt

APIKey: key (hashed), platformId, instanceId, permissions[], createdAt, expiresAt, lastUsedAt

### Encryption

Encrypt sensitive fields at rest
Envelope encryption with secrets manager

---

## Part F: Optional MCP Transport

### MCP Tools

create_checkout, get_checkout, update_checkout, complete_checkout
search_products, get_product, get_order

### Endpoint

POST /ucp/mcp - JSON-RPC 2.0
Update profile with MCP binding

---

## Environment Variables

```
# Security
UCP_AUTH_ENABLED=true
UCP_JWT_SECRET=xxx

# Rate Limiting
UCP_RATE_LIMIT_ENABLED=true

# Cache
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgres://localhost/wix_ucp

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
```

---

## Acceptance Criteria

### Security
- [ ] API key auth works
- [ ] JWT auth works
- [ ] 401 for invalid credentials
- [ ] Webhook signatures correct
- [ ] Input validation rejects bad data

### Rate Limiting
- [ ] Limits enforced
- [ ] 429 returned when exceeded
- [ ] Headers present

### Monitoring
- [ ] Structured logs
- [ ] Metrics endpoint works
- [ ] Health checks work
- [ ] Request IDs propagated

### Scalability
- [ ] Stateless verified
- [ ] Caching works
- [ ] Graceful shutdown works
