/**
 * UCP Endpoints Tests
 * 
 * Tests for the UCP API endpoints:
 * - DELETE /ucp/cart
 * - GET /ucp/checkout/:checkoutId/status
 * - POST /ucp/checkout
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
};

// Import routes after mocking
import ucpRoutes from '../src/routes/ucp.routes.js';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/', ucpRoutes);
  return app;
}

describe('UCP Endpoints', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('DELETE /ucp/cart', () => {
    it('should clear the cart successfully', async () => {
      mockWixClient.currentCart.deleteCurrentCart.mockResolvedValueOnce({});

      const response = await request(app)
        .delete('/ucp/cart')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Cart cleared');
      expect(response.body.cart.items).toEqual([]);
      expect(mockWixClient.currentCart.deleteCurrentCart).toHaveBeenCalledTimes(1);
    });

    it('should return success when cart is already empty', async () => {
      mockWixClient.currentCart.deleteCurrentCart.mockRejectedValueOnce(
        new Error('Cart not found')
      );

      const response = await request(app)
        .delete('/ucp/cart')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('already empty');
    });

    it('should handle unexpected errors', async () => {
      mockWixClient.currentCart.deleteCurrentCart.mockRejectedValueOnce(
        new Error('Network error')
      );

      const response = await request(app)
        .delete('/ucp/cart')
        .expect(500);

      expect(response.body.error).toBe('UCP Error');
    });
  });

  describe('GET /ucp/checkout/:checkoutId/status', () => {
    const testCheckoutId = 'test-checkout-123';

    it('should return checkout status when checkout exists and not completed', async () => {
      mockWixClient.checkout.getCheckout.mockResolvedValueOnce({
        checkout: {
          _id: testCheckoutId,
          status: 'CREATED',
          priceSummary: {
            total: { amount: '10.00', formattedAmount: '$10.00' },
          },
          currency: 'USD',
          lineItems: [{ id: 'item1' }],
        },
      });

      const response = await request(app)
        .get(`/ucp/checkout/${testCheckoutId}/status`)
        .expect(200);
      expect(response.body.checkoutId).toBe(testCheckoutId);
      expect(response.body.status).toBe('CREATED');
      expect(response.body.completed).toBe(false);
      expect(response.body.message).toContain('not yet completed');
    });

    it('should return completed=true when status is COMPLETED', async () => {
      mockWixClient.checkout.getCheckout.mockResolvedValueOnce({
        checkout: {
          _id: testCheckoutId,
          status: 'COMPLETED',
          orderId: 'order-456',
          completedDate: '2024-01-01T00:00:00Z',
        },
      });

      const response = await request(app)
        .get(`/ucp/checkout/${testCheckoutId}/status`)
        .expect(200);

      expect(response.body.completed).toBe(true);
      expect(response.body.status).toBe('COMPLETED');
    });

    it('should return completed=true when checkout is not found (payment likely completed)', async () => {
      mockWixClient.checkout.getCheckout.mockRejectedValueOnce(
        new Error('Checkout not found')
      );

      const response = await request(app)
        .get(`/ucp/checkout/${testCheckoutId}/status`)
        .expect(200);

      expect(response.body.completed).toBe(true);
      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.message).toContain('completed');
    });
  });

  describe('POST /ucp/checkout', () => {
    it('should return error when cart is empty', async () => {
      mockWixClient.currentCart.getCurrentCart.mockResolvedValueOnce({
        lineItems: [],
      });

      const response = await request(app)
        .post('/ucp/checkout')
        .send({})
        .expect(400);

      expect(response.body.code).toBe('EMPTY_CART');
    });

    it('should create checkout successfully with items in cart', async () => {
      const mockCart = {
        id: 'cart-123',
        lineItems: [
          {
            catalogReference: { catalogItemId: 'prod-1', appId: 'app-1' },
            quantity: 2,
          },
        ],
      };

      const mockCheckout = {
        _id: 'checkout-789',
        priceSummary: {
          subtotal: { amount: '8.00', formattedAmount: '$8.00' },
          total: { amount: '8.00', formattedAmount: '$8.00' },
        },
        currency: 'USD',
        lineItems: mockCart.lineItems,
      };

      mockWixClient.currentCart.getCurrentCart.mockResolvedValueOnce(mockCart);
      mockWixClient.checkout.createCheckout.mockResolvedValueOnce(mockCheckout);
      mockWixClient.checkout.getCheckoutUrl.mockResolvedValueOnce({
        checkoutUrl: 'https://www.popstopdrink.com/checkout?checkoutId=checkout-789&currency=USD',
      });
      mockWixClient.currentCart.deleteCurrentCart.mockResolvedValueOnce({});

      const response = await request(app)
        .post('/ucp/checkout')
        .send({})
        .expect(201);

      expect(response.body.id).toBe('checkout-789');
      expect(response.body.checkoutUrl).toContain('popstopdrink.com/checkout');
      expect(response.body.checkoutUrl).not.toContain('thank-you-page');
    });

    it('should reject checkout if URL contains thank-you-page', async () => {
      const mockCart = {
        id: 'cart-123',
        lineItems: [{ catalogReference: { catalogItemId: 'prod-1' }, quantity: 1 }],
      };

      mockWixClient.currentCart.getCurrentCart.mockResolvedValueOnce(mockCart);
      mockWixClient.checkout.createCheckout.mockResolvedValueOnce({
        _id: 'old-checkout',
      });
      mockWixClient.checkout.getCheckoutUrl.mockResolvedValueOnce({
        checkoutUrl: 'https://www.popstopdrink.com/thank-you-page/old-order-id',
      });
      mockWixClient.currentCart.deleteCurrentCart.mockResolvedValueOnce({});

      const response = await request(app)
        .post('/ucp/checkout')
        .send({})
        .expect(409);

      expect(response.body.code).toBe('CHECKOUT_ALREADY_COMPLETED');
    });
  });
});
