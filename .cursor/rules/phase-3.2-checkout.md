# Phase 3.2: Hosted Checkout & Redirect

## Context
Convert a cart to checkout and redirect the customer to Wix's hosted checkout page.

## Reference Documentation
- Checkout API: https://dev.wix.com/docs/rest/business-solutions/e-commerce/checkout

## Goal
Enable external applications to create checkouts and redirect customers.

---

## Complete Flow
```
1. External App creates Cart (Phase 3.1)
2. External App calls "Create Checkout from Cart" 
3. External App calls "Get Checkout URL"
4. External App redirects customer to Wix Checkout URL
5. Customer completes payment on Wix
6. Wix redirects to success/thank you page
7. Webhook notifies your app of order creation
```

---

## Tasks

### 1. Checkout Types (src/services/types/checkout.types.ts)

CheckoutStatus: CREATED, COMPLETED, ABANDONED

Checkout: id, cartId, lineItems[], billingInfo, shippingInfo, buyerInfo, priceSummary, appliedDiscounts, paymentStatus, status, currency, checkoutUrl, createdAt, updatedAt

CheckoutLineItem: id, productId, quantity, name, sku, price, totalPrice, media, options[]

BuyerInfo: contactId, visitorId, email, firstName, lastName, phone

BillingInfo: address, contactDetails

ShippingInfo: address, contactDetails, shippingOption

CreateCheckoutOptions: channelType, buyerInfo, shippingAddress, billingAddress

CheckoutUrlOptions: successUrl, cancelUrl, thankYouPageUrl

### 2. Checkout Service (src/services/checkout/checkout.service.ts)

CheckoutService class:
- createCheckoutFromCart(cartId, options?): Promise<Checkout>
- createCheckout(lineItems, options?): Promise<Checkout>
- getCheckout(checkoutId): Promise<Checkout>
- getCheckoutUrl(checkoutId, options?): Promise<string> **KEY METHOD**
- updateBuyerInfo(checkoutId, buyerInfo): Promise<Checkout>
- updateShippingAddress(checkoutId, address, contactDetails?): Promise<Checkout>
- getCheckoutUrlFromCart(cartId, options?): Promise<{ checkoutId, checkoutUrl }>

### 3. API Endpoints
- POST /ecom/v1/checkouts/from-cart
- POST /ecom/v1/checkouts
- GET /ecom/v1/checkouts/{checkoutId}
- POST /ecom/v1/checkouts/{checkoutId}/get-checkout-url **CRITICAL**

### 4. External API Endpoints
- POST /external/checkout - Create checkout and get redirect URL
- POST /external/checkout/direct - One-shot checkout without cart
- GET /external/checkout/:checkoutId/status - Check completion

### 5. Success Page
GET /checkout/success
- Receives orderId, checkoutId from Wix
- Display thank you message
- Post message to parent window if iframe/popup

---

## Permissions Required
- WIX_ECOM.READ_CHECKOUTS
- WIX_ECOM.MANAGE_CHECKOUTS

---

## Acceptance Criteria
- [ ] Checkout can be created from cart
- [ ] Checkout URL is retrieved correctly
- [ ] Customer redirected to Wix hosted checkout
- [ ] Buyer info can be pre-filled
- [ ] Shipping address can be pre-filled
- [ ] Success/Thank you redirect works
- [ ] Order webhook received after payment
- [ ] Checkout status can be queried
