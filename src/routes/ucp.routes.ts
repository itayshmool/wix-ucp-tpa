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
    capabilities: ['catalog_search', 'product_details', 'cart_management', 'checkout'],
    endpoints: {
      catalog: `${baseUrl}/ucp/products`,
      product: `${baseUrl}/ucp/products/{id}`,
      cart: `${baseUrl}/ucp/cart`,
      checkout: `${baseUrl}/ucp/checkout`,
      orders: `${baseUrl}/ucp/orders/{id}`,
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
 * Get Order
 * GET /ucp/orders/:id
 */
router.get('/ucp/orders/:id', async (_req: Request, res: Response) => {
  // Note: Orders API requires elevated permissions
  // For POC, we'll return a placeholder
  sendError(res, 501, 'Order retrieval not implemented in POC', 'NOT_IMPLEMENTED');
});

export default router;
