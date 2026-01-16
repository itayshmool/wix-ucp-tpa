# Phase 2.2: Orders Service

## Context
Access and manage orders placed on the merchant's store.

## Reference Documentation
- Orders API: https://dev.wix.com/docs/rest/business-solutions/e-commerce/orders
- Order Fulfillments: https://dev.wix.com/docs/rest/business-solutions/e-commerce/orders/order-fulfillments

## Goal
Create an orders service for reading, managing, and fulfilling orders.

---

## Tasks

### 1. Order Types (src/services/types/order.types.ts)

OrderStatus: INITIALIZED, APPROVED, CANCELED, FULFILLED, PARTIALLY_FULFILLED
PaymentStatus: NOT_PAID, PENDING, PAID, PARTIALLY_REFUNDED, FULLY_REFUNDED
FulfillmentStatus: NOT_FULFILLED, PARTIALLY_FULFILLED, FULFILLED

Order interface:
- id, number, status, paymentStatus, fulfillmentStatus
- buyer: { contactId, email, phone, firstName, lastName }
- lineItems: OrderLineItem[]
- shippingInfo: { address, deliveryOption, estimatedDelivery }
- billingInfo: { address }
- pricing: { subtotal, shipping, tax, discount, total }
- fulfillments: Fulfillment[]
- channelInfo: { type, externalOrderId }
- createdAt, updatedAt

OrderLineItem: id, productId, name, quantity, sku, price, totalPrice, weight, media, options
Address: street, city, state, postalCode, country
Money: amount, currency, formatted
Fulfillment: id, lineItems, trackingInfo, createdAt

OrderQuery: limit, offset, status[], paymentStatus[], dateRange, search
OrderListResult: orders[], totalCount, hasMore

### 2. Orders Service (src/services/orders/orders.service.ts)

OrdersService class:
- listOrders(query?): Promise<OrderListResult>
- getOrder(orderId): Promise<Order>
- searchOrders(searchTerm): Promise<Order[]>
- getOrdersByCustomer(email): Promise<Order[]>
- approveOrder(orderId): Promise<Order>
- cancelOrder(orderId): Promise<Order>
- createFulfillment(orderId, lineItems, trackingInfo?): Promise<Fulfillment>
- updateFulfillmentTracking(orderId, fulfillmentId, trackingInfo): Promise<Fulfillment>
- normalizeOrder(raw): Order (private helper)

### 3. API Endpoints
- POST /ecom/v1/orders/query
- GET /ecom/v1/orders/{orderId}
- POST /ecom/v1/orders/{orderId}/cancel
- POST /ecom/v1/fulfillments

### 4. Order Webhooks (update src/wix/webhooks.ts)
Add handlers:
- wix.ecom.v1.order_created
- wix.ecom.v1.order_updated
- wix.ecom.v1.order_paid
- wix.ecom.v1.order_fulfilled
- wix.ecom.v1.order_canceled

### 5. Dashboard API Endpoints
- GET /api/:instanceId/orders
- GET /api/:instanceId/orders/:orderId
- POST /api/:instanceId/orders/:orderId/fulfill

---

## Permissions Required
- WIX_STORES.READ_ORDERS
- WIX_STORES.WRITE_ORDERS
- WIX_ECOM.READ_ORDERS
- WIX_ECOM.MANAGE_ORDERS

---

## Acceptance Criteria
- [ ] Orders can be listed with pagination
- [ ] Orders can be filtered by status and date
- [ ] Single order retrieval works
- [ ] Order search by number/email works
- [ ] Fulfillment creation works with tracking
- [ ] Order webhooks are processed correctly
- [ ] Dashboard displays order list and details
