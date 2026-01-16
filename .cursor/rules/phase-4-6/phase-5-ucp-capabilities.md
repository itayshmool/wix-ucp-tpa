# Phase 5: UCP Skills & Capabilities

## Context
AI agents need product discovery and order tracking beyond checkout.

## Reference Documentation
- Order Capability: https://ucp.dev/specification/order

## Goal
Implement product discovery and Order capability.

---

## Part A: Product Discovery

### 1. Product Types (src/ucp/types/product.types.ts)

UCPProduct: id, name, description?, slug, price, compare_at_price?, images[], in_stock, quantity_available?, variants[]?, options[]?, categories[]?, tags[]?, url?

UCPProductVariant: id, sku?, price, in_stock, options

UCPProductOption: name, values[]

UCPProductQuery: q?, category?, min_price?, max_price?, in_stock?, limit?, offset?, sort?

UCPProductListResult: products[], total_count, has_more

UCPCategory: id, name, slug, description?, image_url?, product_count

### 2. Product Service (src/ucp/services/product.service.ts)

UCPProductService class:
- queryProducts(query): Promise<UCPProductListResult>
- getProduct(productId): Promise<UCPProduct>
- getProductsByIds(ids): Promise<UCPProduct[]>
- getCategories(): Promise<UCPCategory[]>
- wixProductToUCP(product): UCPProduct
- sortProducts(products, sort): UCPProduct[]

### 3. Product Routes (src/ucp/routes/product.routes.ts)

GET /ucp/v1/products - Search/list with query params
GET /ucp/v1/products/:id - Get single product
GET /ucp/v1/categories - List categories

---

## Part B: Order Capability

### 1. Order Types (src/ucp/types/order.types.ts)

UCPOrderStatus: pending, confirmed, processing, shipped, delivered, cancelled, returned

UCPOrderEventType: order.created, order.confirmed, order.shipped, order.delivered, order.cancelled, order.returned

UCPShipment: id, carrier, tracking_number, tracking_url?, status, shipped_at?, delivered_at?, items[]

UCPOrder: id, checkout_session_id, order_number, status, line_items[], buyer_info, shipping_address, billing_address?, totals, currency, shipments[], created_at, updated_at

UCPOrderEvent: event_type, event_id, timestamp, order, shipment?

UCPOrderWebhookConfig: webhook_url, events[]?, secret?

### 2. Order Service (src/ucp/services/order.service.ts)

UCPOrderService class:
- getOrder(orderId): Promise<UCPOrder>
- listOrders(filters?): Promise<{ orders, has_more }>
- sendOrderEvent(webhookUrl, event, secret?): Promise<void>
- wixOrderToUCP(order): UCPOrder
- wixStatusToUCP(status, fulfillment): UCPOrderStatus

### 3. Order Routes (src/ucp/routes/order.routes.ts)

GET /ucp/v1/orders - List with filters
GET /ucp/v1/orders/:id - Get single order

### 4. Webhook Bridge (src/ucp/webhooks/order-bridge.ts)

Map Wix events to UCP events:
- wix.ecom.v1.order_created → order.created
- wix.ecom.v1.order_approved → order.confirmed
- wix.ecom.v1.order_fulfilled → order.shipped
- wix.ecom.v1.order_canceled → order.cancelled

Send to registered platform webhooks with HMAC signature.

---

## Endpoints Summary

Products:
- GET /ucp/v1/products
- GET /ucp/v1/products/:id
- GET /ucp/v1/categories

Orders:
- GET /ucp/v1/orders
- GET /ucp/v1/orders/:id

---

## Acceptance Criteria

### Products
- [ ] Search by keyword
- [ ] Filter by category, price, stock
- [ ] Sort (price, name, newest)
- [ ] Pagination works
- [ ] Variants and options included
- [ ] Categories list collections

### Orders
- [ ] List with filters
- [ ] Single order retrieval
- [ ] Shipment info included
- [ ] Status mapping correct
- [ ] Wix webhooks → UCP events
- [ ] Platform webhooks receive events
