# Server-Side Checkout for AI Commerce
## UCP (Universal Commerce Protocol) Implementation

---

## The Problem

```
   AI Agent              Website              Payment Page
      │                     │                      │
      │  "Buy this item"    │                      │
      │ ─────────────────>  │                      │
      │                     │                      │
      │  "Click this URL"   │                      │
      │ <─────────────────  │                      │
      │                     │                      │
      ╳  ❌ BLOCKED - Agent can't click or fill forms
```

**AI agents cannot:** Click URLs • Fill forms • Handle redirects • Complete CAPTCHAs

---

## The Solution

```
   AI Agent              UCP Server           Order Created
      │                      │                     │
      │  1. Add to cart      │                     │
      │ ──────────────────>  │                     │
      │  2. Create checkout  │                     │
      │ ──────────────────>  │                     │
      │  3. Mint instrument  │                     │
      │ ──────────────────>  │                     │
      │  4. Complete         │  ────────────────>  │
      │ ──────────────────>  │     ✅ ORDER        │
      │  <──── confirmation ─┴─────────────────────│
```

**Pure API - no redirects, no forms, no browser needed!**

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              AI Agent Layer                          │
│    (ChatGPT, Claude, Custom LLM, MCP Tools)         │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│              UCP Protocol Layer                      │
│  [ Catalog ]  [ Cart ]  [ Payment ]  [ Checkout ]   │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│              Commerce Backend                        │
│         (Wix eCommerce, Shopify, Custom)            │
└──────────────────────────────────────────────────────┘
```

---

## Step 1: Discovery

```bash
GET /.well-known/ucp
```
```json
{
  "merchant": { "name": "Pop Stop Drink", "currency": "USD" },
  "capabilities": ["catalog_search", "cart_management", 
                   "checkout", "payment_handlers", "server_checkout"],
  "payment_handlers": ["com.wix.checkout.v1", "com.ucp.sandbox"]
}
```

---

## Step 2: Browse & Add to Cart

```bash
GET /ucp/products?search=energy+drink
```
```bash
POST /ucp/cart
{ "items": [{ "productId": "prod_123", "quantity": 2 }] }
```
**Response:** `{ "cartId": "cart_abc123", "total": "$25.98" }`

---

## Step 3: Create Checkout

```bash
POST /ucp/checkout
{ "cartId": "cart_abc123" }
```
```json
{
  "checkoutId": "checkout_xyz789",
  "totals": { "subtotal": "$25.98", "tax": "$2.08", "total": "$28.06" }
}
```

---

## Step 4: Mint Payment Instrument

```bash
POST /ucp/checkout/checkout_xyz789/mint
{
  "handlerId": "com.ucp.sandbox",
  "amount": 28.06,
  "currency": "USD",
  "paymentData": { "cardNumber": "4242424242424242" }
}
```
```json
{
  "instrument": {
    "id": "inst_sandbox_abc123",
    "display": { "brand": "Visa", "last4": "4242" },
    "status": "active",
    "expiresAt": "2026-01-18T22:30:00Z"
  }
}
```

---

## Step 5: Complete Checkout

```bash
POST /ucp/checkout/checkout_xyz789/complete
{ "instrumentId": "inst_sandbox_abc123" }
```
```json
{
  "success": true,
  "order": {
    "id": "order_def456", "number": "ORD-1001",
    "status": "APPROVED", "paymentStatus": "PAID"
  },
  "transaction": { "id": "txn_ghi789", "status": "completed" }
}
```
**🎉 Order complete via pure API!**

---

## Security: Instrument Validation

```
┌─────────────────────────────────────────┐
│        Instrument Validation            │
├─────────────────────────────────────────┤
│  ✓ Amount matches checkout total        │
│  ✓ Currency matches checkout currency   │
│  ✓ Instrument not expired (30 min)      │
│  ✓ Instrument not already used          │
│  ✓ Checkout not already completed       │
│  ✓ Checkout not expired (24 hours)      │
└─────────────────────────────────────────┘
```

---

## Security: Single-Use Tokens

```
  Mint              Use                Reject
   │                 │                   │
   ▼                 ▼                   ▼
┌──────┐         ┌──────┐          ┌──────────┐
│ACTIVE│ ──────> │ USED │ ────X──> │ BLOCKED  │
└──────┘         └──────┘          └──────────┘
```

**Each instrument can only be used ONCE - prevents double-charging**

---

## Security: Idempotency & Expiration

**Idempotency:** Same key = same response (no duplicate charges)
```json
{ "instrumentId": "inst_abc", "idempotencyKey": "unique-123" }
```

| Request | Result |
|---------|--------|
| 1st call | Creates order |
| 2nd call | Returns cached (no charge) |

**Expiration:** Instrument: 30 min • Checkout: 24 hours

---

## Error Codes

| Code | Description |
|------|-------------|
| `CHECKOUT_NOT_FOUND` | Checkout doesn't exist |
| `CHECKOUT_ALREADY_COMPLETED` | Already purchased |
| `INSTRUMENT_NOT_FOUND` | Invalid instrument |
| `INSTRUMENT_EXPIRED` | > 30 minutes old |
| `INSTRUMENT_ALREADY_USED` | Double-use attempt |
| `AMOUNT_MISMATCH` | Instrument ≠ checkout |
| `PAYMENT_DECLINED` | Card declined |

---

## Test Cards (Sandbox)

| Card Number | Result |
|-------------|--------|
| `4242424242424242` | ✅ Success |
| `4000000000000002` | ❌ Declined |
| `4000000000009995` | ❌ Insufficient funds |
| `4000000000000069` | ❌ Expired card |

---

## Comparison

| Feature | Hosted Checkout | Server-Side |
|---------|-----------------|-------------|
| Browser redirect | Required | ❌ Not needed |
| AI compatible | ❌ No | ✅ Yes |
| Form filling | Required | ❌ Not needed |
| API-only | ❌ No | ✅ Yes |

---

## API Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/.well-known/ucp` | Discovery |
| GET | `/ucp/products` | Browse catalog |
| POST | `/ucp/cart` | Create cart |
| POST | `/ucp/checkout` | Create checkout |
| POST | `/ucp/checkout/:id/mint` | Mint instrument |
| POST | `/ucp/checkout/:id/complete` | **Complete order** |

---

## Live Demo

**Production:** `https://wix-ucp-tpa.onrender.com`

**Quick Test:**
```bash
curl -X POST https://wix-ucp-tpa.onrender.com/ucp/test/complete-checkout \
  -H "Content-Type: application/json" \
  -d '{"amount": 19.99}'
```

**Test UI:** `https://wix-ucp-tpa.onrender.com/test/full`

---

## What's Next

| Category | Enhancements |
|----------|--------------|
| **Payments** | Stripe, PayPal, Apple/Google Pay |
| **Security** | 3D Secure, Fraud detection, Rate limiting |
| **Protocol** | Subscriptions, Multi-merchant, Cross-border |

---

## Summary

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  🤖 AI Agent + 🛒 E-commerce = 💳 Server Checkout  │
│                                                    │
│  ✅ No redirects      ✅ Single-use tokens         │
│  ✅ No form filling   ✅ Idempotency protection    │
│  ✅ Pure API-based    ✅ AI-native commerce        │
│                                                    │
└────────────────────────────────────────────────────┘
```

**The future of commerce is conversational. We built the bridge.**
