/**
 * Storefront API Routes
 * 
 * PUBLIC endpoints for buyers (human customers).
 * These endpoints use merchant's API keys server-side.
 * NO authentication required from buyers!
 * 
 * This is how buyers shop - just like any e-commerce site.
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error-handler.js';
import { logger } from '../utils/logger.js';
import { createWixClientFromEnv } from '../wix/client.js';
const router = Router();

/**
 * Check if API Keys are configured
 */
function checkApiKeysConfigured() {
  if (!process.env.WIX_API_KEY || !process.env.WIX_ACCOUNT_ID || !process.env.WIX_SITE_ID) {
    throw new AppError(
      'Storefront not available: WIX_API_KEY, WIX_ACCOUNT_ID, and WIX_SITE_ID must be configured',
      503
    );
  }
}

/**
 * Create services using merchant's API keys
 * Note: Services are designed for OAuth, but we're creating a client with API Keys
 * For now, we'll access the client directly for Wix API calls
 */
function getWixClient() {
  checkApiKeysConfigured();
  return createWixClientFromEnv();
}

// ============================================================================
// Products & Collections (Browse)
// ============================================================================

/**
 * GET /storefront/products
 * Browse all products (PUBLIC - no auth)
 */
router.get('/products', asyncHandler(async (req: Request, res: Response) => {
  const { limit, offset } = req.query;
  
  logger.info('Public product browsing', { 
    limit, 
    offset,
    ip: req.ip 
  });
  
  const client = getWixClient();
  
  // Call Wix Stores API directly
  const response = await client.get<any>('/stores/v1/products/query', {
    'Content-Type': 'application/json',
  });
  
  const products = response.products || [];
  
  res.json({
    success: true,
    data: {
      products,
      total: products.length,
    },
    message: `Found ${products.length} products`,
  });
}));

/**
 * GET /storefront/products/:productId
 * Get single product details (PUBLIC - no auth)
 */
router.get('/products/:productId', asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  
  logger.info('Public product view', { productId, ip: req.ip });
  
  const client = getWixClient();
  const product = await client.get<any>(`/stores/v1/products/${productId}`);
  
  res.json({
    success: true,
    data: product.product || product,
  });
}));

/**
 * GET /storefront/collections
 * Browse all collections (PUBLIC - no auth)
 */
router.get('/collections', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Public collection browsing', { ip: req.ip });
  
  const client = getWixClient();
  const response = await client.get<any>('/stores/v1/collections/query');
  
  const collections = response.collections || [];
  
  res.json({
    success: true,
    data: {
      collections,
      total: collections.length,
    },
    message: `Found ${collections.length} collections`,
  });
}));

/**
 * GET /storefront/collections/:collectionId/products
 * Get products in a collection (PUBLIC - no auth)
 */
router.get('/collections/:collectionId/products', asyncHandler(async (req: Request, res: Response) => {
  const { collectionId } = req.params;
  
  logger.info('Public collection products', { collectionId, ip: req.ip });
  
  const client = getWixClient();
  const response = await client.get<any>(`/stores/v1/collections/${collectionId}/products`);
  
  const products = response.products || [];
  
  res.json({
    success: true,
    data: {
      products,
      total: products.length,
    },
  });
}));

// ============================================================================
// Shopping Cart
// ============================================================================

/**
 * POST /storefront/cart
 * Create a new shopping cart (PUBLIC - no auth)
 */
router.post('/cart', asyncHandler(async (req: Request, res: Response) => {
  const { items, currency, buyerNote } = req.body;
  
  logger.info('Public cart creation', { 
    hasItems: !!items,
    itemCount: items?.length || 0,
    ip: req.ip 
  });
  
  const client = getWixClient();
  
  const payload: any = {};
  if (currency) payload.currency = currency;
  if (buyerNote) payload.buyerNote = buyerNote;
  
  const response = await client.post<any>('/ecom/v1/carts', payload);
  const cart = response.cart || response;
  
  // If items provided, add them
  if (items && Array.isArray(items) && items.length > 0) {
    const addResponse = await client.post<any>(
      `/ecom/v1/carts/${cart.id}/add-to-cart`,
      { lineItems: items }
    );
    const updatedCart = addResponse.cart || addResponse;
    
    res.json({
      success: true,
      data: updatedCart,
      message: 'Cart created with items successfully',
    });
  } else {
    res.json({
      success: true,
      data: cart,
      message: 'Cart created successfully',
    });
  }
}));

/**
 * GET /storefront/cart/:cartId
 * Get cart details (PUBLIC - no auth)
 */
router.get('/cart/:cartId', asyncHandler(async (req: Request, res: Response) => {
  const { cartId } = req.params;
  
  logger.info('Public cart view', { cartId, ip: req.ip });
  
  const client = getWixClient();
  const response = await client.get<any>(`/ecom/v1/carts/${cartId}`);
  const cart = response.cart || response;
  
  res.json({
    success: true,
    data: cart,
  });
}));

/**
 * POST /storefront/cart/:cartId/items
 * Add items to cart (PUBLIC - no auth)
 */
router.post('/cart/:cartId/items', asyncHandler(async (req: Request, res: Response) => {
  const { cartId } = req.params;
  const { items } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Items array is required and cannot be empty', 400);
  }
  
  logger.info('Public cart add items', { cartId, itemCount: items.length, ip: req.ip });
  
  const client = getWixClient();
  const response = await client.post<any>(
    `/ecom/v1/carts/${cartId}/add-to-cart`,
    { lineItems: items }
  );
  
  const cart = response.cart || response;
  const addedItems = response.addedLineItems || [];
  
  res.json({
    success: true,
    data: cart,
    addedItems,
    message: `${addedItems.length} item(s) added to cart`,
  });
}));

// ============================================================================
// Checkout (THE CRITICAL FLOW)
// ============================================================================

/**
 * POST /storefront/checkout/quick
 * ONE-CALL CHECKOUT: Create cart + checkout + get payment URL
 * This is the primary endpoint for buyers to complete purchases
 * (PUBLIC - no auth)
 */
router.post('/checkout/quick', asyncHandler(async (req: Request, res: Response) => {
  const {
    items,
    buyerInfo,
    shippingAddress,
    billingAddress,
    successUrl,
    cancelUrl,
    thankYouPageUrl,
    currency,
  } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Items array is required and cannot be empty', 400);
  }
  
  logger.info('Public quick checkout', {
    itemCount: items.length,
    hasBuyerInfo: !!buyerInfo,
    hasShippingAddress: !!shippingAddress,
    ip: req.ip,
  });
  
  const client = getWixClient();
  
  // Step 1: Create cart with items
  const cartPayload: any = {};
  if (currency) cartPayload.currency = currency;
  
  const cartResponse = await client.post<any>('/ecom/v1/carts', cartPayload);
  const cart = cartResponse.cart || cartResponse;
  logger.info('Cart created for quick checkout', { cartId: cart.id });
  
  // Add items to cart
  const addItemsResponse = await client.post<any>(
    `/ecom/v1/carts/${cart.id}/add-to-cart`,
    { lineItems: items }
  );
  const updatedCart = addItemsResponse.cart || addItemsResponse;
  
  // Step 2: Create checkout from cart
  const checkoutPayload: any = { cartId: cart.id };
  if (buyerInfo) checkoutPayload.buyerInfo = buyerInfo;
  if (shippingAddress) checkoutPayload.shippingInfo = { address: shippingAddress };
  if (billingAddress) checkoutPayload.billingInfo = { address: billingAddress };
  
  const checkoutResponse = await client.post<any>('/ecom/v1/checkouts', checkoutPayload);
  const checkout = checkoutResponse.checkout || checkoutResponse;
  logger.info('Checkout created for quick checkout', { checkoutId: checkout.id });
  
  // Step 3: Generate checkout URL
  const urlPayload: any = {};
  if (successUrl) urlPayload.successUrl = successUrl;
  if (cancelUrl) urlPayload.cancelUrl = cancelUrl;
  if (thankYouPageUrl) urlPayload.thankYouPageUrl = thankYouPageUrl;
  
  const urlResponse = await client.post<any>(
    `/ecom/v1/checkouts/${checkout.id}/createCheckoutUrl`,
    urlPayload
  );
  const checkoutUrl = urlResponse.checkoutUrl || urlResponse;
  logger.info('Quick checkout URL generated', { checkoutUrl });
  
  res.json({
    success: true,
    data: {
      cartId: cart.id,
      checkoutId: checkout.id,
      checkoutUrl,
      priceSummary: checkout.priceSummary || updatedCart.subtotal,
    },
    message: 'Quick checkout created successfully. Redirect buyer to checkoutUrl to complete payment.',
  });
}));

/**
 * POST /storefront/checkout/from-cart
 * Create checkout from existing cart (PUBLIC - no auth)
 */
router.post('/checkout/from-cart', asyncHandler(async (req: Request, res: Response) => {
  const { cartId, buyerInfo, shippingAddress, billingAddress } = req.body;
  
  if (!cartId) {
    throw new AppError('Cart ID is required', 400);
  }
  
  logger.info('Public checkout from cart', { cartId, ip: req.ip });
  
  const client = getWixClient();
  
  const payload: any = { cartId };
  if (buyerInfo) payload.buyerInfo = buyerInfo;
  if (shippingAddress) payload.shippingInfo = { address: shippingAddress };
  if (billingAddress) payload.billingInfo = { address: billingAddress };
  
  const response = await client.post<any>('/ecom/v1/checkouts', payload);
  const checkout = response.checkout || response;
  
  res.json({
    success: true,
    data: checkout,
    message: 'Checkout created from cart',
  });
}));

/**
 * POST /storefront/checkout/:checkoutId/url
 * Generate checkout URL (PUBLIC - no auth)
 */
router.post('/checkout/:checkoutId/url', asyncHandler(async (req: Request, res: Response) => {
  const { checkoutId } = req.params;
  const { successUrl, cancelUrl, thankYouPageUrl } = req.body;
  
  logger.info('Public checkout URL generation', { checkoutId, ip: req.ip });
  
  const client = getWixClient();
  
  const payload: any = {};
  if (successUrl) payload.successUrl = successUrl;
  if (cancelUrl) payload.cancelUrl = cancelUrl;
  if (thankYouPageUrl) payload.thankYouPageUrl = thankYouPageUrl;
  
  const response = await client.post<any>(
    `/ecom/v1/checkouts/${checkoutId}/createCheckoutUrl`,
    payload
  );
  
  const checkoutUrl = response.checkoutUrl || response;
  
  res.json({
    success: true,
    data: { checkoutId, checkoutUrl },
    message: 'Checkout URL generated successfully. Redirect buyer to complete payment.',
  });
}));

/**
 * GET /storefront/checkout/:checkoutId/status
 * Check checkout status (for polling after payment) (PUBLIC - no auth)
 */
router.get('/checkout/:checkoutId/status', asyncHandler(async (req: Request, res: Response) => {
  const { checkoutId } = req.params;
  
  logger.info('Public checkout status check', { checkoutId, ip: req.ip });
  
  const client = getWixClient();
  const response = await client.get<any>(`/ecom/v1/checkouts/${checkoutId}`);
  const checkout = response.checkout || response;
  
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

// ============================================================================
// Orders (Check status after purchase)
// ============================================================================

/**
 * GET /storefront/orders/:orderId
 * Get order details (PUBLIC - no auth, but buyer should have order ID)
 */
router.get('/orders/:orderId', asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  
  logger.info('Public order view', { orderId, ip: req.ip });
  
  const client = getWixClient();
  const response = await client.get<any>(`/stores/v2/orders/${orderId}`);
  const order = response.order || response;
  
  res.json({
    success: true,
    data: order,
  });
}));

// ============================================================================
// Helper Endpoint - Build Catalog Reference
// ============================================================================

/**
 * POST /storefront/helpers/catalog-reference
 * Helper to build proper catalog reference for cart items
 * (PUBLIC - no auth)
 */
router.post('/helpers/catalog-reference', asyncHandler(async (req: Request, res: Response) => {
  const { productId, variantId, customTextFields } = req.body;
  
  if (!productId) {
    throw new AppError('Product ID is required', 400);
  }
  
  const WIX_STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';
  
  const catalogReference = {
    catalogItemId: variantId || productId,
    appId: WIX_STORES_APP_ID,
    options: {
      ...(variantId && { variantId }),
      ...(customTextFields && { customTextFields }),
    },
  };
  
  res.json({
    success: true,
    data: {
      catalogReference,
      usage: {
        description: 'Use this catalog reference when adding items to cart',
        example: {
          items: [
            {
              catalogReference,
              quantity: 1,
            },
          ],
        },
      },
    },
  });
}));

// ============================================================================
// Health Check
// ============================================================================

/**
 * GET /storefront/health
 * Check if storefront is configured and ready
 */
router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  try {
    checkApiKeysConfigured();
    
    res.json({
      success: true,
      status: 'ready',
      message: 'Storefront is configured and ready for buyers',
      authentication: 'API Keys (server-side)',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'not_configured',
      message: error instanceof Error ? error.message : 'Storefront not configured',
      help: 'Please configure WIX_API_KEY, WIX_ACCOUNT_ID, and WIX_SITE_ID in environment variables',
    });
  }
}));

export default router;
