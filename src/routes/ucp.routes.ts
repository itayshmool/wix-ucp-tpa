/**
 * UCP (Universal Commerce Protocol) Routes
 * 
 * These endpoints provide a standardized API for LLM agents and 
 * the Test UI to interact with the Wix store.
 */

import { Router, Request, Response } from 'express';
import { getPocClient, getPocStoreInfo } from '../wix/poc-client.js';
import { 
  wixProductToUCP, 
  wixCartToUCP, 
  ucpCartItemToWix,
  wixOrderToUCP 
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

const router = Router();

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
  const storeInfo = getPocStoreInfo();
  
  const discovery: UCPDiscovery = {
    protocol: 'ucp',
    version: '1.0.0-poc',
    store: {
      id: storeInfo.clientId || 'poc-store',
      name: storeInfo.storeName,
      url: storeInfo.storeUrl,
      currency: storeInfo.currency,
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

    const client = await getPocClient();

    // Build query for Wix API
    const query: any = {
      paging: {
        limit,
        offset,
      },
    };

    // Use search endpoint if search query provided
    let response: any;
    if (search) {
      response = await client.post('/stores/v1/products/query', {
        query: {
          ...query,
          filter: {
            name: { $contains: search }
          }
        },
        includeVariants: true,
      });
    } else {
      response = await client.post('/stores/v1/products/query', {
        query,
        includeVariants: true,
      });
    }

    const products = (response.products || []).map(wixProductToUCP);
    const total = response.totalResults || products.length;

    const result: UCPProductsResponse = {
      products,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + products.length < total,
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

    const client = await getPocClient();
    const response = await client.get(`/stores/v1/products/${id}`);
    
    const product = wixProductToUCP((response as any).product || response);
    res.json(product);
  } catch (error) {
    logger.error('UCP: Failed to get product', { error });
    sendError(res, 404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }
});

/**
 * Create Cart
 * POST /ucp/cart
 * 
 * Body: { items: [{ productId, quantity, variantId? }] }
 */
router.post('/ucp/cart', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as UCPCreateCartRequest;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'Items array is required', 'INVALID_REQUEST');
    }

    logger.info('UCP: Creating cart', { itemCount: items.length });

    const client = await getPocClient();

    // Convert UCP items to Wix lineItems format
    const lineItems = items.map(item => ({
      catalogReference: {
        catalogItemId: item.productId,
        appId: '1380b703-ce81-ff05-f115-39571d94dfcd', // Wix Stores App ID
      },
      quantity: item.quantity,
    }));

    logger.info('UCP: Sending lineItems to Wix', { lineItems: JSON.stringify(lineItems) });

    const response = await client.post('/ecom/v1/carts', {
      lineItems,
    });

    logger.info('UCP: Cart response', { response: JSON.stringify(response) });

    const cart = wixCartToUCP((response as any).cart || response);
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
 * Get Cart
 * GET /ucp/cart/:id
 */
router.get('/ucp/cart/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    logger.info('UCP: Getting cart', { id });

    const client = await getPocClient();
    const response = await client.get(`/ecom/v1/carts/${id}`);
    
    const cart = wixCartToUCP((response as any).cart || response);
    res.json(cart);
  } catch (error) {
    logger.error('UCP: Failed to get cart', { error });
    sendError(res, 404, 'Cart not found', 'CART_NOT_FOUND');
  }
});

/**
 * Add/Update Cart Items
 * PUT /ucp/cart/:id/items
 * 
 * Body: { items: [{ productId, quantity, variantId? }] }
 */
router.put('/ucp/cart/:id/items', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return sendError(res, 400, 'Items array is required', 'INVALID_REQUEST');
    }

    logger.info('UCP: Updating cart items', { cartId: id, itemCount: items.length });

    const client = await getPocClient();

    // Convert UCP items to Wix format
    const lineItems = items.map((item: any) => ucpCartItemToWix(item));

    const response = await client.post(`/ecom/v1/carts/${id}/addToCart`, {
      lineItems,
    });

    const cart = wixCartToUCP((response as any).cart || response);
    res.json(cart);
  } catch (error) {
    logger.error('UCP: Failed to update cart', { error });
    sendError(res, 500, 'Failed to update cart', 'CART_ERROR');
  }
});

/**
 * Remove Cart Item
 * DELETE /ucp/cart/:id/items/:itemId
 */
router.delete('/ucp/cart/:id/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { id, itemId } = req.params;
    
    logger.info('UCP: Removing cart item', { cartId: id, itemId });

    const client = await getPocClient();

    const response = await client.post(`/ecom/v1/carts/${id}/removeLineItems`, {
      lineItemIds: [itemId],
    });

    const cart = wixCartToUCP((response as any).cart || response);
    res.json(cart);
  } catch (error) {
    logger.error('UCP: Failed to remove cart item', { error });
    sendError(res, 500, 'Failed to remove item from cart', 'CART_ERROR');
  }
});

/**
 * Create Checkout
 * POST /ucp/checkout
 * 
 * Body: { cartId, successUrl?, cancelUrl? }
 * 
 * Returns a checkout URL that redirects to Wix Hosted Checkout
 */
router.post('/ucp/checkout', async (req: Request, res: Response) => {
  try {
    const { cartId } = req.body as UCPCreateCheckoutRequest;
    // Note: successUrl and cancelUrl can be used in future for post-checkout redirects

    if (!cartId) {
      return sendError(res, 400, 'cartId is required', 'INVALID_REQUEST');
    }

    logger.info('UCP: Creating checkout', { cartId });

    const client = await getPocClient();

    // Create checkout from cart using the correct endpoint
    const checkoutResponse = await client.post(`/ecom/v1/carts/${cartId}/createCheckout`, {
      channelType: 'WEB',
    });

    const checkout = (checkoutResponse as any).checkout || checkoutResponse;
    const checkoutId = checkout.id || checkout._id;

    logger.info('UCP: Checkout created', { checkoutId });

    // Get redirect URL for hosted checkout
    let checkoutUrl: string;
    try {
      const redirectResponse = await client.post(`/ecom/v1/checkouts/${checkoutId}/getCheckoutUrl`, {});
      checkoutUrl = (redirectResponse as any).checkoutUrl || '';
    } catch (urlError) {
      // Fallback: construct URL manually
      logger.warn('UCP: Could not get checkout URL, using fallback', { urlError });
      checkoutUrl = `https://www.wix.com/checkout/${checkoutId}`;
    }

    const result: UCPCheckout = {
      id: checkoutId,
      cartId,
      checkoutUrl,
      totals: {
        subtotal: {
          amount: parseFloat(checkout.priceSummary?.subtotal?.amount) || 0,
          currency: checkout.currency || 'USD',
          formatted: checkout.priceSummary?.subtotal?.formattedAmount || '$0.00',
        },
        total: {
          amount: parseFloat(checkout.priceSummary?.total?.amount) || 0,
          currency: checkout.currency || 'USD',
          formatted: checkout.priceSummary?.total?.formattedAmount || '$0.00',
        },
        itemCount: checkout.lineItems?.length || 0,
      },
    };

    res.status(201).json(result);
  } catch (error) {
    logger.error('UCP: Failed to create checkout', { error });
    sendError(res, 500, 'Failed to create checkout', 'CHECKOUT_ERROR');
  }
});

/**
 * Get Order
 * GET /ucp/orders/:id
 */
router.get('/ucp/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    logger.info('UCP: Getting order', { id });

    const client = await getPocClient();
    const response = await client.get(`/ecom/v1/orders/${id}`);
    
    const order = wixOrderToUCP((response as any).order || response);
    res.json(order);
  } catch (error) {
    logger.error('UCP: Failed to get order', { error });
    sendError(res, 404, 'Order not found', 'ORDER_NOT_FOUND');
  }
});

export default router;
