/**
 * UCP Phase 12 Tests - Complete Checkout
 * 
 * Tests for server-side checkout completion:
 * - Checkout completion with valid instrument
 * - Validation errors (invalid instrument, mismatched amount, etc.)
 * - Order creation and response
 * - Idempotency
 * - Full flow test endpoint
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

// Import services for clearing test data
import { clearPaymentData } from '../src/services/payment/payment.service.js';
import { clearCheckoutData, setCheckoutState } from '../src/services/checkout/complete-checkout.service.js';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/', ucpRoutes);
  return app;
}

describe('UCP Phase 12: Complete Checkout', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    clearPaymentData();
    clearCheckoutData();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // Complete Checkout Endpoint
  // ==========================================================================
  describe('POST /ucp/checkout/:checkoutId/complete', () => {
    
    describe('Successful Completion', () => {
      it('should complete checkout with valid instrument', async () => {
        // 1. Create checkout state
        setCheckoutState('checkout-123', {
          id: 'checkout-123',
          status: 'created',
          items: [
            { productId: 'prod-1', name: 'Test Product', quantity: 2, price: 10 }
          ],
          totals: { subtotal: 20, total: 20 },
          currency: 'USD',
          createdAt: new Date(),
        });

        // 2. Mint an instrument
        const mintResponse = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 20,
            currency: 'USD',
          })
          .expect(201);

        const instrumentId = mintResponse.body.instrument.id;

        // 3. Complete checkout
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/complete')
          .send({ instrumentId })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.order).toBeDefined();
        expect(response.body.order.id).toBeDefined();
        expect(response.body.order.number).toMatch(/^ORD-/);
        expect(response.body.order.status).toBe('APPROVED');
        expect(response.body.order.paymentStatus).toBe('PAID');
        expect(response.body.transaction).toBeDefined();
        expect(response.body.transaction.status).toBe('completed');
      });

      it('should include order items in response', async () => {
        setCheckoutState('checkout-456', {
          id: 'checkout-456',
          status: 'created',
          items: [
            { productId: 'prod-1', name: 'Cone Crusher', quantity: 2, price: 5.99 },
            { productId: 'prod-2', name: 'Nitro DR', quantity: 1, price: 6.99 },
          ],
          totals: { subtotal: 18.97, total: 18.97 },
          currency: 'USD',
          createdAt: new Date(),
        });

        const mintResponse = await request(app)
          .post('/ucp/checkout/checkout-456/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 18.97,
            currency: 'USD',
          })
          .expect(201);

        const response = await request(app)
          .post('/ucp/checkout/checkout-456/complete')
          .send({ instrumentId: mintResponse.body.instrument.id })
          .expect(200);

        expect(response.body.order.items).toHaveLength(2);
        expect(response.body.order.items[0].name).toBe('Cone Crusher');
        expect(response.body.order.items[1].name).toBe('Nitro DR');
        expect(response.body.order.totals.total.amount).toBe(18.97);
      });

      it('should include billing and shipping addresses if provided', async () => {
        setCheckoutState('checkout-789', {
          id: 'checkout-789',
          status: 'created',
          items: [{ productId: 'prod-1', name: 'Test', quantity: 1, price: 10 }],
          totals: { subtotal: 10, total: 10 },
          currency: 'USD',
          createdAt: new Date(),
        });

        const mintResponse = await request(app)
          .post('/ucp/checkout/checkout-789/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 10,
            currency: 'USD',
          })
          .expect(201);

        const response = await request(app)
          .post('/ucp/checkout/checkout-789/complete')
          .send({
            instrumentId: mintResponse.body.instrument.id,
            billingAddress: {
              firstName: 'John',
              lastName: 'Doe',
              addressLine1: '123 Main St',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
              country: 'US',
            },
            shippingAddress: {
              firstName: 'John',
              lastName: 'Doe',
              addressLine1: '456 Oak Ave',
              city: 'Brooklyn',
              state: 'NY',
              postalCode: '11201',
              country: 'US',
            },
          })
          .expect(200);

        expect(response.body.order.billingAddress).toBeDefined();
        expect(response.body.order.billingAddress.firstName).toBe('John');
        expect(response.body.order.shippingAddress).toBeDefined();
        expect(response.body.order.shippingAddress.city).toBe('Brooklyn');
      });
    });

    describe('Validation Errors', () => {
      it('should reject missing instrumentId', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/complete')
          .send({})
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
        expect(response.body.details).toContainEqual(
          expect.objectContaining({ field: 'instrumentId' })
        );
      });

      it('should reject non-existent instrument', async () => {
        setCheckoutState('checkout-123', {
          id: 'checkout-123',
          status: 'created',
          items: [{ productId: 'prod-1', name: 'Test', quantity: 1, price: 10 }],
          totals: { subtotal: 10, total: 10 },
          currency: 'USD',
          createdAt: new Date(),
        });

        const response = await request(app)
          .post('/ucp/checkout/checkout-123/complete')
          .send({ instrumentId: 'non-existent-instrument' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('INSTRUMENT_NOT_FOUND');
      });

      it('should reject instrument with mismatched amount', async () => {
        setCheckoutState('checkout-123', {
          id: 'checkout-123',
          status: 'created',
          items: [{ productId: 'prod-1', name: 'Test', quantity: 1, price: 50 }],
          totals: { subtotal: 50, total: 50 },
          currency: 'USD',
          createdAt: new Date(),
        });

        // Mint instrument for different amount
        const mintResponse = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25, // Wrong amount
            currency: 'USD',
          })
          .expect(201);

        const response = await request(app)
          .post('/ucp/checkout/checkout-123/complete')
          .send({ instrumentId: mintResponse.body.instrument.id })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('INVALID_AMOUNT');
      });

      it('should reject instrument with mismatched currency', async () => {
        setCheckoutState('checkout-123', {
          id: 'checkout-123',
          status: 'created',
          items: [{ productId: 'prod-1', name: 'Test', quantity: 1, price: 25 }],
          totals: { subtotal: 25, total: 25 },
          currency: 'EUR', // EUR checkout
          createdAt: new Date(),
        });

        // Mint instrument in USD
        const mintResponse = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 25,
            currency: 'USD', // Wrong currency
          })
          .expect(201);

        const response = await request(app)
          .post('/ucp/checkout/checkout-123/complete')
          .send({ instrumentId: mintResponse.body.instrument.id })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('UNSUPPORTED_CURRENCY');
      });

      it('should reject already used instrument', async () => {
        setCheckoutState('checkout-123', {
          id: 'checkout-123',
          status: 'created',
          items: [{ productId: 'prod-1', name: 'Test', quantity: 1, price: 10 }],
          totals: { subtotal: 10, total: 10 },
          currency: 'USD',
          createdAt: new Date(),
        });

        const mintResponse = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({
            handlerId: 'com.ucp.sandbox',
            amount: 10,
            currency: 'USD',
          })
          .expect(201);

        const instrumentId = mintResponse.body.instrument.id;

        // First completion should succeed
        await request(app)
          .post('/ucp/checkout/checkout-123/complete')
          .send({ instrumentId })
          .expect(200);

        // Create new checkout for second attempt
        setCheckoutState('checkout-456', {
          id: 'checkout-456',
          status: 'created',
          items: [{ productId: 'prod-1', name: 'Test', quantity: 1, price: 10 }],
          totals: { subtotal: 10, total: 10 },
          currency: 'USD',
          createdAt: new Date(),
        });

        // Second completion with same instrument should fail
        const response = await request(app)
          .post('/ucp/checkout/checkout-456/complete')
          .send({ instrumentId })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('INSTRUMENT_ALREADY_USED');
      });

      it('should reject already completed checkout', async () => {
        setCheckoutState('checkout-123', {
          id: 'checkout-123',
          status: 'created',
          items: [{ productId: 'prod-1', name: 'Test', quantity: 1, price: 10 }],
          totals: { subtotal: 10, total: 10 },
          currency: 'USD',
          createdAt: new Date(),
        });

        // Mint first instrument and complete
        const mint1 = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({ handlerId: 'com.ucp.sandbox', amount: 10, currency: 'USD' })
          .expect(201);

        await request(app)
          .post('/ucp/checkout/checkout-123/complete')
          .send({ instrumentId: mint1.body.instrument.id })
          .expect(200);

        // Mint second instrument
        const mint2 = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({ handlerId: 'com.ucp.sandbox', amount: 10, currency: 'USD' })
          .expect(201);

        // Try to complete again
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/complete')
          .send({ instrumentId: mint2.body.instrument.id })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('CHECKOUT_ALREADY_COMPLETED');
      });
    });

    describe('Idempotency', () => {
      it('should return same response for duplicate requests with idempotency key', async () => {
        setCheckoutState('checkout-123', {
          id: 'checkout-123',
          status: 'created',
          items: [{ productId: 'prod-1', name: 'Test', quantity: 1, price: 15 }],
          totals: { subtotal: 15, total: 15 },
          currency: 'USD',
          createdAt: new Date(),
        });

        const mintResponse = await request(app)
          .post('/ucp/checkout/checkout-123/mint')
          .send({ handlerId: 'com.ucp.sandbox', amount: 15, currency: 'USD' })
          .expect(201);

        const idempotencyKey = 'unique-key-12345';

        const response1 = await request(app)
          .post('/ucp/checkout/checkout-123/complete')
          .send({ instrumentId: mintResponse.body.instrument.id, idempotencyKey })
          .expect(200);

        const response2 = await request(app)
          .post('/ucp/checkout/checkout-123/complete')
          .send({ instrumentId: mintResponse.body.instrument.id, idempotencyKey })
          .expect(200);

        expect(response1.body.order.id).toBe(response2.body.order.id);
        expect(response1.body.order.number).toBe(response2.body.order.number);
        expect(response1.body.transaction.id).toBe(response2.body.transaction.id);
      });
    });
  });

  // ==========================================================================
  // Test Complete Checkout Flow Endpoint
  // ==========================================================================
  describe('POST /ucp/test/complete-checkout', () => {
    it('should complete full checkout flow in one request', async () => {
      const response = await request(app)
        .post('/ucp/test/complete-checkout')
        .send({
          amount: 29.99,
          currency: 'USD',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.checkoutId).toBeDefined();
      expect(response.body.instrument).toBeDefined();
      expect(response.body.instrument.status).toBe('used'); // Should be marked as used
      expect(response.body.order).toBeDefined();
      expect(response.body.order.status).toBe('APPROVED');
      expect(response.body.transaction).toBeDefined();
    });

    it('should use default values', async () => {
      const response = await request(app)
        .post('/ucp/test/complete-checkout')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.order.totals.total.amount).toBe(25.99); // Default amount
    });

    it('should fail with decline test card', async () => {
      const response = await request(app)
        .post('/ucp/test/complete-checkout')
        .send({
          amount: 25.99,
          currency: 'USD',
          cardNumber: '4000000000000002', // Decline card
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.step).toBe('mint');
      expect(response.body.error).toContain('declined');
    });
  });

  // ==========================================================================
  // Discovery Endpoint
  // ==========================================================================
  describe('Discovery Endpoint', () => {
    it('should include server_checkout capability', async () => {
      const response = await request(app)
        .get('/.well-known/ucp')
        .expect(200);

      expect(response.body.capabilities).toContain('server_checkout');
    });
  });

  // ==========================================================================
  // Transaction Details
  // ==========================================================================
  describe('Transaction Details', () => {
    it('should include complete transaction information', async () => {
      setCheckoutState('checkout-txn', {
        id: 'checkout-txn',
        status: 'created',
        items: [{ productId: 'prod-1', name: 'Test', quantity: 1, price: 99.99 }],
        totals: { subtotal: 99.99, total: 99.99 },
        currency: 'USD',
        createdAt: new Date(),
      });

      const mintResponse = await request(app)
        .post('/ucp/checkout/checkout-txn/mint')
        .send({ handlerId: 'com.ucp.sandbox', amount: 99.99, currency: 'USD' })
        .expect(201);

      const response = await request(app)
        .post('/ucp/checkout/checkout-txn/complete')
        .send({ instrumentId: mintResponse.body.instrument.id })
        .expect(200);

      expect(response.body.transaction.id).toMatch(/^txn_/);
      expect(response.body.transaction.instrumentId).toBe(mintResponse.body.instrument.id);
      expect(response.body.transaction.amount).toBe(99.99);
      expect(response.body.transaction.currency).toBe('USD');
      expect(response.body.transaction.status).toBe('completed');
      expect(response.body.transaction.processedAt).toBeDefined();
    });
  });
});
