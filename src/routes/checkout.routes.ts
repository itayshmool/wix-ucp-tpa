/**
 * Checkout API Routes
 * 
 * Routes for creating checkouts and generating hosted checkout URLs.
 * THE CRITICAL ENDPOINTS for enabling LLM agents to complete purchases.
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error-handler.js';
import { instanceStore } from '../store/store.js';
import { CheckoutService } from '../services/checkout/checkout.service.js';
import { CartService } from '../services/cart/cart.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * Middleware to check for instance and authentication
 */
router.use('/:instanceId/*', async (req: Request, _res: Response, next) => {
  const { instanceId } = req.params;
    const instance = await instanceStore.get(instanceId);

  if (!instance) {
    logger.warn('Instance not found for checkout API access', { instanceId });
    throw new AppError('App instance not found. Please ensure the app is installed.', 404);
  }

  // Check for any form of authentication
  if (!instance.accessToken && !instance.instanceParam) {
    logger.warn('No authentication available for checkout API access', { instanceId });
    throw new AppError('No authentication available. Instance has neither OAuth token nor instance parameter.', 401);
  }

  // Attach instance to request for later use
  (req as any).wixInstance = instance;
  next();
});

// ============================================================================
// Checkout API Endpoints
// ============================================================================

/**
 * POST /api/:instanceId/checkout/from-cart
 * Create checkout from cart ID
 */
router.post('/:instanceId/checkout/from-cart', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId } = req.params;
  const accessToken = (req as any).wixAccessToken;
  const { cartId, channelType, buyerInfo, shippingAddress, billingAddress } = req.body;

  if (!cartId) {
    throw new AppError('Cart ID is required', 400);
  }

  const checkoutService = new CheckoutService(accessToken);
  const checkout = await checkoutService.createCheckoutFromCart(cartId, {
    channelType,
    buyerInfo,
    shippingAddress,
    billingAddress,
  });

  res.json({ success: true, data: checkout, message: 'Checkout created from cart' });
}));

/**
 * GET /api/:instanceId/checkout/:checkoutId
 * Get checkout by ID
 */
router.get('/:instanceId/checkout/:checkoutId', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId, checkoutId } = req.params;
  const instance = (req as any).wixInstance;
  const authToken = instance.accessToken || instance.instanceParam;
  const checkoutService = new CheckoutService(authToken);
  const checkout = await checkoutService.getCheckout(checkoutId);

  res.json({ success: true, data: checkout });
}));

/**
 * POST /api/:instanceId/checkout/:checkoutId/url
 * Get checkout URL - **THE CRITICAL ENDPOINT**
 * 
 * This generates the Wix hosted checkout URL where the buyer completes payment.
 * This is what LLM agents call to get the payment link.
 */
router.post('/:instanceId/checkout/:checkoutId/url', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId, checkoutId } = req.params;
  const accessToken = (req as any).wixAccessToken;
  const { successUrl, cancelUrl, thankYouPageUrl } = req.body;

  const checkoutService = new CheckoutService(accessToken);
  const checkoutUrl = await checkoutService.getCheckoutUrl(checkoutId, {
    successUrl,
    cancelUrl,
    thankYouPageUrl,
  });

  res.json({ 
    success: true, 
    data: { checkoutId, checkoutUrl }, 
    message: 'Checkout URL generated successfully' 
  });
}));

/**
 * PATCH /api/:instanceId/checkout/:checkoutId/buyer
 * Update buyer info on checkout
 */
router.patch('/:instanceId/checkout/:checkoutId/buyer', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId, checkoutId } = req.params;
  const accessToken = (req as any).wixAccessToken;
  const { buyerInfo } = req.body;

  if (!buyerInfo) {
    throw new AppError('Buyer info is required', 400);
  }

  const checkoutService = new CheckoutService(accessToken);
  const checkout = await checkoutService.updateBuyerInfo(checkoutId, buyerInfo);

  res.json({ success: true, data: checkout, message: 'Buyer info updated' });
}));

/**
 * PATCH /api/:instanceId/checkout/:checkoutId/shipping
 * Update shipping address on checkout
 */
router.patch('/:instanceId/checkout/:checkoutId/shipping', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId, checkoutId } = req.params;
  const accessToken = (req as any).wixAccessToken;
  const { address, contactDetails } = req.body;

  if (!address) {
    throw new AppError('Shipping address is required', 400);
  }

  const checkoutService = new CheckoutService(accessToken);
  const checkout = await checkoutService.updateShippingAddress(checkoutId, address, contactDetails);

  res.json({ success: true, data: checkout, message: 'Shipping address updated' });
}));

// ============================================================================
// Convenience Endpoints for LLM Agents
// ============================================================================

/**
 * POST /api/:instanceId/checkout/quick
 * Quick checkout: Create cart with items, create checkout, get URL
 * 
 * This is the ONE-CALL endpoint for LLM agents:
 * 1. Create cart with items
 * 2. Create checkout from cart
 * 3. Generate and return checkout URL
 * 
 * Example request:
 * {
 *   "items": [
 *     { "catalogReference": {...}, "quantity": 2 }
 *   ],
 *   "buyerInfo": { "email": "buyer@example.com" },
 *   "successUrl": "https://yourapp.com/success",
 *   "cancelUrl": "https://yourapp.com/cancel"
 * }
 */
router.post('/:instanceId/checkout/quick', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId } = req.params;
  const accessToken = (req as any).wixAccessToken;
  const { 
    items, 
    buyerInfo, 
    shippingAddress, 
    billingAddress, 
    successUrl, 
    cancelUrl, 
    thankYouPageUrl, 
    currency,
    couponCode 
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Items array is required and cannot be empty', 400);
  }

  logger.info('Quick checkout requested', { 
    instanceId: _instanceId, 
    itemCount: items.length,
    hasBuyerInfo: !!buyerInfo,
  });

  // Step 1: Create cart with items
  const cartService = new CartService(accessToken);
  const cart = await cartService.createCartWithItems(items, { currency, couponCode });
  logger.info('Cart created for quick checkout', { cartId: cart.id });

  // Step 2: Create checkout from cart
  const checkoutService = new CheckoutService(accessToken);
  const checkout = await checkoutService.createCheckoutFromCart(cart.id, {
    buyerInfo,
    shippingAddress,
    billingAddress,
  });
  logger.info('Checkout created for quick checkout', { checkoutId: checkout.id });

  // Step 3: Generate checkout URL
  const checkoutUrl = await checkoutService.getCheckoutUrl(checkout.id, {
    successUrl,
    cancelUrl,
    thankYouPageUrl,
  });
  logger.info('Quick checkout URL generated', { checkoutUrl });

  res.json({
    success: true,
    data: {
      cartId: cart.id,
      checkoutId: checkout.id,
      checkoutUrl,
      priceSummary: checkout.priceSummary,
    },
    message: 'Quick checkout created successfully. Redirect buyer to checkoutUrl.',
  });
}));

/**
 * GET /api/:instanceId/checkout/:checkoutId/status
 * Check checkout status (for LLM agents to poll after redirect)
 */
router.get('/:instanceId/checkout/:checkoutId/status', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId, checkoutId } = req.params;
  const instance = (req as any).wixInstance;
  const authToken = instance.accessToken || instance.instanceParam;
  const checkoutService = new CheckoutService(authToken);
  const checkout = await checkoutService.getCheckout(checkoutId);

  res.json({
    success: true,
    data: {
      checkoutId: checkout.id,
      status: checkout.status,
      paymentStatus: checkout.paymentStatus,
      isCompleted: checkout.status === 'COMPLETED',
      isPaid: checkout.paymentStatus === 'PAID',
    },
  });
}));

export default router;
