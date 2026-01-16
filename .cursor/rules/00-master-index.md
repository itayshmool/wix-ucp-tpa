# Wix Store Agent - Complete Development Guide

## Overview

A Wix TPA that:
1. Integrates with Wix merchant stores (Phases 1-3)
2. Enables external checkout (Phase 3)
3. Exposes UCP interface for AI agents (Phases 4-6)

## Tech Stack
- Node.js 20+ / TypeScript 5+
- Express.js
- PostgreSQL + Redis

---

## Phase Summary

| Phase | Name | Description |
|-------|------|-------------|
| 1.1 | Project Setup | Config, structure |
| 1.2 | OAuth | Wix authentication |
| 1.3 | Webhooks & Dashboard | Events, merchant UI |
| 2.1 | Products | Catalog operations |
| 2.2 | Orders | Order management |
| 2.3 | Inventory | Stock management |
| 3.1 | Cart | Programmatic carts |
| 3.2 | Checkout | Hosted checkout URL |
| 3.3 | Completion | Order webhooks |
| 4.1 | UCP Profile | Business discovery |
| 4.2 | UCP Checkout | AI checkout sessions |
| 5 | UCP Capabilities | Products, Orders |
| 6 | Production | Security, monitoring |

---

## Endpoints

### Wix Integration
- GET /auth/install
- GET /auth/callback
- POST /webhooks
- GET /dashboard
- POST /external/cart
- POST /external/checkout

### UCP Protocol
- GET /.well-known/ucp
- POST /ucp/v1/checkout-sessions
- GET /ucp/v1/checkout-sessions/{id}
- PATCH /ucp/v1/checkout-sessions/{id}
- POST /ucp/v1/checkout-sessions/{id}/complete
- DELETE /ucp/v1/checkout-sessions/{id}
- GET /ucp/v1/products
- GET /ucp/v1/products/{id}
- GET /ucp/v1/categories
- GET /ucp/v1/orders
- GET /ucp/v1/orders/{id}
- GET /health/live
- GET /health/ready
- GET /metrics

---

## UCP Capabilities

```
dev.ucp.shopping.checkout
dev.ucp.shopping.order
dev.ucp.shopping.fulfillment (extends checkout)
dev.ucp.shopping.discount (extends checkout)
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

1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 → 3.1 → 3.2 → 3.3 → 4.1 → 4.2 → 5 → 6

---

## Environment Variables

```bash
PORT=3000
NODE_ENV=production
BASE_URL=https://your-app.com

WIX_APP_ID=xxx
WIX_APP_SECRET=xxx
WIX_WEBHOOK_PUBLIC_KEY=xxx

UCP_ENABLED=true
UCP_VERSION=2026-01-11
UCP_AUTH_ENABLED=true
UCP_JWT_SECRET=xxx

DATABASE_URL=postgres://...
REDIS_URL=redis://...

LOG_LEVEL=info
METRICS_ENABLED=true
```
