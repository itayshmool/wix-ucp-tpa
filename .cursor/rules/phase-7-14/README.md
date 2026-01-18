# Phases 7-14: UCP Spec Completion

Complete implementation of Universal Commerce Protocol per [ucp.dev/playground](https://ucp.dev/playground/) specification.

## Overview

These phases close the gaps between our current POC implementation and full UCP spec compliance, enabling:
- Server-side payment processing (not just redirect)
- Protocol bindings for AI agents (MCP, A2A)
- Full extension support (fulfillment, discounts, consent)
- Schema validation and proper error handling

## Current State vs UCP Spec

| UCP Playground Step | Current Status | Target Phase |
|---------------------|----------------|--------------|
| 1. Platform Profile | ✅ Partial | - |
| 2. Discovery | ✅ Complete | - |
| 3. Capability Negotiation | ✅ Basic | Phase 8 |
| 4. Create Checkout | ✅ Complete | - |
| 5. Update Checkout | ✅ Complete | - |
| 6. Mint Instrument | ❌ Missing | Phase 11 |
| 7. Complete Checkout | ❌ Missing | Phase 12 |
| 8. Webhooks | ✅ Structure | Phase 9 |

## Phase Summary

| Phase | Name | Priority | Complexity | Duration |
|-------|------|----------|------------|----------|
| 7 | UCP Order Capability | 🔴 High | 🟢 Low | 1-2 days |
| 8 | Schema Validation | 🟡 Medium | 🟢 Low | 2-3 days |
| 9 | Fulfillment Extension | 🟡 Medium | 🟡 Medium | 3-4 days |
| 10 | Discounts Extension | 🟡 Medium | 🟡 Medium | 2-3 days |
| 11 | Payment Handlers (Mint) | 🔴 High | 🔴 High | 1-2 weeks |
| 12 | Complete Checkout Flow | 🔴 High | 🔴 High | 1 week |
| 13 | Protocol Bindings | 🟡 Medium | 🔴 High | 2-3 weeks |
| 14 | Identity & Consent | 🟢 Low | 🟡 Medium | 1 week |

## Guides in This Phase Group

### Phase 7: UCP Order Capability (Quick Win)
- Wire existing `OrdersService` to UCP endpoints
- `GET /ucp/orders/:id` and `GET /ucp/orders`
- Map order data to UCP schema
- Update discovery with orders capability

### Phase 8: Schema Validation
- Add JSON schema validation (ajv/zod)
- Request/response schema enforcement
- UCP-compliant error responses (message.json)
- Schema version headers

### Phase 9: Fulfillment Extension
- Webhook registration for agents
- Push shipping events to registered callbacks
- Tracking info in order responses
- `GET /ucp/orders/:id/fulfillments`

### Phase 10: Discounts Extension
- Coupon code application in checkout
- `POST /ucp/checkout/:id/discounts`
- Discount validation and error codes
- Applied discounts in responses

### Phase 11: Payment Handlers (Mint Instrument)
- Payment handler registry
- `POST /ucp/payment-handlers/:id/mint`
- Google Pay handler implementation
- Sandbox/test handler for development
- Instrument storage and validation

### Phase 12: Complete Checkout Flow
- `POST /ucp/checkout/:id/complete`
- Process minted instruments
- 3DS/SCA authentication handling
- Server-side order creation
- Idempotency support

### Phase 13: Protocol Bindings
- **13A: MCP Binding** - Model Context Protocol integration
- **13B: A2A Binding** - Agent-to-Agent protocol
- Expose UCP as MCP tools
- Agent discovery and messaging

### Phase 14: Identity Linking & Buyer Consent
- Platform ↔ business identity mapping
- Consent capture and audit
- `POST /ucp/identity/link`
- Consent withdrawal flow

## Prerequisites
- Phases 1-6 completed (POC with Wix integration)
- Understanding of UCP spec (ucp.dev)
- Access to payment provider APIs (for Phase 11)

## Execution Order

**Recommended (Quick Wins First)**:
```
7 → 8 → 9 → 10 → 11 → 12 → 13 → 14
```

**Alternative (Critical Path)**:
```
7 → 11 → 12 → 8 → 9 → 10 → 13 → 14
```

## Key Files to Create/Modify

### New Files
```
src/routes/orders.routes.ts              # Phase 7
src/middleware/schema-validator.ts       # Phase 8
src/schemas/ucp/*.json                   # Phase 8
src/services/webhooks/                   # Phase 9
src/services/payment-handlers/           # Phase 11
  ├── index.ts
  ├── registry.ts
  ├── google-pay.handler.ts
  └── sandbox.handler.ts
src/mcp/                                 # Phase 13
  ├── server.ts
  └── tools/
```

### Modified Files
```
src/routes/ucp.routes.ts                 # All phases
src/services/ucp/ucp.types.ts            # All phases
src/wix/webhooks.ts                      # Phase 9
src/services/checkout/checkout.service.ts # Phase 12
```

## UCP Protocol References
- **Spec Overview**: https://ucp.dev/specification/overview
- **Checkout Capability**: https://ucp.dev/specification/checkout
- **Payment Handlers**: https://ucp.dev/specification/payment-handlers
- **Schema Authoring**: https://ucp.dev/specification/schema-authoring
- **Playground**: https://ucp.dev/playground/
