# Phase 11: Payment Handlers (Mint Instrument)

## Context
The Mint Instrument flow is the core differentiator between redirect-based checkout (our current POC) and true server-side commerce. UCP spec defines payment handlers that can mint payment credentials, allowing agents to complete transactions without redirecting users.

## Reference Documentation
- Payment Handlers Guide: https://ucp.dev/specification/payment-handlers/guide
- Payment Handler Template: https://ucp.dev/specification/payment-handlers/template
- Tokenization Guide: https://ucp.dev/specification/payment-handlers/tokenization-guide
- UCP Playground Steps 6-7

## Goal
Implement payment credential minting to enable server-side checkout completion.

## Priority: 🔴 High | Complexity: 🔴 High | Duration: 1-2 weeks

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Payment Handler Registry                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│  │ Wix Checkout    │  │ Google Pay      │  │ Sandbox         │       │
│  │ (redirect)      │  │ (token mint)    │  │ (test)          │       │
│  │                 │  │                 │  │                 │       │
│  │ com.wix.        │  │ com.google.pay  │  │ com.test.       │       │
│  │ checkout.v1     │  │                 │  │ sandbox         │       │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Instrument Store                                │
│                                                                        │
│  instrument_id │ handler_id │ checkout_id │ expires_at │ payload       │
│  ──────────────┼────────────┼─────────────┼────────────┼───────────   │
│  instr_abc123  │ google.pay │ chk_456     │ +15min     │ {token:...}  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Tasks

### 1. Create Payment Handler Types (src/services/payment-handlers/types.ts)

```typescript
export interface PaymentHandler {
  id: string;
  name: string;
  type: 'redirect' | 'token' | 'credential';
  supportedCurrencies: string[];
  supportedCountries: string[];
  
  /**
   * Whether this handler can mint instruments (vs redirect)
   */
  canMint: boolean;
  
  /**
   * Mint a payment instrument
   */
  mint?(request: MintRequest): Promise<MintResponse>;
  
  /**
   * Get redirect URL (for redirect-type handlers)
   */
  getRedirectUrl?(checkoutId: string): Promise<string>;
  
  /**
   * Process payment with minted instrument
   */
  charge?(instrument: PaymentInstrument, amount: number, currency: string): Promise<ChargeResult>;
}

export interface MintRequest {
  checkoutId: string;
  amount: number;
  currency: string;
  buyerInfo?: {
    email?: string;
    phone?: string;
  };
  paymentData?: Record<string, unknown>;  // Handler-specific data
}

export interface MintResponse {
  success: boolean;
  instrument?: PaymentInstrument;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaymentInstrument {
  id: string;
  handlerId: string;
  checkoutId: string;
  type: 'card' | 'wallet' | 'bank' | 'other';
  brand?: string;  // 'visa', 'mastercard', 'google_pay', etc.
  last4?: string;
  expiresAt: string;  // ISO 8601
  metadata?: Record<string, unknown>;
}

export interface ChargeResult {
  success: boolean;
  transactionId?: string;
  error?: {
    code: string;
    message: string;
    declineReason?: string;
  };
  requiresAction?: {
    type: '3ds_authentication' | 'redirect';
    url?: string;
    data?: Record<string, unknown>;
  };
}

export type PaymentHandlerConfig = {
  enabled: boolean;
  credentials?: Record<string, string>;
  sandbox?: boolean;
};
```

### 2. Create Payment Handler Registry (src/services/payment-handlers/registry.ts)

```typescript
import { PaymentHandler, PaymentHandlerConfig } from './types.js';
import { WixCheckoutHandler } from './handlers/wix-checkout.handler.js';
import { GooglePayHandler } from './handlers/google-pay.handler.js';
import { SandboxHandler } from './handlers/sandbox.handler.js';
import { logger } from '../../utils/logger.js';

class PaymentHandlerRegistry {
  private handlers = new Map<string, PaymentHandler>();
  
  constructor() {
    // Register built-in handlers
    this.register(new WixCheckoutHandler());
    this.register(new SandboxHandler());
    
    // Register Google Pay if configured
    if (process.env.GOOGLE_PAY_MERCHANT_ID) {
      this.register(new GooglePayHandler({
        merchantId: process.env.GOOGLE_PAY_MERCHANT_ID,
        merchantName: process.env.GOOGLE_PAY_MERCHANT_NAME || 'Pop Stop',
        environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST',
      }));
    }
    
    logger.info('Payment handlers registered', {
      handlers: Array.from(this.handlers.keys()),
    });
  }
  
  register(handler: PaymentHandler): void {
    this.handlers.set(handler.id, handler);
  }
  
  get(id: string): PaymentHandler | undefined {
    return this.handlers.get(id);
  }
  
  getAll(): PaymentHandler[] {
    return Array.from(this.handlers.values());
  }
  
  getMintable(): PaymentHandler[] {
    return this.getAll().filter(h => h.canMint);
  }
  
  getForDiscovery(): Array<{
    id: string;
    name: string;
    type: string;
    canMint: boolean;
  }> {
    return this.getAll().map(h => ({
      id: h.id,
      name: h.name,
      type: h.type,
      canMint: h.canMint,
    }));
  }
}

export const paymentHandlerRegistry = new PaymentHandlerRegistry();
```

### 3. Implement Wix Checkout Handler (src/services/payment-handlers/handlers/wix-checkout.handler.ts)

```typescript
import { PaymentHandler, MintRequest, MintResponse } from '../types.js';
import { getWixSdkClient } from '../../../wix/sdk-client.js';
import { logger } from '../../../utils/logger.js';

/**
 * Wix Hosted Checkout - Redirect-based handler
 * This is our existing flow, now formalized as a payment handler
 */
export class WixCheckoutHandler implements PaymentHandler {
  id = 'com.wix.checkout.v1';
  name = 'Wix Hosted Checkout';
  type: 'redirect' = 'redirect';
  supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
  supportedCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR'];
  canMint = false;  // Redirect-based, no minting
  
  async getRedirectUrl(checkoutId: string): Promise<string> {
    logger.info('Getting Wix checkout URL', { checkoutId });
    
    const client = getWixSdkClient();
    const response = await client.checkout.getCheckoutUrl(checkoutId);
    
    return (response as any).checkoutUrl || response;
  }
  
  // Redirect handlers don't mint instruments
  mint = undefined;
  charge = undefined;
}
```

### 4. Implement Sandbox Handler (src/services/payment-handlers/handlers/sandbox.handler.ts)

```typescript
import { v4 as uuid } from 'uuid';
import { 
  PaymentHandler, 
  MintRequest, 
  MintResponse, 
  PaymentInstrument,
  ChargeResult 
} from '../types.js';
import { instrumentStore } from '../../../store/instrument-store.js';
import { logger } from '../../../utils/logger.js';

/**
 * Sandbox Payment Handler - For testing
 * Always succeeds, no real charges
 */
export class SandboxHandler implements PaymentHandler {
  id = 'com.test.sandbox';
  name = 'Test/Sandbox';
  type: 'token' = 'token';
  supportedCurrencies = ['USD', 'EUR', 'GBP'];
  supportedCountries = ['US', 'CA', 'GB'];
  canMint = true;
  
  async mint(request: MintRequest): Promise<MintResponse> {
    logger.info('Sandbox: Minting test instrument', { 
      checkoutId: request.checkoutId,
      amount: request.amount,
    });
    
    // Simulate test card data
    const testCard = request.paymentData?.testCard as string || '4242424242424242';
    const last4 = testCard.slice(-4);
    
    // Determine card brand from test card number
    let brand = 'visa';
    if (testCard.startsWith('5')) brand = 'mastercard';
    if (testCard.startsWith('37')) brand = 'amex';
    
    const instrument: PaymentInstrument = {
      id: `instr_test_${uuid().slice(0, 8)}`,
      handlerId: this.id,
      checkoutId: request.checkoutId,
      type: 'card',
      brand,
      last4,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),  // 15 minutes
      metadata: {
        test: true,
        amount: request.amount,
        currency: request.currency,
      },
    };
    
    // Store instrument
    await instrumentStore.save(instrument);
    
    logger.info('Sandbox: Instrument minted', { instrumentId: instrument.id });
    
    return {
      success: true,
      instrument,
    };
  }
  
  async charge(
    instrument: PaymentInstrument, 
    amount: number, 
    currency: string
  ): Promise<ChargeResult> {
    logger.info('Sandbox: Processing test charge', {
      instrumentId: instrument.id,
      amount,
      currency,
    });
    
    // Simulate different outcomes based on amount
    // Amount ending in .01 = decline
    // Amount ending in .02 = requires 3DS
    const cents = Math.round(amount * 100) % 100;
    
    if (cents === 1) {
      return {
        success: false,
        error: {
          code: 'CARD_DECLINED',
          message: 'Test card declined',
          declineReason: 'insufficient_funds',
        },
      };
    }
    
    if (cents === 2) {
      return {
        success: false,
        requiresAction: {
          type: '3ds_authentication',
          url: `https://example.com/3ds?instrument=${instrument.id}`,
        },
      };
    }
    
    // Success!
    const transactionId = `txn_test_${uuid().slice(0, 8)}`;
    
    logger.info('Sandbox: Charge successful', { transactionId });
    
    return {
      success: true,
      transactionId,
    };
  }
}
```

### 5. Implement Google Pay Handler (src/services/payment-handlers/handlers/google-pay.handler.ts)

```typescript
import { v4 as uuid } from 'uuid';
import { 
  PaymentHandler, 
  MintRequest, 
  MintResponse, 
  PaymentInstrument,
  ChargeResult 
} from '../types.js';
import { instrumentStore } from '../../../store/instrument-store.js';
import { logger } from '../../../utils/logger.js';

interface GooglePayConfig {
  merchantId: string;
  merchantName: string;
  environment: 'TEST' | 'PRODUCTION';
}

/**
 * Google Pay Payment Handler
 * 
 * NOTE: Full implementation requires:
 * 1. Google Pay API integration
 * 2. Payment processor (Stripe, Braintree, etc.)
 * 3. Server-side token decryption
 */
export class GooglePayHandler implements PaymentHandler {
  id = 'com.google.pay';
  name = 'Google Pay';
  type: 'token' = 'token';
  supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
  supportedCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR'];
  canMint = true;
  
  private config: GooglePayConfig;
  
  constructor(config: GooglePayConfig) {
    this.config = config;
  }
  
  /**
   * Get Google Pay configuration for client-side initialization
   */
  getClientConfig(): Record<string, unknown> {
    return {
      environment: this.config.environment,
      merchantInfo: {
        merchantId: this.config.merchantId,
        merchantName: this.config.merchantName,
      },
      allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'],
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            gateway: 'stripe',  // Or your payment processor
            'stripe:version': '2023-10-16',
            'stripe:publishableKey': process.env.STRIPE_PUBLISHABLE_KEY,
          },
        },
      }],
    };
  }
  
  async mint(request: MintRequest): Promise<MintResponse> {
    logger.info('Google Pay: Minting instrument', {
      checkoutId: request.checkoutId,
      amount: request.amount,
    });
    
    const paymentToken = request.paymentData?.paymentToken as string;
    
    if (!paymentToken) {
      return {
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Google Pay payment token is required',
        },
      };
    }
    
    try {
      // In production: Decrypt and validate Google Pay token
      // This requires payment processor integration (Stripe, Braintree, etc.)
      
      // For now, create an instrument that wraps the token
      const instrument: PaymentInstrument = {
        id: `instr_gpay_${uuid().slice(0, 8)}`,
        handlerId: this.id,
        checkoutId: request.checkoutId,
        type: 'wallet',
        brand: 'google_pay',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        metadata: {
          paymentToken,
          // Card details from Google Pay response
          cardNetwork: request.paymentData?.cardNetwork,
          cardDetails: request.paymentData?.cardDetails,
        },
      };
      
      await instrumentStore.save(instrument);
      
      logger.info('Google Pay: Instrument minted', { instrumentId: instrument.id });
      
      return {
        success: true,
        instrument,
      };
    } catch (error) {
      logger.error('Google Pay: Mint failed', { error });
      return {
        success: false,
        error: {
          code: 'MINT_FAILED',
          message: 'Failed to process Google Pay token',
        },
      };
    }
  }
  
  async charge(
    instrument: PaymentInstrument,
    amount: number,
    currency: string
  ): Promise<ChargeResult> {
    logger.info('Google Pay: Processing charge', {
      instrumentId: instrument.id,
      amount,
      currency,
    });
    
    try {
      const paymentToken = instrument.metadata?.paymentToken as string;
      
      // In production: Use payment processor to charge
      // Example with Stripe:
      // const charge = await stripe.charges.create({
      //   amount: Math.round(amount * 100),
      //   currency,
      //   source: paymentToken,
      // });
      
      // For now, simulate success
      const transactionId = `txn_gpay_${uuid().slice(0, 8)}`;
      
      logger.info('Google Pay: Charge successful', { transactionId });
      
      return {
        success: true,
        transactionId,
      };
    } catch (error: any) {
      logger.error('Google Pay: Charge failed', { error: error.message });
      
      return {
        success: false,
        error: {
          code: 'CHARGE_FAILED',
          message: error.message || 'Payment failed',
        },
      };
    }
  }
}
```

### 6. Create Instrument Store (src/store/instrument-store.ts)

```typescript
import { PaymentInstrument } from '../services/payment-handlers/types.js';
import { logger } from '../utils/logger.js';

// In-memory store for POC (use Redis in production)
const instruments = new Map<string, PaymentInstrument>();

export const instrumentStore = {
  async save(instrument: PaymentInstrument): Promise<void> {
    instruments.set(instrument.id, instrument);
    
    // Auto-expire after expiration time
    const expiresIn = new Date(instrument.expiresAt).getTime() - Date.now();
    if (expiresIn > 0) {
      setTimeout(() => {
        instruments.delete(instrument.id);
        logger.debug('Instrument expired', { instrumentId: instrument.id });
      }, expiresIn);
    }
  },
  
  async get(id: string): Promise<PaymentInstrument | undefined> {
    const instrument = instruments.get(id);
    
    if (instrument && new Date(instrument.expiresAt) < new Date()) {
      instruments.delete(id);
      return undefined;
    }
    
    return instrument;
  },
  
  async delete(id: string): Promise<void> {
    instruments.delete(id);
  },
  
  async getByCheckout(checkoutId: string): Promise<PaymentInstrument[]> {
    return Array.from(instruments.values())
      .filter(i => i.checkoutId === checkoutId)
      .filter(i => new Date(i.expiresAt) > new Date());
  },
};
```

### 7. Create Mint Endpoint (src/routes/ucp.routes.ts)

```typescript
import { paymentHandlerRegistry } from '../services/payment-handlers/registry.js';
import { instrumentStore } from '../store/instrument-store.js';

/**
 * Get available payment handlers
 * GET /ucp/payment-handlers
 */
router.get('/ucp/payment-handlers', async (_req: Request, res: Response) => {
  const handlers = paymentHandlerRegistry.getForDiscovery();
  res.json({ handlers });
});

/**
 * Get payment handler configuration (for client-side init)
 * GET /ucp/payment-handlers/:handlerId/config
 */
router.get('/ucp/payment-handlers/:handlerId/config', async (req: Request, res: Response) => {
  const { handlerId } = req.params;
  
  const handler = paymentHandlerRegistry.get(handlerId);
  if (!handler) {
    return sendError(res, 404, 'Payment handler not found', 'HANDLER_NOT_FOUND');
  }
  
  // For Google Pay, return client config
  if (handler.id === 'com.google.pay' && 'getClientConfig' in handler) {
    const config = (handler as any).getClientConfig();
    return res.json({ config });
  }
  
  res.json({ 
    config: {
      id: handler.id,
      name: handler.name,
      type: handler.type,
    }
  });
});

/**
 * Mint payment instrument
 * POST /ucp/payment-handlers/:handlerId/mint
 * 
 * UCP Playground Step 6
 */
router.post('/ucp/payment-handlers/:handlerId/mint', async (req: Request, res: Response) => {
  try {
    const { handlerId } = req.params;
    const { checkoutId, paymentData } = req.body;
    
    if (!checkoutId) {
      return sendError(res, 400, 'checkoutId is required', 'INVALID_REQUEST');
    }
    
    logger.info('UCP: Minting payment instrument', { handlerId, checkoutId });
    
    const handler = paymentHandlerRegistry.get(handlerId);
    if (!handler) {
      return sendError(res, 404, 'Payment handler not found', 'HANDLER_NOT_FOUND');
    }
    
    if (!handler.canMint || !handler.mint) {
      return sendError(res, 400, 'Handler does not support minting', 'MINT_NOT_SUPPORTED');
    }
    
    // Get checkout to verify it exists and get amount
    const client = getWixSdkClient();
    const checkoutResponse = await client.checkout.getCheckout(checkoutId);
    const checkout = (checkoutResponse as any).checkout || checkoutResponse;
    
    if (!checkout) {
      return sendError(res, 404, 'Checkout not found', 'CHECKOUT_NOT_FOUND');
    }
    
    const amount = parseFloat(checkout.priceSummary?.total?.amount || '0');
    const currency = checkout.currency || 'USD';
    
    // Mint instrument
    const result = await handler.mint({
      checkoutId,
      amount,
      currency,
      buyerInfo: checkout.buyerInfo,
      paymentData,
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
    
    res.status(201).json({
      success: true,
      instrument: {
        id: result.instrument!.id,
        handler: result.instrument!.handlerId,
        type: result.instrument!.type,
        brand: result.instrument!.brand,
        last4: result.instrument!.last4,
        expiresAt: result.instrument!.expiresAt,
      },
    });
  } catch (error: any) {
    logger.error('UCP: Mint failed', { error: error.message });
    sendError(res, 500, 'Failed to mint instrument', 'MINT_ERROR');
  }
});

/**
 * Validate instrument
 * GET /ucp/instruments/:instrumentId
 */
router.get('/ucp/instruments/:instrumentId', async (req: Request, res: Response) => {
  try {
    const { instrumentId } = req.params;
    
    const instrument = await instrumentStore.get(instrumentId);
    
    if (!instrument) {
      return sendError(res, 404, 'Instrument not found or expired', 'INSTRUMENT_NOT_FOUND');
    }
    
    res.json({
      id: instrument.id,
      handler: instrument.handlerId,
      type: instrument.type,
      brand: instrument.brand,
      last4: instrument.last4,
      expiresAt: instrument.expiresAt,
      valid: new Date(instrument.expiresAt) > new Date(),
    });
  } catch (error: any) {
    logger.error('UCP: Instrument validation failed', { error: error.message });
    sendError(res, 500, 'Failed to validate instrument', 'INSTRUMENT_ERROR');
  }
});
```

### 8. Update Discovery

```typescript
const discovery: UCPDiscovery = {
  // ... existing fields
  payment_handlers: paymentHandlerRegistry.getForDiscovery().map(h => h.id),
  endpoints: {
    // ... existing
    payment_handlers: `${baseUrl}/ucp/payment-handlers`,
    mint: `${baseUrl}/ucp/payment-handlers/{handlerId}/mint`,
  },
};
```

---

## API Reference

### Get Payment Handlers
```
GET /ucp/payment-handlers

Response:
{
  "handlers": [
    {
      "id": "com.wix.checkout.v1",
      "name": "Wix Hosted Checkout",
      "type": "redirect",
      "canMint": false
    },
    {
      "id": "com.google.pay",
      "name": "Google Pay",
      "type": "token",
      "canMint": true
    },
    {
      "id": "com.test.sandbox",
      "name": "Test/Sandbox",
      "type": "token",
      "canMint": true
    }
  ]
}
```

### Mint Instrument
```
POST /ucp/payment-handlers/com.test.sandbox/mint
Content-Type: application/json

{
  "checkoutId": "checkout-123",
  "paymentData": {
    "testCard": "4242424242424242"
  }
}

Response 201:
{
  "success": true,
  "instrument": {
    "id": "instr_test_abc123",
    "handler": "com.test.sandbox",
    "type": "card",
    "brand": "visa",
    "last4": "4242",
    "expiresAt": "2026-01-18T11:15:00Z"
  }
}
```

---

## Acceptance Criteria

- [ ] Payment handler registry loads configured handlers
- [ ] GET /ucp/payment-handlers returns available handlers
- [ ] POST /ucp/payment-handlers/:id/mint creates instrument
- [ ] Sandbox handler works for testing
- [ ] Instruments expire after 15 minutes
- [ ] GET /ucp/instruments/:id validates instrument
- [ ] Discovery includes payment_handlers
- [ ] Google Pay handler structure ready (needs API keys for full impl)

---

## Environment Variables

```bash
# Google Pay (optional, for production)
GOOGLE_PAY_MERCHANT_ID=your-merchant-id
GOOGLE_PAY_MERCHANT_NAME=Pop Stop

# Stripe (for processing Google Pay tokens)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Security Considerations

- Instruments expire quickly (15 min)
- Instruments are single-use (delete after charge)
- Payment tokens should be encrypted at rest
- Log instrument IDs, never full tokens
- Rate limit mint endpoint
- Validate checkoutId ownership
