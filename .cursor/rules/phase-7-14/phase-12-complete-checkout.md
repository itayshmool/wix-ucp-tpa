# Phase 12: Complete Checkout ✅ COMPLETE

## Overview

Implemented server-side checkout completion, enabling AI agents to complete purchases without requiring a redirect to Wix hosted checkout.

## Endpoints Implemented

### Complete Checkout

```
POST /ucp/checkout/:checkoutId/complete
```

Completes a checkout using a minted payment instrument.

**Request:**
```json
{
  "instrumentId": "inst_sandbox_abc123",
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
  "buyerNote": "Leave at door",
  "idempotencyKey": "unique-key-123"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_abc123",
    "number": "ORD-1001",
    "status": "APPROVED",
    "paymentStatus": "PAID",
    "fulfillmentStatus": "NOT_FULFILLED",
    "items": [...],
    "totals": {
      "subtotal": { "amount": 25.99, "currency": "USD", "formatted": "$25.99" },
      "total": { "amount": 25.99, "currency": "USD", "formatted": "$25.99" }
    },
    "createdAt": "2026-01-18T21:48:34.245Z"
  },
  "transaction": {
    "id": "txn_xyz789",
    "instrumentId": "inst_sandbox_abc123",
    "amount": 25.99,
    "currency": "USD",
    "status": "completed",
    "processedAt": "2026-01-18T21:48:34.245Z"
  }
}
```

### Test Complete Flow

```
POST /ucp/test/complete-checkout
```

Combines checkout creation, instrument minting, and completion in one call for testing.

**Request:**
```json
{
  "amount": 25.99,
  "currency": "USD",
  "cardNumber": "4242424242424242"
}
```

## Complete UCP Checkout Flow

```
1. Browse Products        GET  /ucp/products
2. Add to Cart           POST /ucp/cart
3. Create Checkout       POST /ucp/checkout
4. Apply Coupon          POST /ucp/checkout/:id/coupons  (optional)
5. Mint Instrument       POST /ucp/checkout/:id/mint
6. Complete Checkout     POST /ucp/checkout/:id/complete  ← Phase 12
7. Order Created!        Returns order + transaction
```

## Error Codes

| Code | Description |
|------|-------------|
| `CHECKOUT_NOT_FOUND` | Checkout ID doesn't exist |
| `CHECKOUT_ALREADY_COMPLETED` | Checkout was already completed |
| `CHECKOUT_EXPIRED` | Checkout is older than 24 hours |
| `INSTRUMENT_NOT_FOUND` | Instrument ID doesn't exist |
| `INSTRUMENT_INVALID` | Instrument is not valid |
| `INSTRUMENT_EXPIRED` | Instrument has expired (30 min) |
| `INSTRUMENT_ALREADY_USED` | Instrument was already used |
| `AMOUNT_MISMATCH` | Instrument amount ≠ checkout amount |
| `CURRENCY_MISMATCH` | Instrument currency ≠ checkout currency |
| `PAYMENT_FAILED` | Payment processing failed |
| `ORDER_CREATION_FAILED` | Failed to create order |

## New Capability

Added `server_checkout` to UCP discovery capabilities.

## Files

- `src/services/checkout/complete-checkout.types.ts` - Type definitions
- `src/services/checkout/complete-checkout.service.ts` - Service implementation
- `src/routes/ucp.routes.ts` - API endpoints
- `tests/ucp-phase12-complete.test.ts` - 15 tests

## Tests

15 comprehensive tests covering:
- Successful checkout completion
- Order items and totals
- Billing/shipping addresses
- Validation errors (missing instrument, mismatch, etc.)
- Already used/completed scenarios
- Idempotency
- Transaction details
