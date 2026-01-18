/**
 * UCP Phase 11 Tests - Payment Handlers
 * 
 * Tests for:
 * - Payment handler listing and discovery
 * - Instrument minting (tokenization)
 * - Sandbox payment handler
 * - Instrument validation and management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the Wix SDK client before importing routes
vi.mock('../src/wix/sdk-client.js', () => ({
  getWixSdkClient: vi.fn(() => mockWixClient),
}));

// Mock logger to avoid console output in tests
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock config
vi.mock('../src/config/env.js', () => ({
  config: {
    BASE_URL: 'https://test.example.com',
  },
}));

// Create mock Wix client
const mockWixClient = {
  currentCart: {
    deleteCurrentCart: vi.fn(),
    getCurrentCart: vi.fn(),
    addToCurrentCart: vi.fn(),
  },
  cart: {
    getCart: vi.fn(),
  },
  checkout: {
    createCheckout: vi.fn(),
    getCheckout: vi.fn(),
    getCheckoutUrl: vi.fn(),
  },
  products: {
    queryProducts: vi.fn(() => ({
      limit: vi.fn(() => ({
        skip: vi.fn(() => ({
          find: vi.fn(),
        })),
      })),
    })),
  },
  orders: {
    searchOrders: vi.fn(),
    getOrder: vi.fn(),
  },
};

// Import routes after mocking
import ucpRoutes from '../src/routes/ucp.routes.js';

// Import payment service for clearing test data
import { clearPaymentData, getInstrumentCount } from '../src/services/payment/payment.service.js';
import { SandboxTestCards } from '../src/services/payment/payment.types.js';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/', ucpRoutes);
  return app;
}

describe('UCP Phase 11: Payment Handlers', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    clearPaymentData();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // Payment Handler Discovery
  // ==========================================================================
  describe('Payment Handler Discovery', () => {
    describe('GET /ucp/payment-handlers', () => {
      it('should list all enabled payment handlers', async () => {
        const response = await request(app)
          .get('/ucp/payment-handlers')
          .expect(200);

        expect(response.body.handlers).toBeDefined();
        expect(Array.isArray(response.body.handlers)).toBe(true);
        expect(response.body.defaultHandler).toBe('com.wix.checkout.v1');
        
        // Should include enabled handlers
        const handlerIds = response.body.handlers.map((h: any) => h.id);
        expect(handlerIds).toContain('com.wix.checkout.v1');
        expect(handlerIds).toContain('com.ucp.sandbox');
      });

      it('should include all handlers when enabledOnly=false', async () => {
        const response = await request(app)
          .get('/ucp/payment-handlers?enabledOnly=false')
          .expect(200);

        const handlerIds = response.body.handlers.map((h: any) => h.id);
        expect(handlerIds).toContain('com.google.pay');
        expect(handlerIds).toContain('com.apple.pay');
      });

      it('should include handler details', async () => {
        const response = await request(app)
          .get('/ucp/payment-handlers')
          .expect(200);

        const sandboxHandler = response.body.handlers.find(
          (h: any) => h.id === 'com.ucp.sandbox'
        );

        expect(sandboxHandler).toBeDefined();
        expect(sandboxHandler.name).toBe('Sandbox (Test)');
        expect(sandboxHandler.capabilities).toContain('tokenization');
        expect(sandboxHandler.supportedCurrencies).toContain('USD');
        expect(sandboxHandler.enabled).toBe(true);
      });
    });

    describe('GET /ucp/payment-handlers/:handlerId', () => {
      it('should return a specific handler', async () => {
        const response = await request(app)
          .get('/ucp/payment-handlers/com.ucp.sandbox')
          .expect(200);

        expect(response.body.id).toBe('com.ucp.sandbox');
        expect(response.body.name).toBe('Sandbox (Test)');
      });

      it('should return 404 for unknown handler', async () => {
        const response = await request(app)
          .get('/ucp/payment-handlers/unknown.handler')
          .expect(404);

        expect(response.body.code).toBe('HANDLER_NOT_FOUND');
      });
    });
  });

  // ==========================================================================
  // Instrument Minting
  // ==========================================================================
  describe('Instrument Minting', () => {
    describe('POST /ucp/checkout/:checkoutId/mint', () => {
      it('should mint a sandbox instrument successfully', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'USD',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.instrument).toBeDefined();
        expect(response.body.instrument.id).toMatch(/^inst_sandbox_/);
        expect(response.body.instrument.handlerId).toBe('com.ucp.sandbox');
        expect(response.body.instrument.type).toBe('sandbox');
        expect(response.body.instrument.amount).toBe(25.99);
        expect(response.body.instrument.currency).toBe('USD');
        expect(response.body.instrument.status).toBe('active');
        expect(response.body.instrument.token).toMatch(/^tok_sandbox_/);
      });

      it('should include display information for card', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 50.00,
            currency: 'USD',
            paymentData: {
              cardNumber: '4111111111111111',
            },
          })
          .expect(201);

        expect(response.body.instrument.display).toBeDefined();
        expect(response.body.instrument.display.brand).toBe('Visa');
        expect(response.body.instrument.display.last4).toBe('1111');
      });

      it('should mint Wix redirect instrument', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-456/mint')
          .send({
            handlerId: 'com.wix.checkout.v1',
            amount: 100.00,
            currency: 'USD',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.instrument.type).toBe('redirect');
        expect(response.body.instrument.redirectUrl).toContain('checkout-456');
      });

      it('should reject unknown handler', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'unknown.handler',
            amount: 25.99,
            currency: 'USD',
          })
          .expect(400);

        // Zod validation catches unknown handler first
        expect(response.body.code).toBe('VALIDATION_ERROR');
        expect(response.body.details).toContainEqual(
          expect.objectContaining({ field: 'handlerId' })
        );
      });

      it('should reject disabled handler', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.google.pay',
            amount: 25.99,
            currency: 'USD',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('HANDLER_DISABLED');
      });

      it('should reject unsupported currency', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'XYZ',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('UNSUPPORTED_CURRENCY');
      });

      it('should reject invalid amount', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: -10,
            currency: 'USD',
          })
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject missing required fields', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
          })
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
        expect(response.body.details).toContainEqual(
          expect.objectContaining({ field: 'amount' })
        );
      });
    });

    describe('Idempotency', () => {
      it('should return same instrument for duplicate idempotency key', async () => {
        const idempotencyKey = 'test-key-123';

        const response1 = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'USD',
            idempotencyKey,
          })
          .expect(201);

        const response2 = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'USD',
            idempotencyKey,
          })
          .expect(201);

        expect(response1.body.instrument.id).toBe(response2.body.instrument.id);
      });
    });

    describe('Sandbox Test Cards', () => {
      it('should accept success test card', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'USD',
            paymentData: {
              cardNumber: SandboxTestCards.SUCCESS,
            },
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should reject decline test card', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'USD',
            paymentData: {
              cardNumber: SandboxTestCards.DECLINE,
            },
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('declined');
      });

      it('should reject insufficient funds test card', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'USD',
            paymentData: {
              cardNumber: SandboxTestCards.INSUFFICIENT_FUNDS,
            },
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Insufficient');
      });

      it('should reject expired test card', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'USD',
            paymentData: {
              cardNumber: SandboxTestCards.EXPIRED,
            },
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('expired');
      });
    });
  });

  // ==========================================================================
  // Instrument Management
  // ==========================================================================
  describe('Instrument Management', () => {
    describe('GET /ucp/instruments/:instrumentId', () => {
      it('should return a minted instrument', async () => {
        // First mint an instrument
        const mintResponse = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'USD',
          })
          .expect(201);

        const instrumentId = mintResponse.body.instrument.id;

        // Then retrieve it
        const response = await request(app)
          .get(`/ucp/instruments/${instrumentId}`)
          .expect(200);

        expect(response.body.id).toBe(instrumentId);
        expect(response.body.status).toBe('active');
      });

      it('should return 404 for non-existent instrument', async () => {
        const response = await request(app)
          .get('/ucp/instruments/non-existent')
          .expect(404);

        expect(response.body.code).toBe('INSTRUMENT_NOT_FOUND');
      });
    });

    describe('POST /ucp/instruments/:instrumentId/validate', () => {
      it('should validate a valid instrument', async () => {
        // First mint an instrument
        const mintResponse = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'USD',
          })
          .expect(201);

        const instrumentId = mintResponse.body.instrument.id;

        // Validate it
        const response = await request(app)
          .post(`/ucp/instruments/${instrumentId}/validate`)
          .send({
            checkoutId: 'checkout-123',
            amount: 25.99,
            currency: 'USD',
          })
          .expect(200);

        expect(response.body.valid).toBe(true);
      });

      it('should reject mismatched amount', async () => {
        const mintResponse = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'USD',
          })
          .expect(201);

        const instrumentId = mintResponse.body.instrument.id;

        const response = await request(app)
          .post(`/ucp/instruments/${instrumentId}/validate`)
          .send({
            checkoutId: 'checkout-123',
            amount: 50.00, // Different amount
            currency: 'USD',
          })
          .expect(400);

        expect(response.body.valid).toBe(false);
        expect(response.body.errorCode).toBe('INVALID_AMOUNT');
      });

      it('should reject mismatched currency', async () => {
        const mintResponse = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'USD',
          })
          .expect(201);

        const instrumentId = mintResponse.body.instrument.id;

        const response = await request(app)
          .post(`/ucp/instruments/${instrumentId}/validate`)
          .send({
            checkoutId: 'checkout-123',
            amount: 25.99,
            currency: 'EUR', // Different currency
          })
          .expect(400);

        expect(response.body.valid).toBe(false);
        expect(response.body.errorCode).toBe('UNSUPPORTED_CURRENCY');
      });

      it('should require all fields', async () => {
        const response = await request(app)
          .post('/ucp/instruments/any-id/validate')
          .send({})
          .expect(400);

        expect(response.body.code).toBe('INVALID_REQUEST');
      });
    });

    describe('DELETE /ucp/instruments/:instrumentId', () => {
      it('should cancel an instrument', async () => {
        // First mint an instrument
        const mintResponse = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25.99,
            currency: 'USD',
          })
          .expect(201);

        const instrumentId = mintResponse.body.instrument.id;

        // Cancel it
        const response = await request(app)
          .delete(`/ucp/instruments/${instrumentId}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify it's cancelled
        const getResponse = await request(app)
          .get(`/ucp/instruments/${instrumentId}`)
          .expect(200);

        expect(getResponse.body.status).toBe('cancelled');
      });

      it('should return 404 for non-existent instrument', async () => {
        const response = await request(app)
          .delete('/ucp/instruments/non-existent')
          .expect(404);

        expect(response.body.code).toBe('INSTRUMENT_NOT_FOUND');
      });
    });
  });

  // ==========================================================================
  // Test Endpoint
  // ==========================================================================
  describe('Test Mint Endpoint', () => {
    describe('POST /ucp/test/mint', () => {
      it('should mint with defaults', async () => {
        const response = await request(app)
          .post('/ucp/test/mint')
          .send({})
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.instrument.amount).toBe(10.00);
        expect(response.body.instrument.currency).toBe('USD');
      });

      it('should accept custom amount and currency', async () => {
        const response = await request(app)
          .post('/ucp/test/mint')
          .send({
            amount: 99.99,
            currency: 'EUR',
          })
          .expect(201);

        expect(response.body.instrument.amount).toBe(99.99);
        expect(response.body.instrument.currency).toBe('EUR');
      });

      it('should accept custom card number', async () => {
        const response = await request(app)
          .post('/ucp/test/mint')
          .send({
            cardNumber: '5555555555554444', // Mastercard
          })
          .expect(201);

        expect(response.body.instrument.display.brand).toBe('Mastercard');
        expect(response.body.instrument.display.last4).toBe('4444');
      });
    });
  });

  // ==========================================================================
  // Discovery Endpoint
  // ==========================================================================
  describe('Discovery Endpoint', () => {
    it('should include payment_handlers capability', async () => {
      const response = await request(app)
        .get('/.well-known/ucp')
        .expect(200);

      expect(response.body.capabilities).toContain('payment_handlers');
    });
  });

  // ==========================================================================
  // Instrument Count (Service Level)
  // ==========================================================================
  describe('Instrument Tracking', () => {
    it('should track instrument count', async () => {
      // Clear and verify starting state
      clearPaymentData();
      let count = getInstrumentCount();
      expect(count.total).toBe(0);

      // Mint first instrument
      const response1 = await request(app)
        .post('/ucp/test/mint')
        .send({ amount: 10 });
      expect(response1.status).toBe(201);

      count = getInstrumentCount();
      expect(count.total).toBe(1);
      expect(count.active).toBe(1);

      // Mint second instrument
      const response2 = await request(app)
        .post('/ucp/test/mint')
        .send({ amount: 20 });
      expect(response2.status).toBe(201);

      count = getInstrumentCount();
      expect(count.total).toBe(2);
      expect(count.active).toBe(2);
    });
  });
});
