# Phase 3.3: Order Completion & Webhook Handling

## Context
After payment on Wix hosted checkout, Wix creates an order and sends webhooks.

## Goal
Handle order creation webhooks and manage post-checkout flow.

---

## Tasks

### 1. Webhook Events to Handle
- wix.ecom.v1.order_created
- wix.ecom.v1.order_paid
- wix.ecom.v1.order_approved
- wix.ecom.v1.order_updated
- wix.ecom.v1.order_canceled
- wix.ecom.v1.order_fulfilled

### 2. Order Webhook Handlers (update src/wix/webhooks.ts)

handleOrderCreated: Log order, track external orders, emit event
handleOrderPaid: Log payment, auto-approve if configured, emit event
handleOrderApproved: Trigger fulfillment workflow, emit event

### 3. Order Event Emitter (src/events/order-events.ts)

OrderEventEmitter class extending EventEmitter:
- emitOrderCreated(payload)
- emitOrderPaid(payload)
- emitOrderReadyToFulfill(payload)

Register listeners for downstream processing.

### 4. External Order Tracking (src/services/tracking/external-orders.ts)

ExternalOrderRecord: instanceId, cartId, checkoutId, orderId, orderNumber, externalReference, createdAt, status

Functions:
- trackExternalCheckout(instanceId, cartId, checkoutId, externalReference)
- trackExternalOrder(instanceId, order)
- getExternalOrderByReference(externalReference)

### 5. External API Endpoints

GET /external/order/status - Query by orderId, checkoutId, or externalRef
GET /external/orders - List orders for an instance
POST /external/webhooks - Register webhook for order events

### 6. External Webhook Dispatch

ExternalWebhook: id, instanceId, url, events[], secret, active

Store registrations per instance.
When Wix events received, dispatch to registered webhooks with HMAC signature.

---

## Acceptance Criteria
- [ ] Order created webhook is received and processed
- [ ] Order paid webhook triggers appropriate actions
- [ ] External order tracking works
- [ ] Order status can be queried by external reference
- [ ] External webhook dispatch works
- [ ] End-to-end flow completes successfully
- [ ] Logs provide clear audit trail
