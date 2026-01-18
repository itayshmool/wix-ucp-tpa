# Server-Side Checkout for AI Commerce

## UCP (Universal Commerce Protocol) Implementation

---

## The Problem

### Traditional E-commerce Checkout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   AI Agent          Website              Payment Page           │
│      │                 │                      │                 │
│      │  "Buy this"     │                      │                 │
│      │ ────────────>   │                      │                 │
│      │                 │                      │                 │
│      │  "Here's a URL" │                      │                 │
│      │ <────────────── │                      │                 │
│      │                 │                      │                 │
│      │     ❌ BLOCKED - Agent can't click URLs or fill forms   │
│      │                 │                      │                 │
└─────────────────────────────────────────────────────────────────┘
```

**AI agents cannot:**
- Click links or navigate to URLs
- Fill in payment forms
- Complete CAPTCHA verification
- Handle browser redirects

---

## The Solution

### Server-Side Checkout Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   AI Agent              UCP Server            Order Created     │
│      │                      │                      │            │
│      │  1. Add to cart      │                      │            │
│      │ ──────────────────>  │                      │            │
│      │                      │                      │            │
│      │  2. Create checkout  │                      │            │
│      │ ──────────────────>  │                      │            │
│      │                      │                      │            │
│      │  3. Mint instrument  │                      │            │
│      │ ──────────────────>  │                      │            │
│      │                      │                      │            │
│      │  4. Complete         │   ───────────────>   │            │
│      │ ──────────────────>  │      ✅ ORDER        │            │
│      │                      │                      │            │
│      │  <──── Order confirmation ────────────────  │            │
│      │                      │                      │            │
└─────────────────────────────────────────────────────────────────┘
```

**Everything happens via API calls - no redirects needed!**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Agent Layer                          │
│  (ChatGPT, Claude, Custom LLM, MCP Tools)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     UCP Protocol Layer                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │  Catalog  │  │   Cart    │  │  Payment  │  │  Checkout   │  │
│  │  Search   │  │  Manage   │  │  Handler  │  │  Complete   │  │
│  └───────────┘  └───────────┘  └───────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Commerce Backend                             │
│  (Wix eCommerce, Shopify, Custom)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Complete Flow

### Step 1: Discovery

```bash
GET /.well-known/ucp
```

```json
{
  "protocol": "ucp",
  "version": "1.0",
  "merchant": {
    "name": "Pop Stop Drink",
    "currency": "USD"
  },
  "capabilities": [
    "catalog_search",
    "cart_management",
    "checkout",
    "payment_handlers",
    "server_checkout"
  ],
  "payment_handlers": [
    "com.wix.checkout.v1",
    "com.ucp.sandbox"
  ]
}
```

---

### Step 2: Browse & Add to Cart

```bash
# Search products
GET /ucp/products?search=energy+drink

# Add to cart
POST /ucp/cart
{
  "items": [
    { "productId": "prod_123", "quantity": 2 }
  ]
}
```

---

### Step 3: Create Checkout

```bash
POST /ucp/checkout
{
  "cartId": "cart_abc123"
}
```

**Response:**
```json
{
  "checkoutId": "checkout_xyz789",
  "totals": {
    "subtotal": "$25.98",
    "tax": "$2.08",
    "total": "$28.06"
  }
}
```

---

### Step 4: Mint Payment Instrument

```bash
POST /ucp/checkout/checkout_xyz789/mint
{
  "handlerId": "com.ucp.sandbox",
  "amount": 28.06,
  "currency": "USD",
  "paymentData": {
    "cardNumber": "4242424242424242"
  }
}
```

**Response:**
```json
{
  "success": true,
  "instrument": {
    "id": "inst_sandbox_abc123",
    "type": "sandbox",
    "display": {
      "brand": "Visa",
      "last4": "4242"
    },
    "status": "active",
    "expiresAt": "2026-01-18T22:30:00Z"
  }
}
```

---

### Step 5: Complete Checkout

```bash
POST /ucp/checkout/checkout_xyz789/complete
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
  }
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_def456",
    "number": "ORD-1001",
    "status": "APPROVED",
    "paymentStatus": "PAID",
    "fulfillmentStatus": "NOT_FULFILLED",
    "items": [
      {
        "name": "Energy Drink",
        "quantity": 2,
        "price": { "amount": 12.99, "formatted": "$12.99" }
      }
    ],
    "totals": {
      "subtotal": { "formatted": "$25.98" },
      "tax": { "formatted": "$2.08" },
      "total": { "formatted": "$28.06" }
    }
  },
  "transaction": {
    "id": "txn_ghi789",
    "status": "completed",
    "processedAt": "2026-01-18T21:48:34Z"
  }
}
```

**🎉 Order complete - no redirects, no forms, pure API!**

---

## Security Model

### 1. Payment Instrument Validation

```
┌─────────────────────────────────────────────┐
│           Instrument Validation             │
├─────────────────────────────────────────────┤
│                                             │
│  ✓ Amount matches checkout total            │
│  ✓ Currency matches checkout currency       │
│  ✓ Instrument is not expired (30 min)       │
│  ✓ Instrument is not already used           │
│  ✓ Checkout is not already completed        │
│  ✓ Checkout is not expired (24 hours)       │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 2. Single-Use Tokens

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   Mint                  Use                    Reject          │
│    │                     │                       │             │
│    ▼                     ▼                       ▼             │
│  ┌──────┐            ┌──────┐              ┌──────────┐        │
│  │ACTIVE│ ────────>  │ USED │ ────────X──> │ BLOCKED  │        │
│  └──────┘            └──────┘              └──────────┘        │
│                                                                │
│  Instrument can only be used ONCE                              │
│  Prevents double-charging                                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### 3. Idempotency Protection

```bash
POST /ucp/checkout/xyz/complete
{
  "instrumentId": "inst_abc",
  "idempotencyKey": "unique-request-123"
}
```

| Request | Idempotency Key | Result |
|---------|-----------------|--------|
| 1st | `unique-123` | Creates order, charges card |
| 2nd | `unique-123` | Returns cached response (no charge) |
| 3rd | `unique-123` | Returns cached response (no charge) |

**Network retries don't cause duplicate orders!**

---

### 4. Time-Based Expiration

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Instrument Minted                                          │
│        │                                                    │
│        │  ←──── 30 minute window ────→                      │
│        │                              │                     │
│        ▼                              ▼                     │
│   ┌─────────┐                   ┌─────────┐                 │
│   │ ACTIVE  │                   │ EXPIRED │                 │
│   │ Can use │                   │ Rejected│                 │
│   └─────────┘                   └─────────┘                 │
│                                                             │
│  Checkout: 24 hour expiration                               │
│  Instrument: 30 minute expiration                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling

### Comprehensive Error Codes

| Code | Description | HTTP |
|------|-------------|------|
| `CHECKOUT_NOT_FOUND` | Checkout doesn't exist | 404 |
| `CHECKOUT_ALREADY_COMPLETED` | Already purchased | 400 |
| `CHECKOUT_EXPIRED` | Checkout > 24 hours old | 400 |
| `INSTRUMENT_NOT_FOUND` | Invalid instrument ID | 400 |
| `INSTRUMENT_EXPIRED` | Instrument > 30 min old | 400 |
| `INSTRUMENT_ALREADY_USED` | Double-use attempt | 400 |
| `AMOUNT_MISMATCH` | Instrument ≠ checkout | 400 |
| `CURRENCY_MISMATCH` | Currency doesn't match | 400 |
| `PAYMENT_DECLINED` | Card declined | 400 |

---

## Test Cards (Sandbox)

| Card Number | Result |
|-------------|--------|
| `4242424242424242` | ✅ Success |
| `4000000000000002` | ❌ Declined |
| `4000000000009995` | ❌ Insufficient funds |
| `4000000000000069` | ❌ Expired card |

```bash
# Test the full flow
POST /ucp/test/complete-checkout
{
  "amount": 25.99,
  "cardNumber": "4242424242424242"
}
```

---

## Capabilities Comparison

| Feature | Hosted Checkout | Server-Side Checkout |
|---------|-----------------|----------------------|
| Browser redirect | Required | Not needed |
| AI agent compatible | ❌ No | ✅ Yes |
| Form filling | Required | Not needed |
| API-only | ❌ No | ✅ Yes |
| PCI scope | Wix handles | Tokenized |
| User experience | Manual | Automated |

---

## API Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/.well-known/ucp` | Discovery |
| GET | `/ucp/products` | Browse catalog |
| POST | `/ucp/cart` | Create cart |
| POST | `/ucp/checkout` | Create checkout |
| POST | `/ucp/checkout/:id/coupons` | Apply discount |
| GET | `/ucp/payment-handlers` | List handlers |
| POST | `/ucp/checkout/:id/mint` | Mint instrument |
| POST | `/ucp/checkout/:id/complete` | **Complete order** |

---

## Live Demo

### Production Endpoint

```
https://wix-ucp-tpa.onrender.com
```

### Quick Test

```bash
curl -X POST https://wix-ucp-tpa.onrender.com/ucp/test/complete-checkout \
  -H "Content-Type: application/json" \
  -d '{"amount": 19.99, "currency": "USD"}'
```

### Test UI

```
https://wix-ucp-tpa.onrender.com/test/full
```

---

## What's Next

### Future Enhancements

1. **Real Payment Integration**
   - Stripe Connect
   - PayPal
   - Apple Pay / Google Pay

2. **Enhanced Security**
   - 3D Secure support
   - Fraud detection
   - Rate limiting

3. **Protocol Extensions**
   - Subscriptions
   - Multi-merchant checkout
   - Cross-border payments

---

## Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🤖 AI Agent + 🛒 E-commerce = 💳 Server-Side Checkout         │
│                                                                 │
│   ✅ No redirects                                               │
│   ✅ No form filling                                            │
│   ✅ Pure API-based                                             │
│   ✅ Secure token validation                                    │
│   ✅ Single-use instruments                                     │
│   ✅ Idempotency protection                                     │
│   ✅ AI-native commerce                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**The future of commerce is conversational. We built the bridge.**
