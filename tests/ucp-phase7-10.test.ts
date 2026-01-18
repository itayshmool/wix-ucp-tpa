/**
 * UCP Phase 7-10 Tests
 * 
 * Tests for:
 * - Phase 7: Orders capability
 * - Phase 8: Schema validation
 * - Phase 9: Fulfillment extension & webhooks
 * - Phase 10: Discounts extension
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
    updateCurrentCartLineItemQuantity: vi.fn(),
    removeLineItemsFromCurrentCart: vi.fn(),
  },
  cart: {
    getCart: vi.fn(),
  },
  checkout: {
    createCheckout: vi.fn(),
    getCheckout: vi.fn(),
    getCheckoutUrl: vi.fn(),
    applyCoupon: vi.fn(),
    removeCoupon: vi.fn(),
  },
  products: {
    queryProducts: vi.fn(() => ({
      limit: vi.fn(() => ({
        skip: vi.fn(() => ({
          find: vi.fn(),
        })),
      })),
    })),
    getProduct: vi.fn(),
  },
  orders: {
    searchOrders: vi.fn(),
    getOrder: vi.fn(),
  },
};

// Import routes after mocking
import ucpRoutes from '../src/routes/ucp.routes.js';

// Import fulfillment service for clearing test data
import { clearFulfillmentData } from '../src/services/fulfillment/fulfillment.service.js';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/', ucpRoutes);
  return app;
}

describe('UCP Phase 7-10 Tests', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    clearFulfillmentData();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // Phase 7: Orders Capability Tests
  // ==========================================================================
  describe('Phase 7: Orders Capability', () => {
    describe('GET /ucp/orders', () => {
      it('should return empty orders list when no orders exist', async () => {
        mockWixClient.orders.searchOrders.mockResolvedValueOnce({
          orders: [],
          metadata: { count: 0 },
        });

        const response = await request(app)
          .get('/ucp/orders')
          .expect(200);

        expect(response.body.orders).toEqual([]);
        expect(response.body.pagination.total).toBe(0);
      });

      it('should return orders list with correct UCP format', async () => {
        const mockOrder = {
          _id: 'order-123',
          number: '1001',
          status: 'APPROVED',
          paymentStatus: 'PAID',
          fulfillmentStatus: 'NOT_FULFILLED',
          currency: 'USD',
          lineItems: [
            {
              id: 'item-1',
              catalogReference: { catalogItemId: 'prod-1' },
              productName: { original: 'Test Product' },
              price: { amount: '10.00', formattedAmount: '$10.00' },
              quantity: 2,
            },
          ],
          priceSummary: {
            subtotal: { amount: '20.00', formattedAmount: '$20.00' },
            tax: { amount: '1.60', formattedAmount: '$1.60' },
            shipping: { amount: '0.00', formattedAmount: '$0.00' },
            total: { amount: '21.60', formattedAmount: '$21.60' },
          },
          buyerInfo: {
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
          },
          createdDate: '2024-01-15T10:00:00Z',
          updatedDate: '2024-01-15T10:00:00Z',
        };

        mockWixClient.orders.searchOrders.mockResolvedValueOnce({
          orders: [mockOrder],
          metadata: { count: 1 },
        });

        const response = await request(app)
          .get('/ucp/orders')
          .expect(200);

        expect(response.body.orders).toHaveLength(1);
        expect(response.body.orders[0]).toMatchObject({
          id: 'order-123',
          number: '1001',
          status: 'confirmed',
          paymentStatus: 'paid',
          fulfillmentStatus: 'unfulfilled',
        });
      });

      it('should respect pagination parameters', async () => {
        mockWixClient.orders.searchOrders.mockResolvedValueOnce({
          orders: [],
          metadata: { count: 0 },
        });

        await request(app)
          .get('/ucp/orders?limit=10&offset=5')
          .expect(200);

        expect(mockWixClient.orders.searchOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            paging: { limit: 10, offset: 5 },
          })
        );
      });
    });

    describe('GET /ucp/orders/:id', () => {
      it('should return order by ID', async () => {
        const mockOrder = {
          _id: 'order-123',
          number: '1001',
          status: 'APPROVED',
          paymentStatus: 'PAID',
          fulfillmentStatus: 'FULFILLED',
          currency: 'USD',
          lineItems: [],
          priceSummary: {
            subtotal: { amount: '20.00', formattedAmount: '$20.00' },
            tax: { amount: '0', formattedAmount: '$0.00' },
            shipping: { amount: '0', formattedAmount: '$0.00' },
            total: { amount: '20.00', formattedAmount: '$20.00' },
          },
          fulfillments: [
            {
              _id: 'fulfill-1',
              trackingInfo: {
                trackingNumber: '1Z999',
                shippingProvider: 'UPS',
                trackingLink: 'https://tracking.ups.com/1Z999',
              },
            },
          ],
          createdDate: '2024-01-15T10:00:00Z',
          updatedDate: '2024-01-15T10:00:00Z',
        };

        mockWixClient.orders.getOrder.mockResolvedValueOnce({ order: mockOrder });

        const response = await request(app)
          .get('/ucp/orders/order-123')
          .expect(200);

        expect(response.body.id).toBe('order-123');
        expect(response.body.fulfillmentStatus).toBe('fulfilled');
        expect(response.body.fulfillments).toHaveLength(1);
        expect(response.body.fulfillments[0].tracking).toMatchObject({
          carrier: 'UPS',
          trackingNumber: '1Z999',
        });
      });

      it('should return 404 for non-existent order', async () => {
        mockWixClient.orders.getOrder.mockRejectedValueOnce(
          new Error('Order not found')
        );

        const response = await request(app)
          .get('/ucp/orders/non-existent')
          .expect(404);

        expect(response.body.code).toBe('ORDER_NOT_FOUND');
      });
    });

    describe('GET /ucp/orders/:id/fulfillments', () => {
      it('should return order fulfillments', async () => {
        const mockOrder = {
          _id: 'order-123',
          fulfillmentStatus: 'PARTIALLY_FULFILLED',
          fulfillments: [
            {
              _id: 'fulfill-1',
              lineItems: [{ id: 'item-1', quantity: 1 }],
              trackingInfo: {
                trackingNumber: '1Z999',
                shippingProvider: 'FedEx',
              },
            },
          ],
          priceSummary: {
            subtotal: { amount: '20.00' },
            tax: { amount: '0' },
            shipping: { amount: '0' },
            total: { amount: '20.00' },
          },
          createdDate: '2024-01-15T10:00:00Z',
          updatedDate: '2024-01-15T10:00:00Z',
        };

        mockWixClient.orders.getOrder.mockResolvedValueOnce({ order: mockOrder });

        const response = await request(app)
          .get('/ucp/orders/order-123/fulfillments')
          .expect(200);

        expect(response.body.orderId).toBe('order-123');
        expect(response.body.fulfillmentStatus).toBe('partially_fulfilled');
        expect(response.body.fulfillments).toHaveLength(1);
      });
    });
  });

  // ==========================================================================
  // Phase 8: Schema Validation Tests
  // ==========================================================================
  describe('Phase 8: Schema Validation', () => {
    describe('POST /ucp/cart validation', () => {
      it('should reject empty items array', async () => {
        const response = await request(app)
          .post('/ucp/cart')
          .send({ items: [] })
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
        expect(response.body.details).toContainEqual(
          expect.objectContaining({ field: 'items' })
        );
      });

      it('should reject missing productId', async () => {
        const response = await request(app)
          .post('/ucp/cart')
          .send({ items: [{ quantity: 1 }] })
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject negative quantity', async () => {
        const response = await request(app)
          .post('/ucp/cart')
          .send({ items: [{ productId: 'prod-1', quantity: -1 }] })
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
      });

      it('should accept valid cart creation request', async () => {
        mockWixClient.currentCart.addToCurrentCart.mockResolvedValueOnce({
          cart: {
            id: 'cart-123',
            lineItems: [
              {
                id: 'item-1',
                catalogReference: { catalogItemId: 'prod-1' },
                productName: { original: 'Test' },
                price: { amount: '10.00' },
                quantity: 1,
              },
            ],
          },
        });

        const response = await request(app)
          .post('/ucp/cart')
          .send({ items: [{ productId: 'prod-1', quantity: 1 }] })
          .expect(201);

        expect(response.body.id).toBe('cart-123');
      });
    });

    describe('PUT /ucp/cart/items/:itemId validation', () => {
      it('should reject missing quantity', async () => {
        const response = await request(app)
          .put('/ucp/cart/items/item-1')
          .send({})
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject negative quantity', async () => {
        const response = await request(app)
          .put('/ucp/cart/items/item-1')
          .send({ quantity: -5 })
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
      });

      it('should accept quantity of 0 (for removal)', async () => {
        mockWixClient.currentCart.updateCurrentCartLineItemQuantity.mockResolvedValueOnce({
          cart: { id: 'cart-123', lineItems: [] },
        });

        const response = await request(app)
          .put('/ucp/cart/items/item-1')
          .send({ quantity: 0 })
          .expect(200);

        expect(response.body.id).toBe('cart-123');
      });
    });

    describe('POST /ucp/checkout validation', () => {
      it('should accept empty body (uses current cart)', async () => {
        mockWixClient.currentCart.getCurrentCart.mockResolvedValueOnce({
          lineItems: [{ catalogReference: { catalogItemId: 'prod-1' }, quantity: 1 }],
        });
        mockWixClient.checkout.createCheckout.mockResolvedValueOnce({
          _id: 'checkout-123',
          priceSummary: {
            subtotal: { amount: '10.00' },
            total: { amount: '10.00' },
          },
        });
        mockWixClient.checkout.getCheckoutUrl.mockResolvedValueOnce({
          checkoutUrl: 'https://wix.com/checkout/checkout-123',
        });
        mockWixClient.currentCart.deleteCurrentCart.mockResolvedValueOnce({});

        const response = await request(app)
          .post('/ucp/checkout')
          .send({})
          .expect(201);

        expect(response.body.id).toBe('checkout-123');
      });

      it('should reject invalid successUrl', async () => {
        const response = await request(app)
          .post('/ucp/checkout')
          .send({ successUrl: 'not-a-valid-url' })
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  // ==========================================================================
  // Phase 9: Fulfillment Extension Tests
  // ==========================================================================
  describe('Phase 9: Fulfillment Extension', () => {
    describe('Webhook Registration', () => {
      it('should register a new webhook', async () => {
        const response = await request(app)
          .post('/ucp/webhooks')
          .send({
            url: 'https://example.com/webhook',
            events: ['fulfillment.shipped', 'fulfillment.delivered'],
          })
          .expect(201);

        expect(response.body.id).toBeDefined();
        expect(response.body.url).toBe('https://example.com/webhook');
        expect(response.body.events).toContain('fulfillment.shipped');
        expect(response.body.active).toBe(true);
      });

      it('should reject invalid webhook URL', async () => {
        const response = await request(app)
          .post('/ucp/webhooks')
          .send({
            url: 'not-a-url',
            events: ['fulfillment.shipped'],
          })
          .expect(400);

        expect(response.body.code).toBe('INVALID_URL');
      });

      it('should reject invalid event types', async () => {
        const response = await request(app)
          .post('/ucp/webhooks')
          .send({
            url: 'https://example.com/webhook',
            events: ['invalid.event'],
          })
          .expect(400);

        expect(response.body.code).toBe('INVALID_EVENTS');
      });
    });

    describe('Webhook Management', () => {
      it('should list registered webhooks', async () => {
        // Register a webhook first
        await request(app)
          .post('/ucp/webhooks')
          .send({
            url: 'https://example.com/webhook',
            events: ['fulfillment.shipped'],
          });

        const response = await request(app)
          .get('/ucp/webhooks')
          .expect(200);

        expect(response.body.subscriptions).toHaveLength(1);
      });

      it('should get a specific webhook by ID', async () => {
        const createResponse = await request(app)
          .post('/ucp/webhooks')
          .send({
            url: 'https://example.com/webhook',
            events: ['fulfillment.shipped'],
          });

        const webhookId = createResponse.body.id;

        const response = await request(app)
          .get(`/ucp/webhooks/${webhookId}`)
          .expect(200);

        expect(response.body.id).toBe(webhookId);
      });

      it('should delete a webhook', async () => {
        const createResponse = await request(app)
          .post('/ucp/webhooks')
          .send({
            url: 'https://example.com/webhook',
            events: ['fulfillment.shipped'],
          });

        const webhookId = createResponse.body.id;

        await request(app)
          .delete(`/ucp/webhooks/${webhookId}`)
          .expect(200);

        await request(app)
          .get(`/ucp/webhooks/${webhookId}`)
          .expect(404);
      });
    });

    describe('Fulfillment Events', () => {
      it('should simulate a fulfillment event', async () => {
        const response = await request(app)
          .post('/ucp/test/fulfillment')
          .send({
            orderId: 'order-123',
            fulfillmentId: 'fulfill-1',
            status: 'SHIPPED',
            lineItems: [{ lineItemId: 'item-1', quantity: 1 }],
            tracking: {
              carrier: 'UPS',
              trackingNumber: '1Z999',
              trackingUrl: 'https://ups.com/track/1Z999',
            },
          })
          .expect(201);

        expect(response.body.event.type).toBe('fulfillment.shipped');
        expect(response.body.event.payload.tracking.carrier).toBe('UPS');
      });

      it('should get fulfillment events for an order', async () => {
        // Create an event first
        await request(app)
          .post('/ucp/test/fulfillment')
          .send({
            orderId: 'order-456',
            fulfillmentId: 'fulfill-1',
            status: 'DELIVERED',
            lineItems: [{ lineItemId: 'item-1', quantity: 1 }],
          });

        const response = await request(app)
          .get('/ucp/orders/order-456/events')
          .expect(200);

        expect(response.body.orderId).toBe('order-456');
        expect(response.body.events).toHaveLength(1);
        expect(response.body.events[0].type).toBe('fulfillment.delivered');
      });
    });
  });

  // ==========================================================================
  // Phase 10: Discounts Extension Tests
  // ==========================================================================
  describe('Phase 10: Discounts Extension', () => {
    describe('POST /ucp/checkout/:checkoutId/coupons', () => {
      it('should apply a valid coupon', async () => {
        mockWixClient.checkout.applyCoupon.mockResolvedValueOnce({
          checkout: {
            _id: 'checkout-123',
            currency: 'USD',
            appliedDiscounts: [
              {
                coupon: {
                  _id: 'coupon-1',
                  code: 'SAVE10',
                  name: 'Save 10%',
                  percentOff: 10,
                },
                discountAmount: { amount: '5.00', formattedAmount: '$5.00' },
              },
            ],
            priceSummary: {
              subtotal: { amount: '50.00', formattedAmount: '$50.00' },
              total: { amount: '45.00', formattedAmount: '$45.00' },
            },
          },
        });

        const response = await request(app)
          .post('/ucp/checkout/checkout-123/coupons')
          .send({ code: 'SAVE10' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.discount.code).toBe('SAVE10');
        expect(response.body.discount.type).toBe('percentage');
        expect(response.body.totals.discount.amount).toBe(5);
      });

      it('should reject empty coupon code', async () => {
        const response = await request(app)
          .post('/ucp/checkout/checkout-123/coupons')
          .send({ code: '' })
          .expect(400);

        expect(response.body.code).toBe('INVALID_REQUEST');
      });

      it('should handle invalid coupon', async () => {
        mockWixClient.checkout.applyCoupon.mockResolvedValueOnce({
          checkout: {
            _id: 'checkout-123',
            currency: 'USD',
            appliedDiscounts: [],
            validationErrors: [
              { type: 'COUPON', message: 'Coupon not found' },
            ],
          },
        });

        const response = await request(app)
          .post('/ucp/checkout/checkout-123/coupons')
          .send({ code: 'INVALID' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBeDefined();
      });
    });

    describe('DELETE /ucp/checkout/:checkoutId/coupons', () => {
      it('should remove coupon from checkout', async () => {
        mockWixClient.checkout.removeCoupon.mockResolvedValueOnce({
          checkout: {
            _id: 'checkout-123',
            currency: 'USD',
            priceSummary: {
              subtotal: { amount: '50.00', formattedAmount: '$50.00' },
              total: { amount: '50.00', formattedAmount: '$50.00' },
            },
          },
        });

        const response = await request(app)
          .delete('/ucp/checkout/checkout-123/coupons')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.totals.discount.amount).toBe(0);
      });
    });

    describe('GET /ucp/checkout/:checkoutId/discounts', () => {
      it('should return applied discounts', async () => {
        mockWixClient.checkout.getCheckout.mockResolvedValueOnce({
          checkout: {
            _id: 'checkout-123',
            currency: 'USD',
            appliedDiscounts: [
              {
                coupon: {
                  _id: 'coupon-1',
                  code: 'SAVE10',
                  name: 'Save 10%',
                  percentOff: 10,
                },
                discountAmount: { amount: '5.00', formattedAmount: '$5.00' },
              },
            ],
          },
        });

        const response = await request(app)
          .get('/ucp/checkout/checkout-123/discounts')
          .expect(200);

        expect(response.body.checkoutId).toBe('checkout-123');
        expect(response.body.discounts).toHaveLength(1);
        expect(response.body.discounts[0].code).toBe('SAVE10');
      });
    });
  });

  // ==========================================================================
  // Discovery Endpoint Tests
  // ==========================================================================
  describe('Discovery Endpoint Updates', () => {
    it('should include new capabilities in discovery', async () => {
      const response = await request(app)
        .get('/.well-known/ucp')
        .expect(200);

      expect(response.body.capabilities).toContain('orders');
      expect(response.body.capabilities).toContain('fulfillment');
      expect(response.body.capabilities).toContain('discounts');
    });
  });
});
