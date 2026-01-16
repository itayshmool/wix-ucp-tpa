# Phase 4.2: UCP Checkout Capability

## Context
The Checkout capability is the core of UCP shopping. We bridge UCP's checkout model to Wix Cart/Checkout APIs.

## Reference Documentation
- Checkout Spec: https://ucp.dev/specification/checkout
- Checkout REST: https://ucp.dev/specification/checkout-rest

## Goal
Implement UCP Checkout capability backed by Wix APIs.

---

## UCP Checkout Flow
```
AI Agent (Platform)              Our TPA (Business)                 Wix APIs
       |-- Create Checkout Session ---->|-- Create Cart ------------->|
       |<-- Session (incomplete) -------|<-- Cart ID -----------------|
       |-- Update Session (add items) ->|-- Add to Cart ------------->|
       |<-- Updated Session ------------|                             |
       |-- Complete Session ----------->|-- Create Wix Checkout ----->|
       |                                |<-- Checkout URL ------------|
       |<-- { continue_url } -----------|                             |
```

Key: Complete returns `requires_escalation` with `continue_url` for redirect.

---

## Tasks

### 1. Checkout Types (src/ucp/types/checkout.types.ts)

CheckoutStatus: 'incomplete' | 'requires_escalation' | 'complete'

UCPLineItem: id, product_id, product_name, quantity, unit_price, total_price, image_url?, sku?, variant_id?, options[]

UCPBuyerInfo: email?, first_name?, last_name?, phone?

UCPShippingInfo: address, shipping_option?

UCPTotals: subtotal, shipping?, tax?, discount?, total

UCPPaymentData: id?, handler_id, type?, brand?, last_digits?, billing_address?, credential { type, token }

UCPCheckoutSession: id, status, line_items[], buyer_info?, shipping_info?, totals, currency, created_at, updated_at, payment { handlers[] }, discounts[]?, fulfillment?

UCPDiscount: id, code?, name, type, value, applied_amount

UCPFulfillment: type, options[]?, selected_option_id?

CreateCheckoutRequest: line_items[]?, buyer_info?, currency?

UpdateCheckoutRequest: line_items[]?, buyer_info?, shipping_info?, discount_codes[]?

CompleteCheckoutRequest: payment_data?, risk_signals?

CompleteCheckoutResponse: status, order_id?, continue_url?, messages[]?

### 2. UCP Checkout Service (src/ucp/services/checkout.service.ts)

UCPCheckoutService class:
- createSession(request): Promise<UCPCheckoutSession>
  → Creates Wix Cart
- getSession(sessionId): Promise<UCPCheckoutSession>
  → Gets Wix Cart
- updateSession(sessionId, request): Promise<UCPCheckoutSession>
  → Updates Wix Cart (add/remove items, apply discounts)
- completeSession(sessionId, request): Promise<CompleteCheckoutResponse>
  → Creates Wix Checkout, returns continue_url
- deleteSession(sessionId): Promise<void>
  → Deletes Wix Cart
- cartToUCPSession(cart, buyerInfo?, shippingInfo?): UCPCheckoutSession
- toUCPMoney(money): UCPMoney (convert to minor units)
- getPaymentConfig(): { handlers[] }

### 3. Data Mapping

Wix Cart → UCP Session:
- cart.id → session.id
- cart.lineItems → session.line_items
- cart.subtotal → session.totals.subtotal
- cart.currency → session.currency
- cart.appliedDiscounts → session.discounts

Money: Wix decimals → UCP minor units (multiply by 100)
Dates: RFC 3339 format (.toISOString())

### 4. Checkout Routes (src/ucp/routes/checkout.routes.ts)

POST /ucp/v1/checkout-sessions → createSession (201)
GET /ucp/v1/checkout-sessions/:id → getSession (200)
PATCH /ucp/v1/checkout-sessions/:id → updateSession (200)
POST /ucp/v1/checkout-sessions/:id/complete → completeSession (200)
DELETE /ucp/v1/checkout-sessions/:id → deleteSession (204)

All routes apply UCP request middleware and return UCP envelope.

### 5. Extensions

Discounts (dev.ucp.shopping.discount):
- Accept discount_codes in update
- Apply via Wix coupon API
- Include in response

Fulfillment (dev.ucp.shopping.fulfillment):
- Include fulfillment type
- List shipping options

### 6. Completion Callback

GET /ucp/checkout/success
- Display success, post message to parent window

---

## Error Codes
- session_not_found
- invalid_product
- out_of_stock
- invalid_discount
- checkout_failed

---

## Acceptance Criteria
- [ ] Create session returns valid UCP format
- [ ] Session ID = Wix Cart ID
- [ ] Line items can be added/updated/removed
- [ ] Discount codes work (extension)
- [ ] Complete returns continue_url
- [ ] Money in minor units
- [ ] Dates in RFC 3339
- [ ] Responses include UCP envelope
- [ ] Errors follow UCP format
