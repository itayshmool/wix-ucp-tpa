/**
 * Cart API Routes
 * 
 * Routes for managing shopping carts.
 * Used internally and by external applications (LLM agents).
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error-handler.js';
import { instanceStore } from '../store/store.js';
import { CartService } from '../services/cart/cart.service.js';
import { logger } from '../utils/logger.js';
// Types imported in service, not used directly in routes

const router = Router();

/**
 * Middleware to check for instance and OAuth tokens
 */
router.use('/:instanceId/*', async (req: Request, _res: Response, next) => {
  const { instanceId } = req.params;
    const instance = await instanceStore.get(instanceId);

  if (!instance) {
    logger.warn('Instance not found for cart API access', { instanceId });
    throw new AppError('App instance not found. Please ensure the app is installed.', 404);
  }

  if (!instance.accessToken) {
    logger.warn('Access token not available for cart API access', { instanceId });
    throw new AppError('Access token not available. Please complete OAuth flow.', 401);
  }

  // Attach instance and accessToken to request for later use
  (req as any).wixInstance = instance;
  (req as any).wixAccessToken = instance.accessToken;
  next();
});

// ============================================================================
// Cart API Endpoints
// ============================================================================

/**
 * POST /api/:instanceId/cart
 * Create a new cart (optionally with items)
 */
router.post('/:instanceId/cart', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId } = req.params;
  const accessToken = (req as any).wixAccessToken;
  const { items, currency, buyerNote, couponCode } = req.body;

  const cartService = new CartService(accessToken);

  let cart;
  if (items && Array.isArray(items) && items.length > 0) {
    // Create cart with items
    cart = await cartService.createCartWithItems(items, { currency, buyerNote, couponCode });
  } else {
    // Create empty cart
    cart = await cartService.createCart({ currency, buyerNote });
  }

  res.json({ success: true, data: cart, message: 'Cart created successfully' });
}));

/**
 * GET /api/:instanceId/cart/:cartId
 * Get cart by ID
 */
router.get('/:instanceId/cart/:cartId', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId, cartId } = req.params;
  const accessToken = (req as any).wixAccessToken;

  const cartService = new CartService(accessToken);
  const cart = await cartService.getCart(cartId);

  res.json({ success: true, data: cart });
}));

/**
 * POST /api/:instanceId/cart/:cartId/items
 * Add items to cart
 */
router.post('/:instanceId/cart/:cartId/items', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId, cartId } = req.params;
  const accessToken = (req as any).wixAccessToken;
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Items array is required and cannot be empty', 400);
  }

  const cartService = new CartService(accessToken);
  const result = await cartService.addToCart(cartId, items);

  res.json({ 
    success: true, 
    data: result.cart, 
    addedItems: result.addedItems,
    message: `${result.addedItems.length} item(s) added to cart` 
  });
}));

/**
 * PATCH /api/:instanceId/cart/:cartId/items/:lineItemId
 * Update line item quantity
 */
router.patch('/:instanceId/cart/:cartId/items/:lineItemId', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId, cartId, lineItemId } = req.params;
  const accessToken = (req as any).wixAccessToken;
  const { quantity } = req.body;

  if (typeof quantity !== 'number' || quantity < 1) {
    throw new AppError('Quantity must be a positive number', 400);
  }

  const cartService = new CartService(accessToken);
  const cart = await cartService.updateLineItemQuantity(cartId, lineItemId, quantity);

  res.json({ success: true, data: cart, message: 'Line item quantity updated' });
}));

/**
 * DELETE /api/:instanceId/cart/:cartId/items/:lineItemId
 * Remove line item from cart
 */
router.delete('/:instanceId/cart/:cartId/items/:lineItemId', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId, cartId, lineItemId } = req.params;
  const accessToken = (req as any).wixAccessToken;

  const cartService = new CartService(accessToken);
  const cart = await cartService.removeLineItem(cartId, lineItemId);

  res.json({ success: true, data: cart, message: 'Line item removed from cart' });
}));

/**
 * POST /api/:instanceId/cart/:cartId/coupon
 * Apply coupon to cart
 */
router.post('/:instanceId/cart/:cartId/coupon', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId, cartId } = req.params;
  const accessToken = (req as any).wixAccessToken;
  const { couponCode } = req.body;

  if (!couponCode) {
    throw new AppError('Coupon code is required', 400);
  }

  const cartService = new CartService(accessToken);
  const cart = await cartService.applyCoupon(cartId, couponCode);

  res.json({ success: true, data: cart, message: 'Coupon applied to cart' });
}));

/**
 * DELETE /api/:instanceId/cart/:cartId
 * Delete cart
 */
router.delete('/:instanceId/cart/:cartId', asyncHandler(async (req: Request, res: Response) => {
  const { instanceId: _instanceId, cartId } = req.params;
  const accessToken = (req as any).wixAccessToken;

  const cartService = new CartService(accessToken);
  await cartService.deleteCart(cartId);

  res.json({ success: true, message: 'Cart deleted successfully' });
}));

export default router;
