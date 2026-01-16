# Phases 4-6: UCP Integration

Implement Google's Universal Commerce Protocol for AI-powered commerce.

## Goals
- Expose UCP business profile for AI agent discovery
- Implement UCP Checkout capability
- Provide product discovery and order tracking
- Production-ready security and monitoring

## Guides in This Phase

### 4.1 UCP Business Profile & Discovery
- Create `.well-known/ucp` profile endpoint
- Declare UCP capabilities and services
- Configure payment handlers (Wix hosted checkout)
- Implement capability negotiation with platforms
- Parse UCP-Agent headers
- Cache platform profiles

### 4.2 UCP Checkout Capability
- Implement checkout session CRUD operations
- Map Wix Cart ↔ UCP Checkout Session
- Support line items, buyer info, shipping
- Handle discount and fulfillment extensions
- Return `continue_url` for payment redirect
- Convert money to minor units

### 5 UCP Skills & Capabilities
- Product discovery endpoints (search, filter, sort)
- Category/collection listing
- Order tracking and status
- Map Wix order status to UCP status
- Bridge Wix webhooks to UCP order events
- Dispatch events to platform webhooks

### 6 Production Readiness
- Request authentication (API keys, JWT)
- Rate limiting per endpoint
- Webhook signature verification
- Structured logging with correlation IDs
- Prometheus metrics
- Health checks (liveness, readiness)
- Database encryption for tokens
- Graceful shutdown

## Prerequisites
- Phases 1-3 completed (full Wix integration)
- Understanding of UCP protocol (2026-01-11 spec)

## Order of Implementation
4.1 → 4.2 → 5 → 6

## UCP Protocol Version
- **Spec**: `2026-01-11`
- **Documentation**: https://ucp.dev/specification/overview
- **GitHub**: https://github.com/Universal-Commerce-Protocol/ucp

## UCP Capabilities Implemented
```
dev.ucp.shopping.checkout         # Core checkout capability
dev.ucp.shopping.order            # Order tracking
dev.ucp.shopping.fulfillment      # Extends checkout
dev.ucp.shopping.discount         # Extends checkout
```

## Key UCP Endpoints
```
GET  /.well-known/ucp                        # Business profile
POST /ucp/v1/checkout-sessions               # Create checkout
GET  /ucp/v1/checkout-sessions/:id           # Get checkout
PATCH /ucp/v1/checkout-sessions/:id          # Update checkout
POST /ucp/v1/checkout-sessions/:id/complete  # Complete checkout
GET  /ucp/v1/products                        # Search products
GET  /ucp/v1/orders                          # List orders
GET  /health/ready                           # Health check
GET  /metrics                                # Prometheus metrics
```

## Production Checklist
- [ ] Authentication working (API keys + JWT)
- [ ] Rate limiting enforced
- [ ] All secrets encrypted
- [ ] Webhook signatures verified
- [ ] Structured logging enabled
- [ ] Metrics exposed
- [ ] Health checks working
- [ ] Database backups configured
- [ ] Monitoring alerts set up
- [ ] SSL certificates valid
- [ ] CORS configured correctly
- [ ] Error handling doesn't leak info

## Key Deliverables
- ✅ UCP profile discoverable by AI agents
- ✅ Checkout sessions work with AI platforms
- ✅ Products searchable via UCP
- ✅ Orders trackable via UCP
- ✅ Production security measures active
- ✅ Monitoring and metrics available
- ✅ Conformance tests passing
