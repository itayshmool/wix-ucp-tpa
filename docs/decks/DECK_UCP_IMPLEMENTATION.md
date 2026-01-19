# UCP Implementation Deck

## Wix UCP TPA - Complete Protocol Implementation

---

## Slide 1: What We Built

**Full UCP Protocol Implementation on Wix**

| Component | Status |
|-----------|--------|
| Discovery | ✅ `/.well-known/ucp` |
| Catalog & Cart | ✅ Full CRUD |
| Checkout | ✅ Create/Update/Complete |
| Payment Handlers | ✅ Mint & Validate |
| Orders & Fulfillment | ✅ With Webhooks |
| Identity & Consent | ✅ GDPR Compliant |
| Protocol Bindings | ✅ MCP + A2A |

**176 tests passing** | **14 phases complete**

---

## Slide 2: UCP Playground Alignment

Matches all 8 steps from [ucp.dev/playground](https://ucp.dev/playground/)

| Step | Implementation |
|------|---------------|
| 1. Platform Profile | Capability discovery |
| 2. Discovery | `/.well-known/ucp` |
| 3. Capability Negotiation | 10 capabilities |
| 4. Create Checkout | `POST /ucp/checkout` |
| 5. Update Checkout | `PATCH /ucp/checkout/:id` |
| 6. Mint Instrument | `POST /checkout/:id/mint` |
| 7. Complete Checkout | `POST /checkout/:id/complete` |
| 8. Webhooks | Fulfillment events |

---

## Slide 3: Capabilities

```json
{
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
  ]
}
```

**Payment Handlers**: `com.wix.checkout.v1`, `com.ucp.sandbox`

---

## Slide 4: Core Commerce (Phases 1-6)

| Feature | Endpoint |
|---------|----------|
| Browse Products | `GET /ucp/products` |
| Product Details | `GET /ucp/products/:id` |
| Create Cart | `POST /ucp/cart` |
| Add to Cart | `POST /ucp/cart/items` |
| Update Item | `PUT /ucp/cart/items/:id` |
| Create Checkout | `POST /ucp/checkout` |

**Powered by Wix SDK** with OAuth + Headless mode

---

## Slide 5: Orders & Fulfillment (Phases 7, 9)

### Orders API
| Endpoint | Action |
|----------|--------|
| `GET /ucp/orders` | List with filters |
| `GET /ucp/orders/:id` | Get details |
| `GET /ucp/orders/:id/fulfillments` | Track shipments |

### Webhook Events
- `order.fulfilled`
- `shipment.in_transit`
- `shipment.delivered`
- `tracking.updated`

---

## Slide 6: Schema Validation (Phase 8)

**Zod-powered request validation**

```typescript
router.post('/ucp/cart', 
  validate(UCPCreateCartRequestSchema),
  handler
);
```

**Standardized Error Response**:
```json
{
  "error": "Validation Error",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "items[0].quantity", "message": "Required" }
  ]
}
```

---

## Slide 7: Discounts (Phase 10)

| Endpoint | Action |
|----------|--------|
| `POST /checkout/:id/coupons` | Apply coupon |
| `DELETE /checkout/:id/coupons` | Remove |
| `GET /checkout/:id/discounts` | View applied |

**Response includes**:
- Discount breakdown
- Updated totals
- Coupon validation

---

## Slide 8: Payment Handlers (Phase 11)

### Flow
```
Discovery → Select Handler → Mint Instrument → Validate → Use
```

### Endpoints
| Action | Endpoint |
|--------|----------|
| List Handlers | `GET /ucp/payment-handlers` |
| Mint | `POST /checkout/:id/mint` |
| Validate | `POST /instruments/:id/validate` |

### Sandbox Test Cards
- `4242...` = Success
- `4000...0002` = Decline

---

## Slide 9: Server-Side Checkout (Phase 12)

**Complete purchase via API - no redirects**

```
POST /ucp/checkout/:id/complete
{
  "instrumentId": "instr_abc",
  "billingAddress": {...},
  "shippingAddress": {...},
  "idempotencyKey": "unique-123"
}
```

**Returns**: Order ID, transaction details, totals

✅ Idempotent | ✅ One-time instrument use | ✅ Secure

---

## Slide 10: MCP Binding (Phase 13)

**Expose UCP as LLM tools**

| Tool | Description |
|------|-------------|
| `ucp_discover` | Get capabilities |
| `ucp_search_products` | Search catalog |
| `ucp_create_cart` | Start cart |
| `ucp_complete_checkout` | Purchase |

```json
POST /mcp/call
{ "name": "ucp_search_products", "arguments": {"query": "drinks"} }
```

---

## Slide 11: A2A Binding (Phase 13)

**Agent-to-Agent transaction handoff**

```
Agent A                    UCP                    Agent B
   │── POST /a2a/handoff ──▶│                        │
   │◀── handoffId + token ──│                        │
   │                        │◀── accept + complete ──│
   │◀── webhook ────────────│                        │
```

**Use case**: Transfer shopping session between agents

---

## Slide 12: Identity & Consent (Phase 14)

### Identity Linking
```json
POST /ucp/identity/link
{ "primaryId": "user@email.com", "platform": "alexa", "userId": "amzn1..." }
```

### Consent Management
- Marketing | Analytics | Personalization
- Grant, query, withdraw consent

### GDPR
- `GET /gdpr/export/:id` - Data export
- `POST /gdpr/delete` - Right to erasure

---

## Slide 13: Architecture

```
┌─────────────────────────────────────────┐
│           AI Agents / LLMs              │
└──────────────────┬──────────────────────┘
                   │ MCP / A2A / REST
┌──────────────────▼──────────────────────┐
│            UCP API Layer                │
│  Discovery │ Cart │ Checkout │ Orders   │
└──────────────────┬──────────────────────┘
                   │ Wix SDK
┌──────────────────▼──────────────────────┐
│         Wix eCommerce Platform          │
│   Products │ Cart │ Checkout │ Payments │
└─────────────────────────────────────────┘
```

---

## Slide 14: Test Coverage

| Phase | Tests | Coverage |
|-------|-------|----------|
| 7-10 | 45 | Orders, Validation, Fulfillment, Discounts |
| 11 | 35 | Payment Handlers |
| 12 | 20 | Server Checkout |
| 13 | 40 | MCP + A2A |
| 14 | 36 | Identity + Consent |
| **Total** | **176** | **100%** |

All tests passing ✅

---

## Slide 15: Live Demo

**Production**: https://wix-ucp-tpa.onrender.com

| Interface | URL |
|-----------|-----|
| Discovery | `/.well-known/ucp` |
| AI Chat | `/test/llm` |
| Full Test UI | `/test/full` |
| Storefront | `/test/storefront` |

---

## Slide 16: Summary

### ✅ Complete UCP Implementation

- **10 Capabilities** fully implemented
- **All 8 Playground steps** covered
- **2 Protocol Bindings** (MCP + A2A)
- **176 Tests** passing
- **Production deployed** on Render

### Powered By
- Wix eCommerce SDK
- Express.js + TypeScript
- Zod validation

**UCP Spec Version**: 1.0 | **Status**: 100% Complete 🎉
