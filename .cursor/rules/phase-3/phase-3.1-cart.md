# Phase 3.1: Cart Management

## Context
Before checkout, customers have a cart. External apps can create and manage carts programmatically.

## Reference Documentation
- Cart API: https://dev.wix.com/docs/rest/business-solutions/e-commerce/cart

## Goal
Create carts programmatically from external applications.

---

## Tasks

### 1. Cart Types (src/services/types/cart.types.ts)

Cart: id, lineItems[], buyerInfo, currency, subtotal, appliedDiscounts[], buyerNote, createdAt, updatedAt

CartLineItem: id, productId, quantity, catalogReference, productName, price, lineItemPrice, media, sku, weight

AppliedDiscount: discountType, lineItemIds, coupon, discountAmount

AddToCartItem: catalogReference (catalogItemId, appId, options), quantity

CartOptions: currency, buyerNote, couponCode

Money: amount (string), currency, formattedAmount

WIX_STORES_APP_ID constant: '215238eb-22a5-4c36-9e7b-e7c08025e04e'

### 2. Cart Service (src/services/cart/cart.service.ts)

CartService class:
- createCart(options?): Promise<Cart>
- getCart(cartId): Promise<Cart>
- addToCart(cartId, items): Promise<Cart>
- updateLineItemQuantity(cartId, lineItemId, quantity): Promise<Cart>
- removeLineItem(cartId, lineItemId): Promise<Cart>
- applyCoupon(cartId, couponCode): Promise<Cart>
- removeCoupon(cartId, couponId): Promise<Cart>
- deleteCart(cartId): Promise<void>
- createCartWithItems(items, options?): Promise<Cart>
- buildCatalogReference(productId, variantId?, options?): CatalogReference

### 3. API Endpoints
- POST /ecom/v1/carts
- GET /ecom/v1/carts/{cartId}
- POST /ecom/v1/carts/{cartId}/add-to-cart
- POST /ecom/v1/carts/{cartId}/update-line-items-quantity
- POST /ecom/v1/carts/{cartId}/remove-line-items
- POST /ecom/v1/carts/{cartId}/add-coupon
- DELETE /ecom/v1/carts/{cartId}

### 4. External API Routes
- POST /external/cart - Create cart with items
- POST /external/cart/:cartId/items - Add items
- DELETE /external/cart/:cartId/items/:lineItemId - Remove item

All external routes require instanceId in body for validation.

---

## Permissions Required
- WIX_ECOM.READ_CARTS
- WIX_ECOM.MANAGE_CARTS

---

## Acceptance Criteria
- [ ] Cart can be created programmatically
- [ ] Items can be added with product ID and variant
- [ ] Item quantity can be updated
- [ ] Items can be removed
- [ ] Coupon codes can be applied
- [ ] Cart total is calculated correctly
- [ ] External API endpoints work
- [ ] Cart ID is returned for checkout flow
