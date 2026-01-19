# Wix API Requirements for UCP Server-Side Checkout

---

## Slide 1: The Vision

**LLM Completes Purchases Without Browser**

```
User: "Buy a Red Bull"
        ↓
Gemini: Shows Google Pay in chat
        ↓
User: Authenticates (fingerprint)
        ↓
Gemini: Sends token to merchant
        ↓
Merchant: Processes via Wix API  ← MISSING
        ↓
Order Created ✓
```

---

## Slide 2: Current Limitation

**Today: Browser Required**

| Step | Current Flow |
|------|--------------|
| 1 | LLM creates checkout |
| 2 | Returns Wix Checkout **URL** |
| 3 | User opens URL in **browser** |
| 4 | User clicks Google Pay on **Wix page** |
| 5 | Order created |

**Problem**: Steps 3-4 require browser interaction

---

## Slide 3: The Gap

**Missing Wix API Capability**

| Endpoint | Exists? |
|----------|---------|
| Create Checkout | ✅ |
| Get Checkout URL | ✅ |
| Update Checkout | ✅ |
| Apply Coupon | ✅ |
| **Complete with Token** | ❌ |
| **Accept Google Pay Token** | ❌ |

---

## Slide 4: Required API #1

**`POST /checkouts/{id}/completeWithToken`**

```json
// REQUEST
{
  "paymentToken": {
    "type": "GOOGLE_PAY",
    "token": "eyJhbGciOiJBMjU2R0NNIi..."
  },
  "billingAddress": { ... }
}

// RESPONSE  
{
  "order": { "id": "order_123", "status": "PAID" },
  "transaction": { "id": "txn_456", "status": "CAPTURED" }
}
```

---

## Slide 5: Required API #2

**`GET /payment-tokens/supported`**

```json
{
  "supportedTokenTypes": [
    {
      "type": "GOOGLE_PAY",
      "enabled": true,
      "networks": ["VISA", "MASTERCARD"]
    },
    {
      "type": "APPLE_PAY",
      "enabled": true
    }
  ]
}
```

**Purpose**: Tell platforms what tokens we accept

---

## Slide 6: Required API #3

**`POST /payment-tokens/validate`**

```json
// REQUEST
{
  "tokenType": "GOOGLE_PAY",
  "token": "eyJhbGci...",
  "expectedAmount": "29.99"
}

// RESPONSE
{
  "valid": true,
  "cardNetwork": "VISA",
  "cardLast4": "1234"
}
```

**Purpose**: Validate token before checkout

---

## Slide 7: Token Flow

```
PLATFORM          MERCHANT           WIX
(Gemini)          (UCP TPA)          PAYMENTS
   │                  │                  │
   │──1. Create ─────▶│──2. Create ─────▶│
   │◀─────────────────│◀─────────────────│
   │                  │                  │
   │  3. Google Pay   │                  │
   │  4. User auth    │                  │
   │                  │                  │
   │──5. Send token ─▶│──6. Complete ───▶│
   │                  │   with token     │
   │                  │◀──7. Order ──────│
   │◀─────────────────│                  │
```

---

## Slide 8: Security

**Token Handling Requirements**

| Requirement | Description |
|-------------|-------------|
| PCI DSS | Wix handles decryption |
| Encrypted | Token encrypted to Wix key |
| One-Time | Single use only |
| Time-Limited | 10-15 min expiry |
| Amount-Bound | Tied to specific total |

**Wix already has this internally**

---

## Slide 9: Competitor Comparison

| Capability | Wix | Shopify | Stripe |
|------------|:---:|:-------:|:------:|
| Hosted Checkout | ✅ | ✅ | ✅ |
| Create Checkout API | ✅ | ✅ | ✅ |
| Accept External Token | ❌ | ✅ | ✅ |
| Server-Side Complete | ❌ | ✅ | ✅ |

**Wix is behind on headless payments**

---

## Slide 10: Error Codes Needed

| Code | Meaning |
|------|---------|
| `INVALID_TOKEN` | Bad format |
| `TOKEN_EXPIRED` | Too old (>15 min) |
| `AMOUNT_MISMATCH` | Token ≠ checkout |
| `PAYMENT_DECLINED` | Card refused |
| `INSUFFICIENT_FUNDS` | Limit exceeded |
| `CHECKOUT_EXPIRED` | Checkout >24h old |

---

## Slide 11: Implementation Effort

| Phase | Scope | Time |
|-------|-------|------|
| A | Token validation | 2 wks |
| B | Complete with token | 4 wks |
| C | Multi-gateway | 4 wks |
| D | Apple Pay support | 2 wks |
| E | Docs & SDK | 2 wks |

**Total**: ~14 weeks

---

## Slide 12: Business Value

| Benefit | Impact |
|---------|--------|
| **AI Commerce** | Gemini, Alexa, ChatGPT |
| **UCP Compliance** | Full protocol support |
| **Competitive** | First headless on Wix |
| **Conversion** | Frictionless checkout |

**AI commerce is the future**

---

## Slide 13: Summary

**3 APIs Wix Needs to Provide**

```
1. POST /checkouts/{id}/completeWithToken
   → Accept Google/Apple Pay tokens
   → Process payment server-side
   → Return order immediately

2. GET /payment-tokens/supported
   → List accepted token types

3. POST /payment-tokens/validate
   → Pre-validate before completing
```

---

## Slide 14: Call to Action

**Request to Wix Product Team**

> Enable headless payment token processing 
> to support AI commerce platforms.

| Item | Value |
|------|-------|
| Priority | **High** |
| Impact | AI-first commerce |
| Effort | ~14 weeks |
| Benefit | New market category |

**This unlocks conversational commerce** 🚀

---

*Prepared for Wix Product & Engineering*
*January 2026*
