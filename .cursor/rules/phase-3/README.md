# Phase 3: External Checkout

Enable external applications to create checkouts and process orders.

## Goals
- Create carts programmatically
- Generate Wix hosted checkout URLs
- Redirect customers to payment
- Track order completion

## Guides in This Phase

### 3.1 Cart Management
- Create carts via API
- Add/remove/update items
- Apply discount codes
- Build catalog references for products

### 3.2 Hosted Checkout & Redirect
- Create checkout from cart
- Get checkout URL from Wix
- Redirect customer to Wix payment page
- Handle success/cancel callbacks
- Pre-fill buyer and shipping info

### 3.3 Order Completion & Webhook Handling
- Handle order created webhooks
- Track external order references
- Emit order events for downstream processing
- Register external webhooks
- Dispatch events to external systems

## Prerequisites
- Phase 1 completed (OAuth working)
- Phase 2.1 completed (Products for cart items)

## Order of Implementation
3.1 → 3.2 → 3.3

## Complete Flow
```
1. External App creates Cart
2. External App adds items to Cart
3. External App creates Checkout from Cart
4. External App gets Checkout URL
5. External App redirects customer
6. Customer completes payment on Wix
7. Wix creates Order
8. Webhook notifies your app
9. Your app notifies external system
```

## Required Wix Permissions
- `WIX_ECOM.READ_CARTS`
- `WIX_ECOM.MANAGE_CARTS`
- `WIX_ECOM.READ_CHECKOUTS`
- `WIX_ECOM.MANAGE_CHECKOUTS`
- `WIX_ECOM.READ_ORDERS`

## Key Deliverables
- ✅ Carts created via API
- ✅ Checkout URL generated
- ✅ Customer redirected to Wix
- ✅ Payment completed
- ✅ Order webhooks received
- ✅ External systems notified
- ✅ End-to-end flow works
