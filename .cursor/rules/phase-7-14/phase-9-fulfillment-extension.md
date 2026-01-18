# Phase 9: Fulfillment Extension

## Context
The Fulfillment extension enables agents to receive shipping updates via webhooks. When an order ships, the business pushes tracking information to the agent's registered callback URL.

## Reference Documentation
- Fulfillment Extension: https://ucp.dev/specification/checkout/fulfillment-extension
- UCP Playground Step 8: Webhook Simulation

## Goal
Enable agents to register for webhook callbacks and receive real-time fulfillment updates.

## Priority: 🟡 Medium | Complexity: 🟡 Medium | Duration: 3-4 days

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Wix Store      │     │   UCP TPA        │     │   AI Agent       │
│   Dashboard      │     │   Server         │     │   (Platform)     │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         │  Order Fulfilled       │                        │
         │  (Wix Webhook)         │                        │
         ├───────────────────────►│                        │
         │                        │  POST callback_url     │
         │                        │  { event: "shipped" }  │
         │                        ├───────────────────────►│
         │                        │                        │
         │                        │◄───────────────────────┤
         │                        │  200 OK                │
```

---

## Tasks

### 1. Create Webhook Types (src/services/ucp/webhook.types.ts)

```typescript
export interface UCPWebhookRegistration {
  id: string;
  orderId: string;
  callbackUrl: string;
  events: UCPWebhookEvent[];
  secret?: string;  // For HMAC signature
  createdAt: string;
  expiresAt?: string;
}

export type UCPWebhookEvent = 
  | 'order.confirmed'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.cancelled'
  | 'fulfillment.created'
  | 'fulfillment.updated';

export interface UCPWebhookPayload {
  event: UCPWebhookEvent;
  timestamp: string;  // ISO 8601
  orderId: string;
  orderNumber?: string;
  data: UCPFulfillmentData | UCPOrderStatusData;
}

export interface UCPFulfillmentData {
  fulfillmentId: string;
  status: 'pending' | 'shipped' | 'delivered';
  tracking?: {
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
  };
  items: {
    lineItemId: string;
    quantity: number;
  }[];
}

export interface UCPOrderStatusData {
  previousStatus: string;
  newStatus: string;
  reason?: string;
}

export interface UCPWebhookDelivery {
  id: string;
  registrationId: string;
  payload: UCPWebhookPayload;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  error?: string;
}
```

### 2. Create Webhook Storage (src/store/webhook-registrations.ts)

```typescript
import { UCPWebhookRegistration } from '../services/ucp/webhook.types.js';
import { logger } from '../utils/logger.js';

// In-memory store for POC (use Redis in production)
const registrations = new Map<string, UCPWebhookRegistration>();
const orderRegistrations = new Map<string, string[]>(); // orderId -> registrationIds

export const webhookStore = {
  async register(registration: UCPWebhookRegistration): Promise<void> {
    registrations.set(registration.id, registration);
    
    const orderRegs = orderRegistrations.get(registration.orderId) || [];
    orderRegs.push(registration.id);
    orderRegistrations.set(registration.orderId, orderRegs);
    
    logger.info('Webhook registered', { 
      registrationId: registration.id, 
      orderId: registration.orderId 
    });
  },
  
  async getByOrder(orderId: string): Promise<UCPWebhookRegistration[]> {
    const regIds = orderRegistrations.get(orderId) || [];
    return regIds
      .map(id => registrations.get(id))
      .filter(Boolean) as UCPWebhookRegistration[];
  },
  
  async get(id: string): Promise<UCPWebhookRegistration | undefined> {
    return registrations.get(id);
  },
  
  async delete(id: string): Promise<void> {
    const reg = registrations.get(id);
    if (reg) {
      const orderRegs = orderRegistrations.get(reg.orderId) || [];
      orderRegistrations.set(
        reg.orderId, 
        orderRegs.filter(rid => rid !== id)
      );
      registrations.delete(id);
    }
  },
};
```

### 3. Create Webhook Service (src/services/webhooks/webhook-dispatcher.ts)

```typescript
import crypto from 'crypto';
import { 
  UCPWebhookPayload, 
  UCPWebhookRegistration 
} from '../ucp/webhook.types.js';
import { webhookStore } from '../../store/webhook-registrations.js';
import { logger } from '../../utils/logger.js';

export class WebhookDispatcher {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 5000, 30000]; // ms
  
  /**
   * Dispatch webhook to all registered callbacks for an order
   */
  async dispatchToOrder(orderId: string, payload: UCPWebhookPayload): Promise<void> {
    const registrations = await webhookStore.getByOrder(orderId);
    
    logger.info('Dispatching webhook to order', { 
      orderId, 
      event: payload.event,
      registrationCount: registrations.length 
    });
    
    for (const reg of registrations) {
      // Check if this registration is interested in this event
      if (reg.events.includes(payload.event)) {
        await this.deliverWebhook(reg, payload);
      }
    }
  }
  
  /**
   * Deliver webhook to a single registration
   */
  private async deliverWebhook(
    registration: UCPWebhookRegistration, 
    payload: UCPWebhookPayload,
    attempt = 1
  ): Promise<void> {
    const signature = this.signPayload(payload, registration.secret);
    
    try {
      const response = await fetch(registration.callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-UCP-Signature': signature,
          'X-UCP-Event': payload.event,
          'X-UCP-Timestamp': payload.timestamp,
          'X-UCP-Delivery-Attempt': attempt.toString(),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10s timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      logger.info('Webhook delivered successfully', {
        registrationId: registration.id,
        event: payload.event,
        attempt,
      });
    } catch (error) {
      logger.error('Webhook delivery failed', {
        registrationId: registration.id,
        event: payload.event,
        attempt,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Retry logic
      if (attempt < WebhookDispatcher.MAX_RETRIES) {
        const delay = WebhookDispatcher.RETRY_DELAYS[attempt - 1];
        setTimeout(() => {
          this.deliverWebhook(registration, payload, attempt + 1);
        }, delay);
      }
    }
  }
  
  /**
   * Sign payload with HMAC-SHA256
   */
  private signPayload(payload: UCPWebhookPayload, secret?: string): string {
    if (!secret) {
      return '';
    }
    
    const body = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    return `sha256=${hmac.digest('hex')}`;
  }
}

export const webhookDispatcher = new WebhookDispatcher();
```

### 4. Create Webhook Registration Endpoint (src/routes/ucp.routes.ts)

```typescript
import { webhookStore } from '../store/webhook-registrations.js';
import { v4 as uuid } from 'uuid';

/**
 * Register webhook for order events
 * POST /ucp/webhooks/register
 */
router.post('/ucp/webhooks/register', async (req: Request, res: Response) => {
  try {
    const { orderId, callbackUrl, events, secret } = req.body;
    
    if (!orderId || !callbackUrl || !events || events.length === 0) {
      return sendError(res, 400, 'orderId, callbackUrl, and events are required', 'INVALID_REQUEST');
    }
    
    // Validate callback URL
    try {
      new URL(callbackUrl);
    } catch {
      return sendError(res, 400, 'Invalid callback URL', 'INVALID_CALLBACK_URL');
    }
    
    const registration: UCPWebhookRegistration = {
      id: uuid(),
      orderId,
      callbackUrl,
      events,
      secret,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
    
    await webhookStore.register(registration);
    
    logger.info('Webhook registration created', { 
      registrationId: registration.id, 
      orderId 
    });
    
    res.status(201).json({
      id: registration.id,
      orderId,
      events,
      expiresAt: registration.expiresAt,
    });
  } catch (error: any) {
    logger.error('Failed to register webhook', { error: error.message });
    sendError(res, 500, 'Failed to register webhook', 'WEBHOOK_ERROR');
  }
});

/**
 * Delete webhook registration
 * DELETE /ucp/webhooks/:id
 */
router.delete('/ucp/webhooks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const registration = await webhookStore.get(id);
    if (!registration) {
      return sendError(res, 404, 'Webhook registration not found', 'NOT_FOUND');
    }
    
    await webhookStore.delete(id);
    
    res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete webhook', { error: error.message });
    sendError(res, 500, 'Failed to delete webhook', 'WEBHOOK_ERROR');
  }
});
```

### 5. Integrate with Wix Webhook Handlers (src/wix/webhooks.ts)

Update existing handlers to dispatch UCP webhooks:

```typescript
import { webhookDispatcher } from '../services/webhooks/webhook-dispatcher.js';
import { UCPWebhookPayload } from '../services/ucp/webhook.types.js';

/**
 * Handle order fulfilled event
 */
async function handleOrderFulfilled(payload: WixWebhookPayload): Promise<void> {
  logger.info('Order fulfilled webhook received', {
    instanceId: payload.instanceId,
    orderId: payload.data?.orderId,
  });

  const orderId = payload.data?.orderId;
  if (!orderId) return;

  // Dispatch UCP webhook to registered agents
  const ucpPayload: UCPWebhookPayload = {
    event: 'order.shipped',
    timestamp: new Date().toISOString(),
    orderId,
    orderNumber: payload.data?.orderNumber,
    data: {
      fulfillmentId: payload.data?.fulfillmentId || 'unknown',
      status: 'shipped',
      tracking: payload.data?.trackingInfo ? {
        carrier: payload.data.trackingInfo.carrier,
        trackingNumber: payload.data.trackingInfo.trackingNumber,
        trackingUrl: payload.data.trackingInfo.trackingUrl,
      } : undefined,
      items: payload.data?.lineItems || [],
    },
  };

  await webhookDispatcher.dispatchToOrder(orderId, ucpPayload);

  logger.debug('Order fulfilled event processed', {
    instanceId: payload.instanceId,
    orderId,
  });
}

/**
 * Handle order paid event
 */
async function handleOrderPaid(payload: WixWebhookPayload): Promise<void> {
  logger.info('Order paid webhook received', {
    instanceId: payload.instanceId,
    orderId: payload.data?.orderId,
  });

  const orderId = payload.data?.orderId;
  if (!orderId) return;

  // Dispatch UCP webhook
  const ucpPayload: UCPWebhookPayload = {
    event: 'order.confirmed',
    timestamp: new Date().toISOString(),
    orderId,
    orderNumber: payload.data?.orderNumber,
    data: {
      previousStatus: 'pending',
      newStatus: 'confirmed',
    },
  };

  await webhookDispatcher.dispatchToOrder(orderId, ucpPayload);
}
```

### 6. Add Fulfillment Endpoint (src/routes/ucp.routes.ts)

```typescript
/**
 * Get fulfillments for an order
 * GET /ucp/orders/:id/fulfillments
 */
router.get('/ucp/orders/:id/fulfillments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    logger.info('UCP: Getting order fulfillments', { orderId: id });

    const client = getWixSdkClient();
    const response = await client.get(`/ecom/v1/orders/${id}`);
    const order = response.order;
    
    if (!order) {
      return sendError(res, 404, 'Order not found', 'ORDER_NOT_FOUND');
    }
    
    const fulfillments = (order.fulfillments || []).map((f: any) => ({
      id: f._id || f.id,
      status: f.status || 'shipped',
      createdAt: f._createdDate || new Date().toISOString(),
      items: (f.lineItems || []).map((item: any) => ({
        lineItemId: item.id,
        quantity: item.quantity,
      })),
      tracking: f.trackingInfo ? {
        carrier: f.trackingInfo.shippingProvider || f.trackingInfo.carrier,
        trackingNumber: f.trackingInfo.trackingNumber,
        trackingUrl: f.trackingInfo.trackingLink,
      } : undefined,
    }));
    
    res.json({ fulfillments });
  } catch (error: any) {
    logger.error('UCP: Failed to get fulfillments', { error: error.message });
    sendError(res, 500, 'Failed to fetch fulfillments', 'FULFILLMENT_ERROR');
  }
});
```

### 7. Update Discovery (src/routes/ucp.routes.ts)

```typescript
const discovery: UCPDiscovery = {
  // ... existing fields
  capabilities: [
    'catalog_search', 
    'product_details', 
    'cart_management', 
    'checkout',
    'orders',
    'fulfillment',  // ADD THIS
  ],
  extensions: {
    fulfillment: {
      webhook_events: [
        'order.confirmed',
        'order.shipped',
        'order.delivered',
        'order.cancelled',
      ],
      registration_endpoint: `${baseUrl}/ucp/webhooks/register`,
    },
  },
};
```

---

## API Reference

### Register Webhook
```
POST /ucp/webhooks/register
Content-Type: application/json

{
  "orderId": "order-123",
  "callbackUrl": "https://agent.example.com/webhooks/ucp",
  "events": ["order.shipped", "order.delivered"],
  "secret": "optional-hmac-secret"
}

Response 201:
{
  "id": "reg-456",
  "orderId": "order-123",
  "events": ["order.shipped", "order.delivered"],
  "expiresAt": "2026-02-18T00:00:00Z"
}
```

### Webhook Payload (sent to callback)
```
POST https://agent.example.com/webhooks/ucp
Content-Type: application/json
X-UCP-Signature: sha256=abc123...
X-UCP-Event: order.shipped
X-UCP-Timestamp: 2026-01-18T12:00:00Z

{
  "event": "order.shipped",
  "timestamp": "2026-01-18T12:00:00Z",
  "orderId": "order-123",
  "orderNumber": "10042",
  "data": {
    "fulfillmentId": "ful-789",
    "status": "shipped",
    "tracking": {
      "carrier": "USPS",
      "trackingNumber": "9400111899223033",
      "trackingUrl": "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223033"
    },
    "items": [
      { "lineItemId": "item-1", "quantity": 2 }
    ]
  }
}
```

---

## Acceptance Criteria

- [ ] Agents can register webhook callbacks
- [ ] Webhooks fire on order.shipped from Wix
- [ ] Webhooks include tracking information
- [ ] HMAC signature validation available
- [ ] Failed webhooks retry up to 3 times
- [ ] GET /ucp/orders/:id/fulfillments returns fulfillment data
- [ ] Discovery includes fulfillment extension
- [ ] Webhook registrations auto-expire after 30 days

---

## Security Considerations

- Validate callback URLs (no localhost in production)
- Implement HMAC signatures for webhook verification
- Rate limit webhook registration endpoint
- Log all webhook delivery attempts
- Support webhook secret rotation
