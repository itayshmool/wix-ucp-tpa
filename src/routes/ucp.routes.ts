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
  wixOrderToUCP,
} from '../services/ucp/ucp.translator.js';
import { 
  UCPDiscovery, 
  UCPProductsResponse,
  UCPOrdersListResponse,
  UCPCheckout,
  UCPError
} from '../services/ucp/ucp.types.js';
import {
  UCPCreateCartRequestSchema,
  UCPCreateCheckoutRequestSchema,
  UCPUpdateCartItemSchema,
} from '../services/ucp/ucp.schemas.js';
import { validateBody } from '../middleware/validate.js';
import {
  registerWebhook,
  unregisterWebhook,
  getWebhookSubscriptions,
  getWebhookSubscription,
  createFulfillmentEvent,
  dispatchFulfillmentEvent,
  getFulfillmentEvents,
  mapWixFulfillmentStatusToUCP,
  getEventTypeForStatus,
} from '../services/fulfillment/fulfillment.service.js';
import { FulfillmentEventType } from '../services/fulfillment/fulfillment.types.js';
import {
  applyCouponToCheckout,
  removeCouponFromCheckout,
  getCheckoutDiscounts,
} from '../services/discount/discount.service.js';
import {
  getPaymentHandlers,
  getPaymentHandler,
  mintInstrument,
  getInstrument,
  validateInstrument,
  cancelInstrument,
} from '../services/payment/payment.service.js';
import { MintInstrumentRequestSchema } from '../services/payment/payment.types.js';
import {
  completeCheckout,
  setCheckoutState,
} from '../services/checkout/complete-checkout.service.js';
import { CompleteCheckoutRequestSchema } from '../services/checkout/complete-checkout.types.js';
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
 * Follows official UCP specification from ucp.dev
 */
router.get('/.well-known/ucp', (_req: Request, res: Response) => {
  const baseUrl = config.BASE_URL || 'https://wix-ucp-tpa.onrender.com';
  
  const discovery: UCPDiscovery = {
    protocol: 'ucp',
    version: '1.0',
    merchant: {
      id: '5713796246',  // Google Merchant Center ID
      name: 'Pop Stop Drink',
      domain: 'popstopdrink.com',
      description: 'Premium beverages and drinks',
      logo: 'https://static.wixstatic.com/media/11062b_723b720fab234a8f984ea3956739a9ab~mv2.jpg',
      currency: 'USD',
      verified: true,
    },
    capabilities: ['catalog_search', 'product_details', 'cart_management', 'checkout', 'orders', 'fulfillment', 'discounts', 'payment_handlers', 'server_checkout', 'identity_linking'],
    endpoints: {
      catalog: `${baseUrl}/ucp/products`,
      product: `${baseUrl}/ucp/products/{id}`,
      cart: `${baseUrl}/ucp/cart`,
      checkout: `${baseUrl}/ucp/checkout`,
      orders: `${baseUrl}/ucp/orders/{id}`,
    },
    // Protocol Bindings (Phase 13)
    bindings: {
      mcp: {
        tools: `${baseUrl}/mcp/tools`,
        call: `${baseUrl}/mcp/call`,
        openapi: `${baseUrl}/mcp/openapi`,
      },
      a2a: {
        agent: `${baseUrl}/a2a/agent`,
        agents: `${baseUrl}/a2a/agents`,
        handoff: `${baseUrl}/a2a/handoff`,
        resolve: `${baseUrl}/a2a/resolve`,
      },
      identity: {
        link: `${baseUrl}/ucp/identity/link`,
        lookup: `${baseUrl}/ucp/identity/{primaryId}`,
        consent: `${baseUrl}/ucp/consent`,
        gdprExport: `${baseUrl}/ucp/gdpr/export/{subjectId}`,
        gdprDelete: `${baseUrl}/ucp/gdpr/delete`,
      },
    },
    payment_handlers: [
      'com.wix.checkout.v1',  // Wix Hosted Checkout
    ],
    trust_signals: {
      ssl: true,
      return_policy_url: 'https://www.popstopdrink.com/return-policy',
      shipping_policy_url: 'https://www.popstopdrink.com/shipping-policy',
      privacy_policy_url: 'https://www.popstopdrink.com/privacy-policy',
    },
    // POC: US only for simplicity
    supported_countries: ['US'],
    shipping: {
      countries: ['US'],
      free_shipping_threshold: 0,  // Free shipping on all orders
      default_rate: '0 USD',
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
 * Google Merchant Center Feed (TSV format)
 * GET /ucp/feed/google-merchant.tsv
 * 
 * Returns products in TSV format that Google Merchant Center can fetch automatically.
 * Set this URL as your feed source in Merchant Center for auto-sync.
 * 
 * Includes: shipping info, clean image URLs
 */
router.get('/ucp/feed/google-merchant.tsv', async (_req: Request, res: Response) => {
  try {
    logger.info('UCP: Google Merchant feed request');

    const client = getWixSdkClient();
    const response = await client.products.queryProducts().limit(100).find();

    // TSV Header - includes shipping columns
    const headers = [
      'id', 
      'title', 
      'description', 
      'link', 
      'image_link', 
      'price', 
      'availability', 
      'condition', 
      'brand',
      'shipping(country:price:service)',  // Shipping info
    ];
    const rows: string[] = [headers.join('\t')];

    // Transform products to TSV rows
    for (const product of response.items || []) {
      // Parse price from formatted string if needed
      const priceAmount = product.priceData?.price || 
        parseFloat((product.priceData?.formatted?.price || '$0').replace(/[^0-9.]/g, ''));
      
      // Clean up image URL - ensure it ends with a valid extension
      let imageUrl = product.media?.mainMedia?.image?.url || '';
      // Wix URLs with /v1/fit/ need to be simplified - just use the base URL
      if (imageUrl.includes('wixstatic.com')) {
        // Extract base URL up to the file extension
        const match = imageUrl.match(/(https:\/\/static\.wixstatic\.com\/media\/[^/]+\.(jpg|jpeg|png|gif|webp))/i);
        if (match) {
          imageUrl = match[1];
        }
      }
      
      const row = [
        product._id,                                                           // id
        (product.name || '').replace(/\t|\n/g, ' '),                          // title
        ((product.description || product.name || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\t|\n/g, ' ')).substring(0, 500), // description
        `https://www.popstopdrink.com/product-page/${product.slug || product._id}`, // link
        imageUrl,                                                              // image_link (cleaned)
        `${priceAmount.toFixed(2)} USD`,                                       // price
        product.stock?.inStock !== false ? 'in_stock' : 'out_of_stock',       // availability
        'new',                                                                 // condition
        'Pop Stop Drink',                                                      // brand
        'US:0 USD:Standard',                                                   // shipping (free shipping to US)
      ];
      rows.push(row.join('\t'));
    }

    // Return as TSV file
    res.setHeader('Content-Type', 'text/tab-separated-values');
    res.setHeader('Content-Disposition', 'attachment; filename="google-merchant-feed.tsv"');
    res.send(rows.join('\n'));

  } catch (error: any) {
    logger.error('UCP: Google Merchant feed failed', { error: error.message });
    res.status(500).send('Error generating feed');
  }
});

/**
 * Gemini-Compatible Products Endpoint
 * GET /ucp/gemini/products
 * 
 * Returns products in the exact format Gemini expects
 */
router.get('/ucp/gemini/products', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    logger.info('UCP: Gemini products request', { limit });

    const client = getWixSdkClient();
    const response = await client.products.queryProducts().limit(limit).find();

    // Transform to Gemini's expected format
    const items = (response.items || []).map((wixProduct: any) => {
      // Parse price from formatted string if needed
      const priceAmount = wixProduct.priceData?.price || 
        parseFloat(wixProduct.priceData?.formatted?.price?.replace(/[^0-9.]/g, '') || '0');

      return {
        id: wixProduct._id || wixProduct.id,
        title: wixProduct.name,
        description: (wixProduct.description || wixProduct.name || '')
          .replace(/<[^>]*>/g, '')  // Strip HTML
          .replace(/&amp;/g, '&'),
        price: {
          value: priceAmount,
          currency: wixProduct.priceData?.currency || 'USD',
        },
        images: wixProduct.media?.items?.map((m: any) => m.image?.url).filter(Boolean) || 
          (wixProduct.media?.mainMedia?.image?.url ? [wixProduct.media.mainMedia.image.url] : []),
        status: wixProduct.stock?.inStock !== false ? 'IN_STOCK' : 'OUT_OF_STOCK',
        action_link: `https://www.popstopdrink.com/product-page/${wixProduct.slug || wixProduct._id}`,
      };
    });

    res.json({
      items,
      pagination: {
        total: response.totalCount || items.length,
        limit,
      },
    });
  } catch (error: any) {
    logger.error('UCP: Gemini products failed', { error: error.message });
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
router.post('/ucp/cart', validateBody(UCPCreateCartRequestSchema), async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    logger.info('UCP: Creating cart', { itemCount: items.length });

    const client = getWixSdkClient();

    // Convert UCP items to Wix SDK lineItems format
    const lineItems = items.map((item: { productId: string; quantity: number }) => ({
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
router.post('/ucp/cart/items', validateBody(UCPCreateCartRequestSchema), async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

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
router.put('/ucp/cart/items/:itemId', validateBody(UCPUpdateCartItemSchema), async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

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
 * Clear/Delete Current Cart
 * DELETE /ucp/cart
 * 
 * Clears all items from the current cart.
 * IMPORTANT: Call this BEFORE creating a new checkout to ensure fresh checkout URL.
 * This prevents getting stale thank-you-page URLs from previous completed orders.
 */
router.delete('/ucp/cart', async (_req: Request, res: Response) => {
  try {
    logger.info('UCP: Clearing current cart');

    const client = getWixSdkClient();
    
    // Delete the current cart entirely
    await client.currentCart.deleteCurrentCart();
    
    logger.info('UCP: Cart cleared successfully');
    
    res.json({ 
      success: true, 
      message: 'Cart cleared. Ready for new items.',
      cart: {
        id: null,
        items: [],
        totals: {
          subtotal: { amount: 0, currency: 'USD', formatted: '$0.00' },
          total: { amount: 0, currency: 'USD', formatted: '$0.00' },
          itemCount: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    });
  } catch (error: any) {
    // If no cart exists, that's fine - cart is already empty
    if (error.message?.includes('not found') || error.code === 'CART_NOT_FOUND' || error.message?.includes('Cart not found')) {
      logger.info('UCP: Cart already empty or not found');
      return res.json({ 
        success: true, 
        message: 'Cart already empty',
        cart: {
          id: null,
          items: [],
          totals: {
            subtotal: { amount: 0, currency: 'USD', formatted: '$0.00' },
            total: { amount: 0, currency: 'USD', formatted: '$0.00' },
            itemCount: 0,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      });
    }
    
    logger.error('UCP: Failed to clear cart', { error: error.message });
    return sendError(res, 500, error.message || 'Failed to clear cart', 'CART_ERROR');
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
 * 
 * Cart is cleared AFTER successful checkout creation to prevent reuse.
 * Validates checkout URL to reject stale thank-you-page URLs.
 */
router.post('/ucp/checkout', validateBody(UCPCreateCheckoutRequestSchema), async (req: Request, res: Response) => {
  try {
    const { cartId, successUrl: _successUrl } = req.body;

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
      return sendError(res, 400, 'Cart is empty. Add items first with POST /ucp/cart', 'EMPTY_CART');
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

    // CRITICAL: Validate the checkout URL is NOT a thank-you page
    // Thank-you pages indicate a previously completed order - URL is stale!
    if (checkoutUrl.includes('/thank-you-page/')) {
      logger.error('UCP: Got stale thank-you-page URL instead of checkout', { 
        staleUrl: checkoutUrl,
        checkoutId,
      });
      
      // Clear the cart to prevent this happening again
      try {
        await client.currentCart.deleteCurrentCart();
      } catch (e) {
        // Ignore errors
      }
      
      return sendError(res, 409, 
        'Previous checkout was already completed. Cart has been cleared. Please add items and try again.', 
        'CHECKOUT_ALREADY_COMPLETED'
      );
    }

    // Validate checkout URL format
    if (!checkoutUrl.includes('/checkout')) {
      logger.warn('UCP: Unexpected checkout URL format', { checkoutUrl, checkoutId });
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

    // Clear cart after successful checkout creation to prevent reuse
    try {
      await client.currentCart.deleteCurrentCart();
      logger.debug('UCP: Cart cleared after checkout creation');
    } catch (e) {
      // Non-critical - ignore
    }

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('UCP: Failed to create checkout', { error: error.message, details: error.details });
    sendError(res, 500, error.message || 'Failed to create checkout', 'CHECKOUT_ERROR');
  }
});

/**
 * Get Checkout Status
 * GET /ucp/checkout/:checkoutId/status
 * 
 * Polls checkout status to determine if order was completed.
 * Use this after giving user a checkout URL to track order completion.
 */
router.get('/ucp/checkout/:checkoutId/status', async (req: Request, res: Response) => {
  const { checkoutId } = req.params;
  const client = getWixSdkClient();
  
  try {
    logger.info('UCP: Checking checkout status', { checkoutId });
    
    // Get checkout details
    const checkoutResponse = await client.checkout.getCheckout(checkoutId);
    const checkoutData = (checkoutResponse as any).checkout || checkoutResponse;
    
    // Wix checkout uses a boolean 'completed' field directly
    logger.info('UCP: Checkout data from Wix', { 
      checkoutId,
      completed: checkoutData?.completed,
      _id: checkoutData?._id,
    });
    
    // Wix uses 'completed' as a boolean field
    const isCompleted = checkoutData?.completed === true;
    const orderId = checkoutData?.orderId || null;
    const orderNumber = null; // Would need Orders API with elevated permissions
    
    const status = isCompleted ? 'COMPLETED' : 'PENDING';
    
    const result = {
      checkoutId,
      status,
      completed: isCompleted,
      orderId,
      orderNumber,
      totals: {
        total: {
          amount: parseFloat(checkoutData?.priceSummary?.total?.amount || '0'),
          currency: checkoutData?.currency || 'USD',
          formatted: checkoutData?.priceSummary?.total?.formattedAmount || '$0.00',
        },
        itemCount: checkoutData?.lineItems?.length || 0,
      },
      createdAt: checkoutData?.createdDate || null,
      completedAt: checkoutData?.completedDate || null,
      message: isCompleted 
        ? `✅ Order completed! ${orderNumber ? `Order #${orderNumber}` : orderId ? `Order ID: ${orderId}` : 'Check your email for details.'}`
        : '⏳ Payment not yet completed. User should complete checkout at the payment link.',
    };

    res.json(result);
  } catch (error: any) {
    logger.error('UCP: Failed to get checkout status', { 
      checkoutId: req.params.checkoutId, 
      error: error.message 
    });
    
    // Checkout may have expired or been completed and cleaned up
    // When Wix completes a checkout, it often deletes/archives the checkout object
    // So "not found" usually means "completed"
    if (error.message?.includes('not found') || error.code === 'NOT_FOUND') {
      logger.info('UCP: Checkout not found - assuming completed', { checkoutId });
      
      return res.json({
        checkoutId,
        status: 'COMPLETED',
        completed: true,
        orderId: null,
        orderNumber: null,
        message: '✅ Payment completed! Check your email for order confirmation and number.',
      });
    }
    
    return sendError(res, 404, 'Checkout not found or expired', 'CHECKOUT_NOT_FOUND');
  }
});

/**
 * List Orders
 * GET /ucp/orders
 * 
 * Query params:
 * - limit: number (default 20, max 50)
 * - offset: number (default 0)
 * - email: string (filter by customer email)
 * 
 * Note: Orders API typically requires elevated permissions.
 * Returns orders for the current visitor/session if authenticated.
 */
router.get('/ucp/orders', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;
    const email = req.query.email as string;

    logger.info('UCP: Listing orders', { limit, offset, email });

    const client = getWixSdkClient();
    
    // Use the SDK's orders.searchOrders method
    const query: any = {
      search: email ? { filter: JSON.stringify({ 'buyerInfo.email': email }) } : undefined,
      paging: { limit, offset },
    };

    const response = await client.orders.searchOrders(query);
    const ordersData = (response as any).orders || [];
    
    const orders = ordersData.map(wixOrderToUCP);
    const total = (response as any).metadata?.count || orders.length;

    const result: UCPOrdersListResponse = {
      orders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: orders.length === limit,
      },
    };

    res.json(result);
  } catch (error: any) {
    logger.error('UCP: Failed to list orders', { 
      error: error.message || error,
      details: error.details,
    });
    // If orders API is not accessible (permission denied), return helpful message
    if (error.message?.includes('permission') || error.message?.includes('auth')) {
      return sendError(res, 403, 'Orders access requires elevated permissions', 'PERMISSION_DENIED');
    }
    sendError(res, 500, error.message || 'Failed to fetch orders', 'ORDERS_ERROR');
  }
});

/**
 * Get Order by ID
 * GET /ucp/orders/:id
 */
router.get('/ucp/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    logger.info('UCP: Getting order', { id });

    const client = getWixSdkClient();
    const response = await client.orders.getOrder(id);
    
    // SDK returns order directly or in .order property
    const orderData = (response as any).order || response;
    const order = wixOrderToUCP(orderData);
    
    res.json(order);
  } catch (error: any) {
    logger.error('UCP: Failed to get order', { 
      id: req.params.id,
      error: error.message,
    });
    
    if (error.message?.includes('not found') || error.code === 'NOT_FOUND') {
      return sendError(res, 404, 'Order not found', 'ORDER_NOT_FOUND');
    }
    if (error.message?.includes('permission') || error.message?.includes('auth')) {
      return sendError(res, 403, 'Orders access requires elevated permissions', 'PERMISSION_DENIED');
    }
    sendError(res, 500, error.message || 'Failed to get order', 'ORDERS_ERROR');
  }
});

/**
 * Get Order Fulfillments (tracking info)
 * GET /ucp/orders/:id/fulfillments
 */
router.get('/ucp/orders/:id/fulfillments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    logger.info('UCP: Getting order fulfillments', { id });

    const client = getWixSdkClient();
    const response = await client.orders.getOrder(id);
    const orderData = (response as any).order || response;
    const order = wixOrderToUCP(orderData);
    
    res.json({
      orderId: id,
      fulfillmentStatus: order.fulfillmentStatus,
      fulfillments: order.fulfillments || [],
    });
  } catch (error: any) {
    logger.error('UCP: Failed to get order fulfillments', { 
      id: req.params.id,
      error: error.message,
    });
    
    if (error.message?.includes('not found')) {
      return sendError(res, 404, 'Order not found', 'ORDER_NOT_FOUND');
    }
    sendError(res, 500, error.message || 'Failed to get fulfillments', 'ORDERS_ERROR');
  }
});

// ============================================================================
// UCP Fulfillment Extension - Webhook Endpoints
// ============================================================================

/**
 * Register a webhook subscription
 * POST /ucp/webhooks
 * 
 * Body: { url, events, secret? }
 */
router.post('/ucp/webhooks', async (req: Request, res: Response) => {
  try {
    const { url, events, secret } = req.body;

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return sendError(res, 400, 'url and events array are required', 'INVALID_REQUEST');
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return sendError(res, 400, 'Invalid webhook URL', 'INVALID_URL');
    }

    // Validate events
    const validEvents: FulfillmentEventType[] = [
      'fulfillment.created',
      'fulfillment.updated',
      'fulfillment.shipped',
      'fulfillment.delivered',
      'fulfillment.cancelled',
    ];
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e as FulfillmentEventType));
    if (invalidEvents.length > 0) {
      return sendError(res, 400, `Invalid events: ${invalidEvents.join(', ')}`, 'INVALID_EVENTS');
    }

    const subscription = registerWebhook(url, events as FulfillmentEventType[], secret);

    logger.info('UCP: Webhook registered', { subscriptionId: subscription.id });

    res.status(201).json(subscription);
  } catch (error: any) {
    logger.error('UCP: Failed to register webhook', { error: error.message });
    sendError(res, 500, error.message || 'Failed to register webhook', 'WEBHOOK_ERROR');
  }
});

/**
 * List webhook subscriptions
 * GET /ucp/webhooks
 */
router.get('/ucp/webhooks', (_req: Request, res: Response) => {
  const subscriptions = getWebhookSubscriptions();
  res.json({ subscriptions });
});

/**
 * Get a specific webhook subscription
 * GET /ucp/webhooks/:id
 */
router.get('/ucp/webhooks/:id', (req: Request, res: Response) => {
  const subscription = getWebhookSubscription(req.params.id);
  
  if (!subscription) {
    return sendError(res, 404, 'Webhook subscription not found', 'WEBHOOK_NOT_FOUND');
  }
  
  res.json(subscription);
});

/**
 * Delete a webhook subscription
 * DELETE /ucp/webhooks/:id
 */
router.delete('/ucp/webhooks/:id', (req: Request, res: Response) => {
  const deleted = unregisterWebhook(req.params.id);
  
  if (!deleted) {
    return sendError(res, 404, 'Webhook subscription not found', 'WEBHOOK_NOT_FOUND');
  }
  
  res.json({ success: true, message: 'Webhook subscription deleted' });
});

/**
 * Get fulfillment events for an order
 * GET /ucp/orders/:id/events
 */
router.get('/ucp/orders/:id/events', (req: Request, res: Response) => {
  const events = getFulfillmentEvents(req.params.id);
  res.json({ orderId: req.params.id, events });
});

/**
 * Simulate a fulfillment event (for testing)
 * POST /ucp/test/fulfillment
 * 
 * Body: { orderId, fulfillmentId, status, lineItems, tracking? }
 */
router.post('/ucp/test/fulfillment', async (req: Request, res: Response) => {
  try {
    const { orderId, fulfillmentId, status, lineItems, tracking } = req.body;

    if (!orderId || !fulfillmentId || !status || !lineItems) {
      return sendError(res, 400, 'orderId, fulfillmentId, status, and lineItems are required', 'INVALID_REQUEST');
    }

    const fulfillmentStatus = mapWixFulfillmentStatusToUCP(status);
    const eventType = getEventTypeForStatus(fulfillmentStatus);

    const event = createFulfillmentEvent(
      eventType,
      orderId,
      fulfillmentId,
      fulfillmentStatus,
      lineItems,
      tracking
    );

    // Dispatch to all subscribed webhooks
    const deliveries = await dispatchFulfillmentEvent(event);

    logger.info('UCP: Fulfillment event simulated', {
      eventId: event.id,
      type: eventType,
      deliveryCount: deliveries.length,
    });

    res.status(201).json({
      event,
      deliveries: deliveries.map(d => ({
        id: d.id,
        subscriptionId: d.subscriptionId,
        status: d.status,
        error: d.error,
      })),
    });
  } catch (error: any) {
    logger.error('UCP: Failed to simulate fulfillment event', { error: error.message });
    sendError(res, 500, error.message || 'Failed to simulate event', 'FULFILLMENT_ERROR');
  }
});

// ============================================================================
// UCP Discounts Extension
// ============================================================================

/**
 * Apply a coupon code to checkout
 * POST /ucp/checkout/:checkoutId/coupons
 * 
 * Body: { code: string }
 */
router.post('/ucp/checkout/:checkoutId/coupons', async (req: Request, res: Response) => {
  try {
    const { checkoutId } = req.params;
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return sendError(res, 400, 'Coupon code is required', 'INVALID_REQUEST');
    }

    logger.info('UCP: Applying coupon', { checkoutId, code });

    const result = await applyCouponToCheckout(code.trim(), checkoutId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    logger.error('UCP: Failed to apply coupon', { 
      checkoutId: req.params.checkoutId,
      error: error.message,
    });
    sendError(res, 500, error.message || 'Failed to apply coupon', 'DISCOUNT_ERROR');
  }
});

/**
 * Remove coupon from checkout
 * DELETE /ucp/checkout/:checkoutId/coupons
 */
router.delete('/ucp/checkout/:checkoutId/coupons', async (req: Request, res: Response): Promise<void> => {
  try {
    const { checkoutId } = req.params;

    logger.info('UCP: Removing coupon', { checkoutId });

    const result = await removeCouponFromCheckout(checkoutId);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    logger.error('UCP: Failed to remove coupon', { 
      checkoutId: req.params.checkoutId,
      error: error.message,
    });
    sendError(res, 500, error.message || 'Failed to remove coupon', 'DISCOUNT_ERROR');
  }
});

/**
 * Get applied discounts for checkout
 * GET /ucp/checkout/:checkoutId/discounts
 */
router.get('/ucp/checkout/:checkoutId/discounts', async (req: Request, res: Response) => {
  try {
    const { checkoutId } = req.params;

    logger.info('UCP: Getting checkout discounts', { checkoutId });

    const discounts = await getCheckoutDiscounts(checkoutId);

    res.json({ checkoutId, discounts });
  } catch (error: any) {
    logger.error('UCP: Failed to get discounts', { 
      checkoutId: req.params.checkoutId,
      error: error.message,
    });
    
    if (error.message?.includes('not found')) {
      return sendError(res, 404, 'Checkout not found', 'CHECKOUT_NOT_FOUND');
    }
    sendError(res, 500, error.message || 'Failed to get discounts', 'DISCOUNT_ERROR');
  }
});

// ============================================================================
// UCP Payment Handlers Extension
// ============================================================================

/**
 * List available payment handlers
 * GET /ucp/payment-handlers
 * 
 * Query params:
 * - enabledOnly: boolean (default true)
 */
router.get('/ucp/payment-handlers', (req: Request, res: Response) => {
  const enabledOnly = req.query.enabledOnly !== 'false';
  
  logger.info('UCP: Listing payment handlers', { enabledOnly });
  
  const result = getPaymentHandlers(enabledOnly);
  res.json(result);
});

/**
 * Get a specific payment handler
 * GET /ucp/payment-handlers/:handlerId
 */
router.get('/ucp/payment-handlers/:handlerId', (req: Request, res: Response) => {
  const { handlerId } = req.params;
  
  logger.info('UCP: Getting payment handler', { handlerId });
  
  const handler = getPaymentHandler(handlerId as any);
  
  if (!handler) {
    return sendError(res, 404, `Payment handler '${handlerId}' not found`, 'HANDLER_NOT_FOUND');
  }
  
  res.json(handler);
});

/**
 * Mint a payment instrument (tokenize payment credentials)
 * POST /ucp/checkout/:checkoutId/mint
 * 
 * Body: {
 *   handlerId: string,
 *   amount: number,
 *   currency: string,
 *   billingAddress?: object,
 *   paymentData?: object,
 *   idempotencyKey?: string
 * }
 * 
 * This endpoint tokenizes payment credentials and returns a short-lived
 * instrument that can be used to complete the checkout.
 */
router.post('/ucp/checkout/:checkoutId/mint', async (req: Request, res: Response): Promise<void> => {
  try {
    const { checkoutId } = req.params;
    
    // Validate request body
    const parseResult = MintInstrumentRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid mint instrument request',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    logger.info('UCP: Minting payment instrument', {
      checkoutId,
      handlerId: parseResult.data.handlerId,
      amount: parseResult.data.amount,
      currency: parseResult.data.currency,
    });

    const result = await mintInstrument(checkoutId, parseResult.data);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('UCP: Failed to mint instrument', {
      checkoutId: req.params.checkoutId,
      error: error.message,
    });
    sendError(res, 500, error.message || 'Failed to mint instrument', 'MINT_ERROR');
  }
});

/**
 * Get a minted instrument
 * GET /ucp/instruments/:instrumentId
 */
router.get('/ucp/instruments/:instrumentId', (req: Request, res: Response) => {
  const { instrumentId } = req.params;
  
  logger.info('UCP: Getting instrument', { instrumentId });
  
  const instrument = getInstrument(instrumentId);
  
  if (!instrument) {
    return sendError(res, 404, 'Instrument not found', 'INSTRUMENT_NOT_FOUND');
  }
  
  res.json(instrument);
});

/**
 * Validate an instrument for checkout
 * POST /ucp/instruments/:instrumentId/validate
 * 
 * Body: { checkoutId, amount, currency }
 */
router.post('/ucp/instruments/:instrumentId/validate', (req: Request, res: Response) => {
  const { instrumentId } = req.params;
  const { checkoutId, amount, currency } = req.body;
  
  if (!checkoutId || !amount || !currency) {
    return sendError(res, 400, 'checkoutId, amount, and currency are required', 'INVALID_REQUEST');
  }
  
  logger.info('UCP: Validating instrument', { instrumentId, checkoutId });
  
  const result = validateInstrument(instrumentId, checkoutId, amount, currency);
  
  if (!result.valid) {
    return res.status(400).json({
      valid: false,
      error: result.error,
      errorCode: result.errorCode,
    });
  }
  
  res.json({ valid: true, instrumentId });
});

/**
 * Cancel an instrument
 * DELETE /ucp/instruments/:instrumentId
 */
router.delete('/ucp/instruments/:instrumentId', (req: Request, res: Response) => {
  const { instrumentId } = req.params;
  
  logger.info('UCP: Cancelling instrument', { instrumentId });
  
  const cancelled = cancelInstrument(instrumentId);
  
  if (!cancelled) {
    return sendError(res, 404, 'Instrument not found', 'INSTRUMENT_NOT_FOUND');
  }
  
  res.json({ success: true, message: 'Instrument cancelled' });
});

/**
 * Test endpoint: Mint a sandbox instrument directly
 * POST /ucp/test/mint
 * 
 * Simplified endpoint for testing without a real checkout.
 * Uses sandbox handler by default.
 */
router.post('/ucp/test/mint', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      amount = 10.00, 
      currency = 'USD',
      cardNumber = '4242424242424242',
    } = req.body;

    logger.info('UCP: Test mint instrument', { amount, currency });

    const result = await mintInstrument('test-checkout', {
      handlerId: 'com.ucp.sandbox',
      amount,
      currency,
      paymentData: { cardNumber },
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('UCP: Test mint failed', { error: error.message });
    sendError(res, 500, error.message || 'Test mint failed', 'MINT_ERROR');
  }
});

// ============================================================================
// UCP Complete Checkout (Phase 12)
// ============================================================================

/**
 * Complete a checkout using a minted payment instrument
 * POST /ucp/checkout/:checkoutId/complete
 * 
 * This enables server-side checkout completion without redirect.
 * 
 * Body: {
 *   instrumentId: string,      // Required: minted instrument ID
 *   billingAddress?: object,   // Optional billing address
 *   shippingAddress?: object,  // Optional shipping address
 *   buyerNote?: string,        // Optional note
 *   idempotencyKey?: string    // Optional idempotency key
 * }
 * 
 * Returns the created order on success.
 */
router.post('/ucp/checkout/:checkoutId/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { checkoutId } = req.params;
    
    // Validate request body
    const parseResult = CompleteCheckoutRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid complete checkout request',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    logger.info('UCP: Completing checkout', {
      checkoutId,
      instrumentId: parseResult.data.instrumentId,
    });

    const result = await completeCheckout(checkoutId, parseResult.data);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      });
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('UCP: Failed to complete checkout', {
      checkoutId: req.params.checkoutId,
      error: error.message,
    });
    sendError(res, 500, error.message || 'Failed to complete checkout', 'CHECKOUT_ERROR');
  }
});

/**
 * Test endpoint: Complete checkout flow
 * POST /ucp/test/complete-checkout
 * 
 * Creates a test checkout, mints an instrument, and completes the checkout
 * in one call. For testing purposes only.
 */
router.post('/ucp/test/complete-checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      amount = 25.99, 
      currency = 'USD',
      cardNumber = '4242424242424242',
    } = req.body;

    logger.info('UCP: Test complete checkout flow', { amount, currency });

    // 1. Create a test checkout state
    const checkoutId = `test-checkout-${Date.now()}`;
    setCheckoutState(checkoutId, {
      id: checkoutId,
      status: 'created',
      items: [
        { productId: 'test-product', name: 'Test Product', quantity: 1, price: amount }
      ],
      totals: { subtotal: amount, total: amount },
      currency,
      createdAt: new Date(),
    });

    // 2. Mint an instrument
    const mintResult = await mintInstrument(checkoutId, {
      handlerId: 'com.ucp.sandbox',
      amount,
      currency,
      paymentData: { cardNumber },
    });

    if (!mintResult.success || !mintResult.instrument) {
      res.status(400).json({
        success: false,
        step: 'mint',
        error: mintResult.error,
        errorCode: mintResult.errorCode,
      });
      return;
    }

    // 3. Complete the checkout
    const completeResult = await completeCheckout(checkoutId, {
      instrumentId: mintResult.instrument.id,
    });

    if (!completeResult.success) {
      res.status(400).json({
        success: false,
        step: 'complete',
        error: completeResult.error,
        errorCode: completeResult.errorCode,
      });
      return;
    }

    res.status(200).json({
      success: true,
      checkoutId,
      instrument: mintResult.instrument,
      order: completeResult.order,
      transaction: completeResult.transaction,
    });
  } catch (error: any) {
    logger.error('UCP: Test complete checkout failed', { error: error.message });
    sendError(res, 500, error.message || 'Test complete checkout failed', 'CHECKOUT_ERROR');
  }
});

export default router;
