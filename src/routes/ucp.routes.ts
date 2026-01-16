/**
 * UCP (Universal Commerce Protocol) Routes
 * 
 * These endpoints provide a standardized API for LLM agents and 
 * the Test UI to interact with the Wix store.
 * 
 * Uses Wix SDK for reliable API operations.
 */

import { Router, Request, Response } from 'express';
import { getWixSdkClient } from '../wix/sdk-client.js';
import { 
  wixProductToUCP, 
  wixCartToUCP,
} from '../services/ucp/ucp.translator.js';
import { 
  UCPDiscovery, 
  UCPProductsResponse,
  UCPCheckout,
  UCPCreateCartRequest,
  UCPCreateCheckoutRequest,
  UCPError
} from '../services/ucp/ucp.types.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

const router = Router();

// Wix Stores App ID (constant for catalogReference)
const WIX_STORES_APP_ID = '1380b703-ce81-ff05-f115-39571d94dfcd';

/**
 * Helper to send UCP error response
 */
function sendError(res: Response, status: number, message: string, code?: string) {
  const error: UCPError = { error: 'UCP Error', message, code };
  res.status(status).json(error);
}

/**
 * UCP Discovery Endpoint
 * GET /.well-known/ucp
 * 
 * Returns information about this UCP-enabled store
 */
router.get('/.well-known/ucp', (_req: Request, res: Response) => {
  const discovery: UCPDiscovery = {
    protocol: 'ucp',
    version: '1.0.0-sdk',
    store: {
      id: config.HEADLESS_CLIENT_ID || 'poc-store',
      name: 'Wix POC Store',
      url: config.BASE_URL || 'https://wix-ucp-tpa.onrender.com',
      currency: 'USD',
      categories: ['general'],
    },
    capabilities: ['browse', 'search', 'cart', 'checkout'],
    endpoints: {
      products: '/ucp/products',
      cart: '/ucp/cart',
      checkout: '/ucp/checkout',
      orders: '/ucp/orders',
    },
  };

  res.json(discovery);
});

/**
 * List Products
 * GET /ucp/products
 * 
 * Query params:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 * - search: string (optional search query)
 */
router.get('/ucp/products', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;

    logger.info('UCP: Listing products', { limit, offset, search });

    const client = getWixSdkClient();

    // Build query using SDK
    let query = client.products.queryProducts().limit(limit).skip(offset);

    // Note: Search filter requires specific SDK method - for now just list all
    // In production, use the search API or filter by name
    const response = await query.find();

    // Filter by name if search is provided (client-side for POC)
    let items = response.items || [];
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter((p: any) => p.name?.toLowerCase().includes(searchLower));
    }

    const products = items.map(wixProductToUCP);
    const total = response.totalCount || products.length;

    const result: UCPProductsResponse = {
      products,
      pagination: {
        total,
        limit,
        offset,
        hasMore: response.hasNext(),
      },
    };

    res.json(result);
  } catch (error: any) {
    logger.error('UCP: Failed to list products', { 
      error: error.message || error,
      details: error.details,
      code: error.code,
    });
    sendError(res, 500, error.message || 'Failed to fetch products', 'PRODUCTS_ERROR');
  }
});

/**
 * Get Single Product
 * GET /ucp/products/:id
 */
router.get('/ucp/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    logger.info('UCP: Getting product', { id });

    const client = getWixSdkClient();
    const response = await client.products.getProduct(id);
    
    // SDK returns product directly (or in .product property)
    const productData = (response as any).product || response;
    const product = wixProductToUCP(productData);
    res.json(product);
  } catch (error: any) {
    logger.error('UCP: Failed to get product', { error: error.message });
    sendError(res, 404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }
});

/**
 * Create Cart (add items to current cart)
 * POST /ucp/cart
 * 
 * Body: { items: [{ productId, quantity, variantId? }] }
 * 
 * Uses currentCart.addToCurrentCart which handles visitor session automatically
 */
router.post('/ucp/cart', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as UCPCreateCartRequest;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'Items array is required', 'INVALID_REQUEST');
    }

    logger.info('UCP: Creating cart', { itemCount: items.length });

    const client = getWixSdkClient();

    // Convert UCP items to Wix SDK lineItems format
    const lineItems = items.map(item => ({
      catalogReference: {
        catalogItemId: item.productId,
        appId: WIX_STORES_APP_ID,
      },
      quantity: item.quantity,
    }));

    logger.debug('UCP: Adding items to current cart', { lineItems });

    // Use currentCart.addToCurrentCart - this handles visitor sessions automatically
    const response = await client.currentCart.addToCurrentCart({
      lineItems,
    });

    // SDK returns cart directly or in .cart property
    const cartData = (response as any).cart || response;

    logger.info('UCP: Cart updated', { 
      cartId: cartData?.id || cartData?._id,
      itemCount: cartData?.lineItems?.length 
    });

    const cart = wixCartToUCP(cartData || {});
    res.status(201).json(cart);
  } catch (error: any) {
    logger.error('UCP: Failed to create cart', { 
      error: error.message || error,
      details: error.details,
    });
    sendError(res, 500, error.message || 'Failed to create cart', 'CART_ERROR');
  }
});

/**
 * Get Current Cart
 * GET /ucp/cart
 */
router.get('/ucp/cart', async (_req: Request, res: Response) => {
  try {
    logger.info('UCP: Getting current cart');

    const client = getWixSdkClient();
    const response = await client.currentCart.getCurrentCart();
    
    // SDK returns cart directly or in .cart property
    const cartData = (response as any).cart || response;
    const cart = wixCartToUCP(cartData || {});
    res.json(cart);
  } catch (error: any) {
    logger.error('UCP: Failed to get cart', { error: error.message });
    // Return empty cart if no cart exists
    res.json({
      id: null,
      items: [],
      totals: {
        subtotal: { amount: 0, currency: 'USD', formatted: '$0.00' },
        total: { amount: 0, currency: 'USD', formatted: '$0.00' },
        itemCount: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
});

/**
 * Get Cart by ID (legacy support)
 * GET /ucp/cart/:id
 */
router.get('/ucp/cart/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    logger.info('UCP: Getting cart by ID', { id });

    const client = getWixSdkClient();
    const response = await client.cart.getCart(id);
    
    // SDK returns cart directly or in .cart property
    const cartData = (response as any).cart || response;
    const cart = wixCartToUCP(cartData || {});
    res.json(cart);
  } catch (error: any) {
    logger.error('UCP: Failed to get cart', { error: error.message });
    sendError(res, 404, 'Cart not found', 'CART_NOT_FOUND');
  }
});

/**
 * Add Items to Current Cart
 * POST /ucp/cart/items
 * 
 * Body: { items: [{ productId, quantity, variantId? }] }
 */
router.post('/ucp/cart/items', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'Items array is required', 'INVALID_REQUEST');
    }

    logger.info('UCP: Adding items to cart', { itemCount: items.length });

    const client = getWixSdkClient();

    const lineItems = items.map((item: any) => ({
      catalogReference: {
        catalogItemId: item.productId,
        appId: WIX_STORES_APP_ID,
      },
      quantity: item.quantity,
    }));

    const response = await client.currentCart.addToCurrentCart({
      lineItems,
    });

    const cartData = (response as any).cart || response;
    const cart = wixCartToUCP(cartData || {});
    res.json(cart);
  } catch (error: any) {
    logger.error('UCP: Failed to add items to cart', { error: error.message });
    sendError(res, 500, 'Failed to update cart', 'CART_ERROR');
  }
});

/**
 * Update Cart Item Quantity
 * PUT /ucp/cart/items/:itemId
 * 
 * Body: { quantity: number }
 */
router.put('/ucp/cart/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 0) {
      return sendError(res, 400, 'Valid quantity is required', 'INVALID_REQUEST');
    }

    logger.info('UCP: Updating cart item quantity', { itemId, quantity });

    const client = getWixSdkClient();

    // SDK uses _id for line item updates
    const response = await client.currentCart.updateCurrentCartLineItemQuantity([{
      _id: itemId,
      quantity,
    }]);

    const cartData = (response as any).cart || response;
    const cart = wixCartToUCP(cartData || {});
    res.json(cart);
  } catch (error: any) {
    logger.error('UCP: Failed to update cart item', { error: error.message });
    sendError(res, 500, 'Failed to update item', 'CART_ERROR');
  }
});

/**
 * Remove Cart Item
 * DELETE /ucp/cart/items/:itemId
 */
router.delete('/ucp/cart/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    
    logger.info('UCP: Removing cart item', { itemId });

    const client = getWixSdkClient();

    const response = await client.currentCart.removeLineItemsFromCurrentCart([itemId]);

    const cartData = (response as any).cart || response;
    const cart = wixCartToUCP(cartData || {});
    res.json(cart);
  } catch (error: any) {
    logger.error('UCP: Failed to remove cart item', { error: error.message });
    sendError(res, 500, 'Failed to remove item from cart', 'CART_ERROR');
  }
});

/**
 * Create Checkout
 * POST /ucp/checkout
 * 
 * Body: { cartId?, successUrl?, cancelUrl? }
 * 
 * Creates a checkout and returns the hosted checkout URL.
 * If no cartId is provided, uses the current cart.
 */
router.post('/ucp/checkout', async (req: Request, res: Response) => {
  try {
    const { cartId, successUrl: _successUrl } = req.body as UCPCreateCheckoutRequest;

    logger.info('UCP: Creating checkout', { cartId });

    const client = getWixSdkClient();

    // Get cart to create checkout from
    let cartData: any;
    if (cartId) {
      const cartResponse = await client.cart.getCart(cartId);
      cartData = (cartResponse as any).cart || cartResponse;
    } else {
      const cartResponse = await client.currentCart.getCurrentCart();
      cartData = (cartResponse as any).cart || cartResponse;
    }

    if (!cartData || !cartData.lineItems || cartData.lineItems.length === 0) {
      return sendError(res, 400, 'Cart is empty', 'EMPTY_CART');
    }

    // Create checkout
    const checkoutResponse = await client.checkout.createCheckout({
      lineItems: cartData.lineItems.map((item: any) => ({
        catalogReference: item.catalogReference,
        quantity: item.quantity,
      })),
      channelType: 'WEB',
    });

    // SDK returns checkout directly or in .checkout property
    const checkoutData = (checkoutResponse as any).checkout || checkoutResponse;
    const checkoutId = checkoutData?._id || checkoutData?.id;
    
    logger.info('UCP: Checkout created', { checkoutId });

    if (!checkoutId) {
      throw new Error('Checkout creation failed - no checkout ID returned');
    }

    // Get checkout URL using the redirect URLs API
    let checkoutUrl = '';
    try {
      // Try to get checkout URL - method takes checkoutId as string
      const redirectResponse = await client.checkout.getCheckoutUrl(checkoutId);
      checkoutUrl = (redirectResponse as any).checkoutUrl || redirectResponse || '';
    } catch (urlError: any) {
      logger.warn('UCP: Could not get checkout URL', { error: urlError.message });
      // Fallback URL construction
      checkoutUrl = `https://www.wix.com/checkout/${checkoutId}`;
    }

    const result: UCPCheckout = {
      id: checkoutId,
      cartId: cartData?.id || cartData?._id || cartId,
      checkoutUrl,
      totals: {
        subtotal: {
          amount: parseFloat(checkoutData?.priceSummary?.subtotal?.amount || '0'),
          currency: checkoutData?.currency || 'USD',
          formatted: checkoutData?.priceSummary?.subtotal?.formattedAmount || '$0.00',
        },
        total: {
          amount: parseFloat(checkoutData?.priceSummary?.total?.amount || '0'),
          currency: checkoutData?.currency || 'USD',
          formatted: checkoutData?.priceSummary?.total?.formattedAmount || '$0.00',
        },
        itemCount: checkoutData?.lineItems?.length || 0,
      },
    };

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('UCP: Failed to create checkout', { error: error.message, details: error.details });
    sendError(res, 500, error.message || 'Failed to create checkout', 'CHECKOUT_ERROR');
  }
});

/**
 * Get Order
 * GET /ucp/orders/:id
 */
router.get('/ucp/orders/:id', async (_req: Request, res: Response) => {
  // Note: Orders API requires elevated permissions
  // For POC, we'll return a placeholder
  sendError(res, 501, 'Order retrieval not implemented in POC', 'NOT_IMPLEMENTED');
});

export default router;
