# Phase 12: Complete Checkout Flow

## Context
This is the culmination of the payment flow - using a minted instrument to complete a checkout and create an order, all server-side without requiring user redirect.

## Reference Documentation
- UCP Playground Step 7: Complete Checkout
- Checkout Capability: https://ucp.dev/specification/checkout

## Goal
Enable server-side checkout completion using minted payment instruments.

## Priority: 🔴 High | Complexity: 🔴 High | Duration: 1 week

## Dependencies
- Phase 11 (Payment Handlers) must be complete

---

## Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      Complete Checkout Flow                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Agent                    UCP TPA                    Payment Processor   │
│    │                         │                              │            │
│    │  POST /checkout/:id/complete                           │            │
│    │  { instrumentId }       │                              │            │
│    ├────────────────────────►│                              │            │
│    │                         │                              │            │
│    │                         │  1. Validate instrument      │            │
│    │                         │  2. Get checkout details     │            │
│    │                         │                              │            │
│    │                         │  3. Charge instrument        │            │
│    │                         ├─────────────────────────────►│            │
│    │                         │                              │            │
│    │                         │◄─────────────────────────────┤            │
│    │                         │  { transactionId }           │            │
│    │                         │                              │            │
│    │                         │  4. Create Wix Order         │            │
│    │                         │  5. Delete instrument        │            │
│    │                         │                              │            │
│    │◄────────────────────────┤                              │            │
│    │  { order }              │                              │            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Tasks

### 1. Create Complete Checkout Types (src/services/ucp/complete.types.ts)

```typescript
export interface UCPCompleteCheckoutRequest {
  instrumentId: string;
  idempotencyKey?: string;  // Prevent duplicate charges
  buyerConsent?: {
    termsAccepted: boolean;
    marketingOptIn?: boolean;
    privacyPolicyAccepted?: boolean;
  };
  metadata?: Record<string, string>;
}

export interface UCPCompleteCheckoutResponse {
  status: 'completed' | 'failed' | 'action_required' | 'pending';
  order?: UCPOrderSummary;
  transaction?: UCPTransactionSummary;
  action?: UCPRequiredAction;
  error?: UCPCompleteError;
}

export interface UCPOrderSummary {
  id: string;
  number: string;
  status: string;
  totals: {
    total: UCPPrice;
    itemCount: number;
  };
  createdAt: string;
}

export interface UCPTransactionSummary {
  id: string;
  status: 'authorized' | 'captured' | 'failed';
  amount: UCPPrice;
  paymentMethod: {
    type: string;
    brand?: string;
    last4?: string;
  };
}

export interface UCPRequiredAction {
  type: '3ds_authentication' | 'redirect' | 'verify_otp';
  url?: string;
  returnUrl?: string;
  data?: Record<string, unknown>;
  expiresAt?: string;
}

export interface UCPCompleteError {
  code: CompleteErrorCode;
  message: string;
  declineReason?: string;
  retryable: boolean;
}

export type CompleteErrorCode =
  | 'INSTRUMENT_INVALID'
  | 'INSTRUMENT_EXPIRED'
  | 'CHECKOUT_NOT_FOUND'
  | 'CHECKOUT_ALREADY_COMPLETED'
  | 'PAYMENT_DECLINED'
  | 'PAYMENT_FAILED'
  | 'INSUFFICIENT_FUNDS'
  | 'CARD_EXPIRED'
  | 'FRAUD_SUSPECTED'
  | 'ORDER_CREATION_FAILED'
  | 'IDEMPOTENCY_CONFLICT';
```

### 2. Create Idempotency Store (src/store/idempotency-store.ts)

```typescript
import { logger } from '../utils/logger.js';

interface IdempotencyRecord {
  key: string;
  checkoutId: string;
  response: unknown;
  createdAt: Date;
}

// In-memory store (use Redis in production)
const records = new Map<string, IdempotencyRecord>();

export const idempotencyStore = {
  async get(key: string): Promise<IdempotencyRecord | undefined> {
    const record = records.get(key);
    
    // Expire after 24 hours
    if (record && Date.now() - record.createdAt.getTime() > 24 * 60 * 60 * 1000) {
      records.delete(key);
      return undefined;
    }
    
    return record;
  },
  
  async set(key: string, checkoutId: string, response: unknown): Promise<void> {
    records.set(key, {
      key,
      checkoutId,
      response,
      createdAt: new Date(),
    });
    
    logger.debug('Idempotency record saved', { key, checkoutId });
  },
  
  async exists(key: string): Promise<boolean> {
    return records.has(key);
  },
};
```

### 3. Create Complete Checkout Service (src/services/checkout/complete.service.ts)

```typescript
import { 
  UCPCompleteCheckoutRequest, 
  UCPCompleteCheckoutResponse,
  CompleteErrorCode 
} from '../ucp/complete.types.js';
import { paymentHandlerRegistry } from '../payment-handlers/registry.js';
import { instrumentStore } from '../../store/instrument-store.js';
import { idempotencyStore } from '../../store/idempotency-store.js';
import { getWixSdkClient } from '../../wix/sdk-client.js';
import { logger } from '../../utils/logger.js';

export class CompleteCheckoutService {
  
  /**
   * Complete a checkout using a minted instrument
   */
  async complete(
    checkoutId: string, 
    request: UCPCompleteCheckoutRequest
  ): Promise<UCPCompleteCheckoutResponse> {
    const { instrumentId, idempotencyKey, buyerConsent } = request;
    
    logger.info('Completing checkout', { checkoutId, instrumentId, idempotencyKey });
    
    // 1. Check idempotency
    if (idempotencyKey) {
      const existing = await idempotencyStore.get(idempotencyKey);
      if (existing) {
        if (existing.checkoutId !== checkoutId) {
          return this.errorResponse('IDEMPOTENCY_CONFLICT', 
            'Idempotency key used with different checkout');
        }
        logger.info('Returning cached idempotent response', { idempotencyKey });
        return existing.response as UCPCompleteCheckoutResponse;
      }
    }
    
    // 2. Validate instrument
    const instrument = await instrumentStore.get(instrumentId);
    if (!instrument) {
      return this.errorResponse('INSTRUMENT_INVALID', 'Instrument not found');
    }
    
    if (new Date(instrument.expiresAt) < new Date()) {
      await instrumentStore.delete(instrumentId);
      return this.errorResponse('INSTRUMENT_EXPIRED', 'Instrument has expired');
    }
    
    if (instrument.checkoutId !== checkoutId) {
      return this.errorResponse('INSTRUMENT_INVALID', 
        'Instrument does not match checkout');
    }
    
    // 3. Get checkout
    const client = getWixSdkClient();
    let checkout: any;
    
    try {
      const response = await client.checkout.getCheckout(checkoutId);
      checkout = (response as any).checkout || response;
    } catch (error) {
      return this.errorResponse('CHECKOUT_NOT_FOUND', 'Checkout not found');
    }
    
    // Check if already completed
    if (checkout.completed) {
      return this.errorResponse('CHECKOUT_ALREADY_COMPLETED', 
        'This checkout has already been completed');
    }
    
    // 4. Get payment handler and charge
    const handler = paymentHandlerRegistry.get(instrument.handlerId);
    if (!handler || !handler.charge) {
      return this.errorResponse('PAYMENT_FAILED', 
        'Payment handler not available');
    }
    
    const amount = parseFloat(checkout.priceSummary?.total?.amount || '0');
    const currency = checkout.currency || 'USD';
    
    logger.info('Charging instrument', { 
      instrumentId, 
      amount, 
      currency,
      handler: handler.id 
    });
    
    const chargeResult = await handler.charge(instrument, amount, currency);
    
    // 5. Handle charge result
    if (!chargeResult.success) {
      // Check if action required (3DS)
      if (chargeResult.requiresAction) {
        const response: UCPCompleteCheckoutResponse = {
          status: 'action_required',
          action: {
            type: chargeResult.requiresAction.type,
            url: chargeResult.requiresAction.url,
            returnUrl: `${process.env.BASE_URL}/ucp/checkout/${checkoutId}/complete/callback`,
            data: chargeResult.requiresAction.data,
          },
        };
        return response;
      }
      
      // Payment declined
      const errorCode = this.mapChargeErrorCode(chargeResult.error?.code);
      return this.errorResponse(
        errorCode,
        chargeResult.error?.message || 'Payment failed',
        chargeResult.error?.declineReason
      );
    }
    
    // 6. Create order in Wix
    let order: any;
    try {
      // Mark checkout as completed and create order
      const orderResponse = await this.createWixOrder(checkoutId, {
        transactionId: chargeResult.transactionId!,
        paymentMethod: {
          type: instrument.type,
          brand: instrument.brand,
          last4: instrument.last4,
        },
        buyerConsent,
      });
      
      order = orderResponse;
      logger.info('Order created', { orderId: order.id, orderNumber: order.number });
    } catch (error: any) {
      logger.error('Order creation failed', { error: error.message });
      // Payment succeeded but order failed - critical error
      // In production: queue for retry, alert operations
      return this.errorResponse('ORDER_CREATION_FAILED', 
        'Payment processed but order creation failed. Contact support.');
    }
    
    // 7. Cleanup
    await instrumentStore.delete(instrumentId);
    
    // 8. Build response
    const response: UCPCompleteCheckoutResponse = {
      status: 'completed',
      order: {
        id: order.id,
        number: order.number,
        status: 'confirmed',
        totals: {
          total: {
            amount,
            currency,
            formatted: checkout.priceSummary?.total?.formattedAmount || `$${amount}`,
          },
          itemCount: checkout.lineItems?.length || 0,
        },
        createdAt: new Date().toISOString(),
      },
      transaction: {
        id: chargeResult.transactionId!,
        status: 'captured',
        amount: { amount, currency, formatted: `$${amount}` },
        paymentMethod: {
          type: instrument.type,
          brand: instrument.brand,
          last4: instrument.last4,
        },
      },
    };
    
    // Save idempotency record
    if (idempotencyKey) {
      await idempotencyStore.set(idempotencyKey, checkoutId, response);
    }
    
    return response;
  }
  
  /**
   * Create order in Wix after successful payment
   */
  private async createWixOrder(
    checkoutId: string,
    paymentInfo: {
      transactionId: string;
      paymentMethod: { type: string; brand?: string; last4?: string };
      buyerConsent?: any;
    }
  ): Promise<any> {
    const client = getWixSdkClient();
    
    // Wix doesn't have a direct "create order from checkout" API for external payments
    // We need to use the checkout completion flow
    
    // Option 1: Use createOrderFromCheckout (if available)
    // Option 2: Create order directly via Orders API
    
    // For POC, we'll create an order directly
    const checkout = await client.checkout.getCheckout(checkoutId);
    const checkoutData = (checkout as any).checkout || checkout;
    
    // Create order with payment info
    const orderData = {
      lineItems: checkoutData.lineItems,
      buyerInfo: checkoutData.buyerInfo,
      shippingInfo: checkoutData.shippingInfo,
      billingInfo: checkoutData.billingInfo,
      channelType: 'OTHER',  // External payment
      paymentStatus: 'PAID',
      customFields: {
        externalTransactionId: paymentInfo.transactionId,
        paymentMethod: JSON.stringify(paymentInfo.paymentMethod),
      },
    };
    
    const response = await client.post('/ecom/v1/orders', { order: orderData });
    
    return response.order;
  }
  
  /**
   * Map charge error to UCP error code
   */
  private mapChargeErrorCode(code?: string): CompleteErrorCode {
    const map: Record<string, CompleteErrorCode> = {
      'CARD_DECLINED': 'PAYMENT_DECLINED',
      'INSUFFICIENT_FUNDS': 'INSUFFICIENT_FUNDS',
      'CARD_EXPIRED': 'CARD_EXPIRED',
      'FRAUD': 'FRAUD_SUSPECTED',
    };
    return map[code || ''] || 'PAYMENT_FAILED';
  }
  
  /**
   * Build error response
   */
  private errorResponse(
    code: CompleteErrorCode, 
    message: string,
    declineReason?: string
  ): UCPCompleteCheckoutResponse {
    const retryableCodes: CompleteErrorCode[] = [
      'PAYMENT_FAILED',
      'ORDER_CREATION_FAILED',
    ];
    
    return {
      status: 'failed',
      error: {
        code,
        message,
        declineReason,
        retryable: retryableCodes.includes(code),
      },
    };
  }
}

export const completeCheckoutService = new CompleteCheckoutService();
```

### 4. Create Complete Checkout Endpoint (src/routes/ucp.routes.ts)

```typescript
import { completeCheckoutService } from '../services/checkout/complete.service.js';
import { UCPCompleteCheckoutRequest } from '../services/ucp/complete.types.js';

/**
 * Complete checkout with payment instrument
 * POST /ucp/checkout/:id/complete
 * 
 * UCP Playground Step 7
 */
router.post('/ucp/checkout/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id: checkoutId } = req.params;
    const request: UCPCompleteCheckoutRequest = req.body;
    
    if (!request.instrumentId) {
      return sendError(res, 400, 'instrumentId is required', 'INVALID_REQUEST');
    }
    
    logger.info('UCP: Complete checkout request', { 
      checkoutId, 
      instrumentId: request.instrumentId,
      hasIdempotencyKey: !!request.idempotencyKey,
    });
    
    const result = await completeCheckoutService.complete(checkoutId, request);
    
    // Map status to HTTP code
    const statusCodes: Record<string, number> = {
      'completed': 200,
      'action_required': 202,
      'pending': 202,
      'failed': 400,
    };
    
    const httpStatus = statusCodes[result.status] || 500;
    
    res.status(httpStatus).json(result);
  } catch (error: any) {
    logger.error('UCP: Complete checkout failed', { error: error.message });
    sendError(res, 500, 'Failed to complete checkout', 'COMPLETE_ERROR');
  }
});

/**
 * 3DS callback handler
 * GET /ucp/checkout/:id/complete/callback
 */
router.get('/ucp/checkout/:id/complete/callback', async (req: Request, res: Response) => {
  try {
    const { id: checkoutId } = req.params;
    const { success, transactionId } = req.query;
    
    logger.info('UCP: 3DS callback received', { checkoutId, success });
    
    if (success === 'true' && transactionId) {
      // 3DS succeeded - complete the order
      // In production: verify the 3DS result with payment processor
      
      // Redirect to success page or return JSON
      res.json({
        status: 'completed',
        message: '3DS authentication successful',
        checkoutId,
      });
    } else {
      res.status(400).json({
        status: 'failed',
        message: '3DS authentication failed or cancelled',
      });
    }
  } catch (error: any) {
    logger.error('UCP: 3DS callback failed', { error: error.message });
    res.status(500).json({ error: 'Callback processing failed' });
  }
});
```

### 5. Add Request Schema (src/schemas/ucp/complete.schema.ts)

```typescript
import { z } from 'zod';

export const UCPCompleteCheckoutRequestSchema = z.object({
  instrumentId: z.string().min(1, 'Instrument ID is required'),
  idempotencyKey: z.string().optional(),
  buyerConsent: z.object({
    termsAccepted: z.boolean(),
    marketingOptIn: z.boolean().optional(),
    privacyPolicyAccepted: z.boolean().optional(),
  }).optional(),
  metadata: z.record(z.string()).optional(),
});
```

---

## API Reference

### Complete Checkout
```
POST /ucp/checkout/:checkoutId/complete
Content-Type: application/json
Idempotency-Key: unique-request-id (optional header)

{
  "instrumentId": "instr_test_abc123",
  "idempotencyKey": "order-attempt-1",
  "buyerConsent": {
    "termsAccepted": true,
    "marketingOptIn": false
  }
}

Response 200 (Success):
{
  "status": "completed",
  "order": {
    "id": "order-456",
    "number": "10042",
    "status": "confirmed",
    "totals": {
      "total": { "amount": 40.00, "formatted": "$40.00" },
      "itemCount": 2
    },
    "createdAt": "2026-01-18T12:00:00Z"
  },
  "transaction": {
    "id": "txn_abc123",
    "status": "captured",
    "amount": { "amount": 40.00, "formatted": "$40.00" },
    "paymentMethod": {
      "type": "card",
      "brand": "visa",
      "last4": "4242"
    }
  }
}

Response 202 (Action Required):
{
  "status": "action_required",
  "action": {
    "type": "3ds_authentication",
    "url": "https://bank.example.com/3ds/verify",
    "returnUrl": "https://ucp.example.com/checkout/123/complete/callback"
  }
}

Response 400 (Failed):
{
  "status": "failed",
  "error": {
    "code": "PAYMENT_DECLINED",
    "message": "Card was declined",
    "declineReason": "insufficient_funds",
    "retryable": false
  }
}
```

---

## Error Codes

| Code | HTTP | Description | Retryable |
|------|------|-------------|-----------|
| INSTRUMENT_INVALID | 400 | Instrument not found or invalid | No |
| INSTRUMENT_EXPIRED | 400 | Instrument has expired | No |
| CHECKOUT_NOT_FOUND | 404 | Checkout does not exist | No |
| CHECKOUT_ALREADY_COMPLETED | 409 | Checkout already has an order | No |
| PAYMENT_DECLINED | 400 | Payment was declined | No |
| INSUFFICIENT_FUNDS | 400 | Insufficient funds | No |
| CARD_EXPIRED | 400 | Card has expired | No |
| FRAUD_SUSPECTED | 400 | Transaction flagged as fraud | No |
| PAYMENT_FAILED | 500 | Generic payment failure | Yes |
| ORDER_CREATION_FAILED | 500 | Payment OK but order failed | Yes |
| IDEMPOTENCY_CONFLICT | 409 | Key used with different checkout | No |

---

## Acceptance Criteria

- [ ] POST /ucp/checkout/:id/complete processes payment
- [ ] Successful payment creates Wix order
- [ ] 3DS flows return action_required with URL
- [ ] Idempotency keys prevent duplicate charges
- [ ] Instruments deleted after use
- [ ] Error responses include retryable flag
- [ ] Checkout status updated after completion
- [ ] Transaction details included in response

---

## Testing Scenarios

### Sandbox Handler Test Cases
| Amount Ending | Expected Result |
|---------------|-----------------|
| .00 | Success |
| .01 | Decline (insufficient_funds) |
| .02 | Requires 3DS |
| .99 | Success |

### Test Flow
```bash
# 1. Create checkout
POST /ucp/checkout
{ "items": [...] }

# 2. Mint instrument
POST /ucp/payment-handlers/com.test.sandbox/mint
{ "checkoutId": "checkout-123" }

# 3. Complete checkout
POST /ucp/checkout/checkout-123/complete
{ "instrumentId": "instr_test_abc" }
```

---

## Security Considerations

- Always validate instrument belongs to checkout
- Idempotency keys must be unique per client
- Delete instruments immediately after use
- Log transaction IDs, never card details
- Rate limit complete endpoint
- Monitor for duplicate completion attempts
