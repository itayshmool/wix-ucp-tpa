# UCP Implementation Summary

## Wix UCP TPA - Complete Protocol Implementation

This document provides a comprehensive summary of our Universal Commerce Protocol (UCP) implementation, phase by phase, aligned with the [UCP Playground specification](https://ucp.dev/playground/).

---

## 🎯 Implementation Overview

| UCP Playground Step | Our Implementation | Status |
|---------------------|-------------------|--------|
| 1. Platform Profile | Discovery endpoint with capabilities | ✅ Complete |
| 2. Discovery | `/.well-known/ucp` | ✅ Complete |
| 3. Capability Negotiation | Full capability array | ✅ Complete |
| 4. Create Checkout | `POST /ucp/checkout` | ✅ Complete |
| 5. Update Checkout | `PATCH /ucp/checkout/:id` | ✅ Complete |
| 6. Mint Instrument | `POST /ucp/checkout/:id/mint` | ✅ Complete |
| 7. Complete Checkout | `POST /ucp/checkout/:id/complete` | ✅ Complete |
| 8. Webhook Simulation | Fulfillment webhooks | ✅ Complete |

---

## 📦 Phase 1-6: Foundation (Pre-existing)

### Core Commerce Layer

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Product Catalog | `GET /ucp/products` | Browse products with search & pagination |
| Product Details | `GET /ucp/products/:id` | Get single product details |
| Cart Management | `POST /ucp/cart` | Create cart with items |
| Add to Cart | `POST /ucp/cart/items` | Add items to existing cart |
| Update Cart Item | `PUT /ucp/cart/items/:id` | Modify quantity |
| Remove from Cart | `DELETE /ucp/cart/items/:id` | Remove item |
| Create Checkout | `POST /ucp/checkout` | Initialize checkout session |

### Integration

- **Wix SDK**: Full integration with Wix eCommerce APIs
- **OAuth Flow**: App installation and token management
- **Headless Mode**: Visitor tokens for public access

---

## 📦 Phase 7: UCP Orders Capability

**Goal**: Expose order history and details through UCP endpoints.

### Endpoints Implemented

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/ucp/orders` | List orders with filtering |
| `GET` | `/ucp/orders/:id` | Get single order details |
| `GET` | `/ucp/orders/:id/fulfillments` | Get fulfillment status |

### Features

- ✅ Order listing with pagination (`limit`, `offset`)
- ✅ Status filtering (`status`, `paymentStatus`, `fulfillmentStatus`)
- ✅ Search by order number or buyer info
- ✅ Wix order status → UCP status mapping
- ✅ Discovery endpoint updated with `orders` capability

### Data Mapping

```
Wix Payment Status → UCP Payment Status
─────────────────────────────────────────
PAID              → paid
NOT_PAID          → pending
PARTIALLY_PAID    → partially_paid
REFUNDED          → refunded
PARTIALLY_REFUNDED → partially_refunded

Wix Fulfillment Status → UCP Fulfillment Status
───────────────────────────────────────────────
FULFILLED         → fulfilled
NOT_FULFILLED     → unfulfilled
PARTIALLY_FULFILLED → partially_fulfilled
```

---

## 📦 Phase 8: Schema Validation (Zod)

**Goal**: Validate all UCP request/response payloads against defined schemas.

### Implementation

| Component | Technology | Purpose |
|-----------|------------|---------|
| Schema Library | Zod | TypeScript-first validation |
| Middleware | Express middleware | Request validation |
| Error Format | UCPError | Standardized error responses |

### Schemas Defined

```typescript
// Request Validation Schemas
UCPCartItemSchema          // Cart item structure
UCPCreateCartRequestSchema // Create cart payload
UCPUpdateCartItemSchema    // Update cart item
UCPCreateCheckoutSchema    // Create checkout
UCPWebhookSubscriptionSchema // Webhook registration
UCPApplyCouponSchema       // Apply coupon
MintInstrumentRequestSchema // Mint payment instrument
CompleteCheckoutRequestSchema // Complete checkout
LinkIdentityRequestSchema  // Identity linking
ConsentRequestSchema       // Consent management
GDPRDeleteRequestSchema    // GDPR deletion
```

### Validation Middleware

```typescript
router.post('/ucp/cart', 
  validate(UCPCreateCartRequestSchema), 
  async (req, res) => { ... }
);
```

### Error Response Format

```json
{
  "error": "Validation Error",
  "message": "Request validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "body.items[0].quantity", "message": "Must be positive" }
  ]
}
```

---

## 📦 Phase 9: Fulfillment Extension

**Goal**: Webhook-based shipping updates per UCP Fulfillment Extension spec.

### Endpoints Implemented

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ucp/webhooks` | Subscribe to events |
| `GET` | `/ucp/webhooks` | List subscriptions |
| `GET` | `/ucp/webhooks/:id` | Get subscription details |
| `DELETE` | `/ucp/webhooks/:id` | Unsubscribe |
| `GET` | `/ucp/orders/:id/events` | Get order event history |
| `POST` | `/ucp/test/fulfillment` | Simulate fulfillment event |

### Webhook Event Types

```typescript
type FulfillmentEvent = 
  | 'order.fulfilled'
  | 'order.partially_fulfilled'
  | 'shipment.created'
  | 'shipment.in_transit'
  | 'shipment.delivered'
  | 'tracking.updated';
```

### Webhook Payload Structure

```json
{
  "event": "shipment.in_transit",
  "timestamp": "2026-01-19T12:00:00Z",
  "data": {
    "orderId": "order-123",
    "shipmentId": "ship-456",
    "trackingNumber": "1Z999AA10123456784",
    "carrier": "UPS",
    "status": "in_transit",
    "estimatedDelivery": "2026-01-22"
  }
}
```

---

## 📦 Phase 10: Discounts Extension

**Goal**: Coupon codes and automatic discounts per UCP Discounts Extension.

### Endpoints Implemented

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ucp/checkout/:id/coupons` | Apply coupon code |
| `DELETE` | `/ucp/checkout/:id/coupons` | Remove coupon |
| `GET` | `/ucp/checkout/:id/discounts` | Get applied discounts |

### Features

- ✅ Coupon code validation
- ✅ Multiple discount types (percentage, fixed, free shipping)
- ✅ Discount stacking rules
- ✅ Integration with Wix coupon system

### Discount Response

```json
{
  "success": true,
  "checkoutId": "checkout-123",
  "discounts": [
    {
      "id": "disc-1",
      "type": "coupon",
      "code": "SAVE20",
      "description": "20% off your order",
      "amount": { "value": "15.00", "currency": "USD" }
    }
  ],
  "totals": {
    "subtotal": "75.00",
    "discount": "15.00",
    "shipping": "0.00",
    "tax": "4.80",
    "total": "64.80"
  }
}
```

---

## 📦 Phase 11: Payment Handlers

**Goal**: UCP Payment Handler discovery, instrument minting, and validation.

### Endpoints Implemented

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/ucp/payment-handlers` | List available handlers |
| `GET` | `/ucp/payment-handlers/:id` | Get handler details |
| `POST` | `/ucp/checkout/:id/mint` | Mint payment instrument |
| `GET` | `/ucp/instruments/:id` | Get instrument details |
| `POST` | `/ucp/instruments/:id/validate` | Validate instrument |
| `DELETE` | `/ucp/instruments/:id` | Cancel/expire instrument |
| `POST` | `/ucp/test/mint` | Test minting (sandbox) |

### Supported Payment Handlers

| Handler ID | Name | Type |
|------------|------|------|
| `com.wix.checkout.v1` | Wix Hosted Checkout | Redirect |
| `com.ucp.sandbox` | UCP Sandbox | Test cards |

### Instrument Lifecycle

```
┌─────────────┐    ┌──────────────┐    ┌────────────┐
│   PENDING   │───▶│    VALID     │───▶│    USED    │
└─────────────┘    └──────────────┘    └────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   EXPIRED    │
                   └──────────────┘
```

### Sandbox Test Cards

| Card Number | Result |
|-------------|--------|
| `4242424242424242` | Success |
| `4000000000000002` | Decline |
| `4000000000009995` | Insufficient funds |

### Idempotency Support

```typescript
// Request with idempotency key
POST /ucp/checkout/xyz/mint
{
  "handlerId": "com.ucp.sandbox",
  "amount": 99.99,
  "currency": "USD",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 📦 Phase 12: Server-Side Checkout

**Goal**: Complete checkout via API without browser redirects.

### Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ucp/checkout/:id/complete` | Complete checkout |

### Request Payload

```json
{
  "instrumentId": "instr_abc123",
  "billingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US"
  },
  "shippingAddress": { ... },
  "buyerInfo": {
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "idempotencyKey": "unique-key-123"
}
```

### Response

```json
{
  "success": true,
  "order": {
    "id": "order-789",
    "number": "10042",
    "status": "approved",
    "createdAt": "2026-01-19T12:00:00Z",
    "totals": {
      "subtotal": "99.99",
      "shipping": "0.00",
      "tax": "8.00",
      "total": "107.99"
    }
  },
  "transaction": {
    "id": "txn-456",
    "status": "captured",
    "amount": "107.99",
    "currency": "USD"
  }
}
```

### Security

- ✅ Instrument validation before use
- ✅ One-time use enforcement
- ✅ Idempotency for safe retries
- ✅ Address verification

---

## 📦 Phase 13: Protocol Bindings

**Goal**: MCP (LLM tools) and A2A (agent handoff) protocol support.

### MCP Binding (Model Context Protocol)

Exposes UCP operations as LLM-callable tools.

| Endpoint | Description |
|----------|-------------|
| `GET /mcp/tools` | List available tools |
| `POST /mcp/call` | Execute a tool |

#### Available MCP Tools

| Tool | Description |
|------|-------------|
| `ucp_discover` | Get merchant capabilities |
| `ucp_search_products` | Search product catalog |
| `ucp_get_product` | Get product details |
| `ucp_create_cart` | Create shopping cart |
| `ucp_add_to_cart` | Add item to cart |
| `ucp_get_cart` | Get cart contents |
| `ucp_create_checkout` | Start checkout |
| `ucp_apply_coupon` | Apply discount code |
| `ucp_complete_checkout` | Finalize purchase |

#### Tool Execution

```json
// Request
POST /mcp/call
{
  "name": "ucp_search_products",
  "arguments": {
    "query": "energy drinks",
    "limit": 5
  }
}

// Response
{
  "success": true,
  "result": {
    "products": [...],
    "total": 12
  }
}
```

### A2A Binding (Agent-to-Agent)

Enables multi-agent transaction coordination.

| Endpoint | Description |
|----------|-------------|
| `GET /a2a/agent` | Get agent card |
| `POST /a2a/handoff` | Create handoff request |
| `PUT /a2a/handoff/:id/accept` | Accept handoff |
| `PUT /a2a/handoff/:id/complete` | Complete handoff |
| `DELETE /a2a/handoff/:id` | Cancel handoff |

#### Handoff Flow

```
Agent A                    UCP Server                    Agent B
   │                            │                            │
   │─── POST /a2a/handoff ─────▶│                            │
   │                            │                            │
   │◀── handoffId + token ──────│                            │
   │                            │                            │
   │            (share token)   │                            │
   │─────────────────────────────────────────────────────────▶│
   │                            │                            │
   │                            │◀── PUT /handoff/accept ────│
   │                            │                            │
   │                            │◀── PUT /handoff/complete ──│
   │◀── webhook notification ───│                            │
```

---

## 📦 Phase 14: Identity & Consent

**Goal**: Cross-platform identity linking and GDPR-compliant consent management.

### Identity Linking

| Endpoint | Description |
|----------|-------------|
| `POST /ucp/identity/link` | Link identities |
| `GET /ucp/identity/:platform/:userId` | Get linked identity |
| `DELETE /ucp/identity/:platform/:userId` | Unlink identity |

#### Link Request

```json
{
  "primaryId": "user@example.com",
  "primaryIdType": "email",
  "platform": "alexa",
  "userId": "amzn1.account.ABC123"
}
```

### Consent Management

| Endpoint | Description |
|----------|-------------|
| `POST /ucp/consent` | Record consent |
| `GET /ucp/consent/:subjectId` | Get consent status |
| `DELETE /ucp/consent/:subjectId/:type` | Withdraw consent |

#### Consent Types

- `marketing` - Email/SMS marketing
- `analytics` - Usage tracking
- `personalization` - AI recommendations

### GDPR Compliance

| Endpoint | Description |
|----------|-------------|
| `GET /ucp/gdpr/export/:subjectId` | Export user data |
| `POST /ucp/gdpr/delete` | Delete user data |

---

## 🔧 Discovery Endpoint

The `/.well-known/ucp` endpoint exposes all capabilities:

```json
{
  "protocol": "ucp",
  "version": "1.0",
  "merchant": {
    "id": "5713796246",
    "name": "Pop Stop Drink",
    "domain": "popstopdrink.com",
    "currency": "USD",
    "verified": true
  },
  "capabilities": [
    "catalog_search",
    "product_details",
    "cart_management",
    "checkout",
    "orders",
    "fulfillment",
    "discounts",
    "payment_handlers",
    "server_checkout",
    "identity_linking"
  ],
  "endpoints": {
    "catalog": "/ucp/products",
    "product": "/ucp/products/{id}",
    "cart": "/ucp/cart",
    "checkout": "/ucp/checkout",
    "orders": "/ucp/orders/{id}",
    "paymentHandlers": "/ucp/payment-handlers",
    "instruments": "/ucp/instruments/{id}",
    "identity": "/ucp/identity",
    "consent": "/ucp/consent",
    "gdpr": "/ucp/gdpr"
  },
  "payment_handlers": [
    "com.wix.checkout.v1",
    "com.ucp.sandbox"
  ],
  "bindings": {
    "mcp": "/mcp",
    "a2a": "/a2a"
  },
  "trust_signals": {
    "ssl": true,
    "return_policy_url": "https://www.popstopdrink.com/return-policy",
    "privacy_policy_url": "https://www.popstopdrink.com/privacy-policy"
  }
}
```

---

## 🧪 Test Coverage

| Phase | Test File | Tests |
|-------|-----------|-------|
| 7-10 | `ucp-phase7-10.test.ts` | 45 |
| 11 | `ucp-phase11-payment.test.ts` | 35 |
| 12 | `ucp-phase12-complete.test.ts` | 20 |
| 13 | `ucp-phase13-bindings.test.ts` | 40 |
| 14 | `ucp-phase14-identity.test.ts` | 36 |
| **Total** | | **176** |

All tests passing ✅

---

## 🚀 Deployment

**Production URL**: https://wix-ucp-tpa.onrender.com

### Test Interfaces

| URL | Description |
|-----|-------------|
| `/test/llm` | AI Chat Interface |
| `/test/full` | Full Capability Test UI |
| `/test/storefront` | Basic Storefront |

---

## 📚 Additional Documentation

| Document | Description |
|----------|-------------|
| `DECK_SERVER_CHECKOUT.md` | Server-side checkout deep dive |
| `DECK_A2A.md` | A2A protocol implementation |
| `ARCHITECTURE_DECK.md` | System architecture overview |
| `MANUAL_TESTING_GUIDE.md` | Testing procedures |

---

## ✅ UCP Playground Compliance

| Playground Step | Compliance | Notes |
|-----------------|------------|-------|
| Platform Profile | ✅ Full | All extensions supported |
| Discovery | ✅ Full | `/.well-known/ucp` |
| Capability Negotiation | ✅ Full | Dynamic capability filtering |
| Create Checkout | ✅ Full | With validation |
| Update Checkout | ✅ Full | PATCH support |
| Mint Instrument | ✅ Full | Multiple handlers |
| Complete Checkout | ✅ Full | Server-side completion |
| Webhook Simulation | ✅ Full | Event-driven updates |

**Implementation Status: 100% Complete** 🎉

---

*Last Updated: January 19, 2026*
*UCP Specification Version: 1.0*
*Repository: https://github.com/itayshmool/wix-ucp-tpa*
