# Wix Store Agent - Complete Development Guide

## 🚨 START HERE

**⚠️ READ THIS FIRST**: [CRITICAL-ARCHITECTURE.md](./CRITICAL-ARCHITECTURE.md)

This document contains essential architectural understanding that clarifies:
- Who the actual end users are (buyers via LLM agents, NOT merchants)
- Why we're building this (AI-first commerce via UCP protocol)
- What each phase is really for
- Authentication confusion resolved
- Priority order for next steps

**DO NOT PROCEED** without reading the critical architecture document first.

---

## Overview

A Wix TPA that:
1. Integrates with Wix merchant stores (Phases 1-3)
2. Enables external checkout (Phase 3)
3. Exposes UCP interface for AI agents (Phases 4-6)
4. **NEW**: Completes full UCP spec compliance (Phases 7-14)

**Core Purpose**: Enable LLM agents to shop on Wix stores using Universal Commerce Protocol (UCP)

**UCP Spec Reference**: https://ucp.dev/playground/

## Tech Stack
- Node.js 20+ / TypeScript 5+
- Express.js
- PostgreSQL + Redis

---

## Phase Summary

### Phases 1-6: Foundation (Completed)

| Phase | Name | Description | Status |
|-------|------|-------------|--------|
| 1.1 | Project Setup | Config, structure | ✅ |
| 1.2 | OAuth | Wix authentication | ✅ |
| 1.3 | Webhooks & Dashboard | Events, merchant UI | ✅ |
| 2.1 | Products | Catalog operations | ✅ |
| 2.2 | Orders | Order management | ✅ |
| 2.3 | Inventory | Stock management | ✅ |
| 3.1 | Cart | Programmatic carts | ✅ |
| 3.2 | Checkout | Hosted checkout URL | ✅ |
| 3.3 | Completion | Order webhooks | ✅ |
| 4.1 | UCP Profile | Business discovery | ✅ |
| 4.2 | UCP Checkout | AI checkout sessions | ✅ |
| 5 | UCP Capabilities | Products, Orders | ✅ |
| 6 | Production | Security, monitoring | ✅ |

### Phases 7-14: UCP Spec Completion (New)

| Phase | Name | Description | Priority | Complexity |
|-------|------|-------------|----------|------------|
| 7 | UCP Order Capability | Expose OrdersService via UCP | 🔴 High | 🟢 Low |
| 8 | Schema Validation | JSON schema + UCP errors | 🟡 Medium | 🟢 Low |
| 9 | Fulfillment Extension | Webhook callbacks to agents | 🟡 Medium | 🟡 Medium |
| 10 | Discounts Extension | Coupon code support | 🟡 Medium | 🟡 Medium |
| 11 | Payment Handlers | Mint payment instruments | 🔴 High | 🔴 High |
| 12 | Complete Checkout | Server-side order creation | 🔴 High | 🔴 High |
| 13 | Protocol Bindings | MCP + A2A integration | 🟡 Medium | 🔴 High |
| 14 | Identity & Consent | Identity linking + GDPR | 🟢 Low | 🟡 Medium |

See [phase-7-14/README.md](./phase-7-14/README.md) for detailed implementation guides.

---

## Endpoints

### Wix Integration
- GET /auth/install
- GET /auth/callback
- POST /webhooks
- GET /dashboard
- POST /external/cart
- POST /external/checkout

### UCP Protocol (Current)
- GET /.well-known/ucp
- GET /ucp/products
- GET /ucp/products/{id}
- POST /ucp/cart
- GET /ucp/cart
- DELETE /ucp/cart
- POST /ucp/checkout
- GET /ucp/checkout/{id}/status

### UCP Protocol (New in Phases 7-14)
```
# Phase 7: Orders
GET  /ucp/orders
GET  /ucp/orders/{id}
GET  /ucp/orders/by-checkout/{checkoutId}
GET  /ucp/orders/{id}/fulfillments

# Phase 9: Fulfillment Webhooks
POST /ucp/webhooks/register
DELETE /ucp/webhooks/{id}

# Phase 10: Discounts
POST /ucp/checkout/{id}/discounts
DELETE /ucp/checkout/{id}/discounts/{code}
POST /ucp/discounts/validate

# Phase 11: Payment Handlers
GET  /ucp/payment-handlers
GET  /ucp/payment-handlers/{id}/config
POST /ucp/payment-handlers/{id}/mint
GET  /ucp/instruments/{id}

# Phase 12: Complete Checkout
POST /ucp/checkout/{id}/complete

# Phase 14: Identity & Consent
POST /ucp/identity/link
GET  /ucp/identity/{platform}/{userId}
DELETE /ucp/identity/{platform}/{userId}
POST /ucp/consent
GET  /ucp/consent/{email}
DELETE /ucp/consent/{email}/{type}
```

### Health & Metrics
- GET /health/live
- GET /health/ready
- GET /metrics

---

## UCP Capabilities

### Current (Phases 1-6)
```
catalog_search        # Browse products
product_details       # Get single product
cart_management       # Create/manage cart
checkout              # Redirect-based checkout
```

### New (Phases 7-14)
```
orders                # Phase 7: Order retrieval
fulfillment           # Phase 9: Shipping webhooks
discounts             # Phase 10: Coupon support
payment_handlers      # Phase 11: Mint instruments
server_checkout       # Phase 12: Server-side completion
identity_linking      # Phase 14: Cross-platform identity
```

### UCP Playground Coverage
```
✅ Step 1: Platform Profile
✅ Step 2: Discovery (/.well-known/ucp)
✅ Step 3: Capability Negotiation
✅ Step 4: Create Checkout
✅ Step 5: Update Checkout
⬜ Step 6: Mint Instrument (Phase 11)
⬜ Step 7: Complete Checkout (Phase 12)
✅ Step 8: Webhook Simulation (Phase 9)
```

---

## Wix Permissions

```
WIX_STORES.READ_PRODUCTS
WIX_STORES.READ_COLLECTIONS
WIX_STORES.READ_ORDERS
WIX_STORES.READ_INVENTORY
WIX_ECOM.READ_CARTS
WIX_ECOM.MANAGE_CARTS
WIX_ECOM.READ_CHECKOUTS
WIX_ECOM.MANAGE_CHECKOUTS
WIX_ECOM.READ_ORDERS
```

---

## Wix Webhooks

```
wix.instance.app_installed
wix.instance.app_removed
wix.stores.v1.product_created
wix.stores.v1.product_updated
wix.ecom.v1.order_created
wix.ecom.v1.order_paid
wix.ecom.v1.order_fulfilled
wix.ecom.v1.order_canceled
```

---

## Execution Order

### Foundation Path (Completed)
```
1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 → 3.1 → 3.2 → 3.3 → 4.1 → 4.2 → 5 → 6
```

### UCP Completion Path (New)
```
7 → 8 → 9 → 10 → 11 → 12 → 13 → 14
│   │   │    │    │    │    │    └── Identity & Consent
│   │   │    │    │    │    └── Protocol Bindings (MCP, A2A)
│   │   │    │    │    └── Complete Checkout
│   │   │    │    └── Payment Handlers (Mint)
│   │   │    └── Discounts Extension
│   │   └── Fulfillment Extension
│   └── Schema Validation
└── Order Capability (Quick Win!)
```

**Quick Wins First**: Start with Phase 7 (1-2 days) for immediate value.

---

## Environment Variables

```bash
# Core
PORT=3000
NODE_ENV=production
BASE_URL=https://your-app.com

# Wix Integration
WIX_APP_ID=xxx
WIX_APP_SECRET=xxx
WIX_WEBHOOK_PUBLIC_KEY=xxx

# UCP Protocol
UCP_ENABLED=true
UCP_VERSION=2026-01-11
UCP_AUTH_ENABLED=true
UCP_JWT_SECRET=xxx

# Database
DATABASE_URL=postgres://...
REDIS_URL=redis://...

# Logging
LOG_LEVEL=info
METRICS_ENABLED=true

# Phase 11: Payment Handlers (optional)
GOOGLE_PAY_MERCHANT_ID=xxx
GOOGLE_PAY_MERCHANT_NAME=Pop Stop
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```
