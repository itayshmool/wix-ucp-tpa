# Phase 7: UCP Order Capability

## Context
The Order capability allows AI agents to retrieve order information after checkout completion. We have a fully functional `OrdersService` - we just need to expose it via UCP-compliant endpoints.

## Reference Documentation
- Order Spec: https://ucp.dev/specification/order
- Existing Service: `src/services/orders/orders.service.ts`

## Goal
Expose existing order functionality through UCP-compliant REST endpoints.

## Priority: 🔴 High | Complexity: 🟢 Low | Duration: 1-2 days

---

## Current State

### What Exists
```typescript
// src/services/orders/orders.service.ts
class OrdersService {
  listOrders(query: OrderQuery): Promise<OrderListResult>
  getOrder(orderId: string): Promise<Order>
  searchOrders(searchTerm: string): Promise<Order[]>
  cancelOrder(orderId: string): Promise<Order>
  createFulfillment(request): Promise<Fulfillment>
}
```

### What's Missing
```typescript
// src/routes/ucp.routes.ts line 771-775
router.get('/ucp/orders/:id', async (_req, res) => {
  // Returns 501 Not Implemented
  sendError(res, 501, 'Order retrieval not implemented in POC', 'NOT_IMPLEMENTED');
});
```

---

## Tasks

### 1. Create UCP Order Types (src/services/ucp/ucp.types.ts)

Add/verify these types exist:

```typescript
export interface UCPOrderResponse {
  order: UCPOrder;
}

export interface UCPOrdersListResponse {
  orders: UCPOrder[];
  pagination: UCPPagination;
}

export interface UCPOrder {
  id: string;
  number: string;
  status: UCPOrderStatus;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  fulfillmentStatus: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled';
  items: UCPOrderItem[];
  totals: UCPOrderTotals;
  buyer?: UCPBuyer;
  shippingAddress?: UCPAddress;
  billingAddress?: UCPAddress;
  fulfillments?: UCPFulfillment[];
  trackingInfo?: UCPTrackingInfo[];
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}

export type UCPOrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface UCPBuyer {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface UCPFulfillment {
  id: string;
  status: 'pending' | 'shipped' | 'delivered';
  items: { lineItemId: string; quantity: number }[];
  tracking?: UCPTrackingInfo;
  createdAt: string;
}

export interface UCPTrackingInfo {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
}
```

### 2. Create Order Translator (src/services/ucp/ucp.translator.ts)

Add function to translate Wix Order → UCP Order:

```typescript
export function wixOrderToUCP(wixOrder: Order): UCPOrder {
  return {
    id: wixOrder.id,
    number: wixOrder.number,
    status: mapOrderStatus(wixOrder.status),
    paymentStatus: mapPaymentStatus(wixOrder.paymentStatus),
    fulfillmentStatus: mapFulfillmentStatus(wixOrder.fulfillmentStatus),
    items: wixOrder.lineItems.map(item => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: {
        amount: item.price.amount,
        currency: item.price.currency,
        formatted: item.price.formatted,
      },
      image: item.media ? { url: item.media.url } : undefined,
    })),
    totals: {
      subtotal: wixOrder.pricing.subtotal,
      shipping: wixOrder.pricing.shipping,
      tax: wixOrder.pricing.tax,
      discount: wixOrder.pricing.discount,
      total: wixOrder.pricing.total,
    },
    buyer: wixOrder.buyer ? {
      email: wixOrder.buyer.email,
      firstName: wixOrder.buyer.firstName,
      lastName: wixOrder.buyer.lastName,
      phone: wixOrder.buyer.phone,
    } : undefined,
    shippingAddress: wixOrder.shippingInfo?.address,
    billingAddress: wixOrder.billingInfo?.address,
    fulfillments: wixOrder.fulfillments?.map(f => ({
      id: f.id,
      status: 'shipped',  // Simplify for now
      items: f.lineItems,
      tracking: f.trackingInfo,
      createdAt: f.createdAt.toISOString(),
    })),
    createdAt: wixOrder.createdAt.toISOString(),
    updatedAt: wixOrder.updatedAt.toISOString(),
  };
}

function mapOrderStatus(status: OrderStatus): UCPOrderStatus {
  const map: Record<string, UCPOrderStatus> = {
    'INITIALIZED': 'pending',
    'APPROVED': 'confirmed',
    'CANCELED': 'cancelled',
    'FULFILLED': 'delivered',
    'PARTIALLY_FULFILLED': 'processing',
  };
  return map[status] || 'pending';
}

function mapPaymentStatus(status: PaymentStatus): string {
  const map: Record<string, string> = {
    'NOT_PAID': 'pending',
    'PENDING': 'pending',
    'PAID': 'paid',
    'PARTIALLY_REFUNDED': 'refunded',
    'FULLY_REFUNDED': 'refunded',
  };
  return map[status] || 'pending';
}

function mapFulfillmentStatus(status: FulfillmentStatus): string {
  const map: Record<string, string> = {
    'NOT_FULFILLED': 'unfulfilled',
    'PARTIALLY_FULFILLED': 'partially_fulfilled',
    'FULFILLED': 'fulfilled',
  };
  return map[status] || 'unfulfilled';
}
```

### 3. Implement UCP Order Endpoints (src/routes/ucp.routes.ts)

Replace the 501 stub with real implementation:

```typescript
/**
 * Get Order by ID
 * GET /ucp/orders/:id
 */
router.get('/ucp/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    logger.info('UCP: Getting order', { orderId: id });

    // Need to create an OrdersService instance
    // For POC, use SDK client with admin privileges
    const client = getWixSdkClient();
    
    // The SDK client wraps the WixApiClient - need to access orders directly
    const response = await client.get(`/ecom/v1/orders/${id}`);
    const wixOrder = normalizeOrder(response.order);
    
    const ucpOrder = wixOrderToUCP(wixOrder);
    
    res.json(ucpOrder);
  } catch (error: any) {
    logger.error('UCP: Failed to get order', { orderId: req.params.id, error: error.message });
    
    if (error.message?.includes('not found')) {
      return sendError(res, 404, 'Order not found', 'ORDER_NOT_FOUND');
    }
    
    sendError(res, 500, error.message || 'Failed to fetch order', 'ORDER_ERROR');
  }
});

/**
 * List Orders
 * GET /ucp/orders
 * 
 * Query params:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 * - status: string (filter by status)
 * - checkoutId: string (find order by checkout)
 */
router.get('/ucp/orders', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;
    const checkoutId = req.query.checkoutId as string;

    logger.info('UCP: Listing orders', { limit, offset, status, checkoutId });

    const client = getWixSdkClient();
    
    // Build query
    const queryBody: any = {
      query: {
        paging: { limit, offset },
      },
    };
    
    if (status) {
      queryBody.query.filter = { status: { $eq: status.toUpperCase() } };
    }
    
    const response = await client.post('/ecom/v1/orders/query', queryBody);
    
    const orders = (response.orders || []).map((o: any) => 
      wixOrderToUCP(normalizeOrder(o))
    );
    
    const result: UCPOrdersListResponse = {
      orders,
      pagination: {
        total: response.metadata?.count || orders.length,
        limit,
        offset,
        hasMore: orders.length === limit,
      },
    };

    res.json(result);
  } catch (error: any) {
    logger.error('UCP: Failed to list orders', { error: error.message });
    sendError(res, 500, error.message || 'Failed to fetch orders', 'ORDERS_ERROR');
  }
});

/**
 * Get Order by Checkout ID
 * GET /ucp/orders/by-checkout/:checkoutId
 * 
 * Convenience endpoint to find order created from a specific checkout
 */
router.get('/ucp/orders/by-checkout/:checkoutId', async (req: Request, res: Response) => {
  try {
    const { checkoutId } = req.params;
    
    logger.info('UCP: Finding order by checkout', { checkoutId });

    // Search for order with matching checkout reference
    // This may require querying by custom field or recent orders
    const client = getWixSdkClient();
    
    const response = await client.post('/ecom/v1/orders/query', {
      query: {
        paging: { limit: 1 },
        filter: { checkoutId: { $eq: checkoutId } },
      },
    });
    
    if (!response.orders || response.orders.length === 0) {
      return sendError(res, 404, 'No order found for checkout', 'ORDER_NOT_FOUND');
    }
    
    const ucpOrder = wixOrderToUCP(normalizeOrder(response.orders[0]));
    res.json(ucpOrder);
  } catch (error: any) {
    logger.error('UCP: Failed to find order by checkout', { 
      checkoutId: req.params.checkoutId, 
      error: error.message 
    });
    sendError(res, 500, error.message || 'Failed to fetch order', 'ORDER_ERROR');
  }
});
```

### 4. Update Discovery Endpoint

Ensure orders capability is listed:

```typescript
// In /.well-known/ucp handler
const discovery: UCPDiscovery = {
  // ... existing fields
  capabilities: [
    'catalog_search', 
    'product_details', 
    'cart_management', 
    'checkout',
    'orders',  // ADD THIS
  ],
  endpoints: {
    // ... existing endpoints
    orders: `${baseUrl}/ucp/orders/{id}`,
    ordersList: `${baseUrl}/ucp/orders`,  // ADD THIS
  },
};
```

### 5. Add Tests (tests/ucp-orders.test.ts)

```typescript
import { describe, it, expect } from 'vitest';

describe('UCP Orders API', () => {
  describe('GET /ucp/orders/:id', () => {
    it('should return order in UCP format', async () => {
      // Test with known order ID
    });
    
    it('should return 404 for unknown order', async () => {
      // Test error handling
    });
  });
  
  describe('GET /ucp/orders', () => {
    it('should list orders with pagination', async () => {
      // Test list with pagination
    });
    
    it('should filter by status', async () => {
      // Test status filter
    });
  });
});
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| ORDER_NOT_FOUND | 404 | Order ID does not exist |
| ORDER_ACCESS_DENIED | 403 | No permission to view order |
| ORDERS_ERROR | 500 | Generic order fetch error |

---

## Acceptance Criteria

- [ ] `GET /ucp/orders/:id` returns UCP-formatted order
- [ ] `GET /ucp/orders` returns paginated list
- [ ] Status filter works correctly
- [ ] Order status mapping is correct (Wix → UCP)
- [ ] Fulfillment/tracking info included when present
- [ ] Discovery endpoint lists `orders` capability
- [ ] Error responses follow UCP format
- [ ] Tests pass

---

## Notes

### Permissions Required
Orders API requires elevated permissions. For POC, ensure the Wix SDK client has:
- `WIX_ECOM.READ_ORDERS`

### Wix Order Status Mapping
```
Wix INITIALIZED    → UCP pending
Wix APPROVED       → UCP confirmed
Wix CANCELED       → UCP cancelled
Wix FULFILLED      → UCP delivered
Wix PARTIALLY_FULFILLED → UCP processing
```

### Future Enhancements
- Real-time order status webhooks (Phase 9)
- Order cancellation endpoint
- Order history by customer email
