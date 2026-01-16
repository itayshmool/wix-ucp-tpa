/**
 * UCP Translator
 * 
 * Converts between Wix API formats and UCP (Universal Commerce Protocol) formats.
 * This is the translation layer that makes Wix data LLM-friendly.
 */

import {
  UCPProduct,
  UCPImage,
  UCPCart,
  UCPCartItem,
  UCPOrder,
  UCPOrderStatus,
  UCPOrderItem,
} from './ucp.types.js';

// Import Wix types (we'll use 'any' for flexibility as Wix API responses can vary)
// In a production app, we'd use proper Wix SDK types

/**
 * Convert a Wix product to UCP format
 */
export function wixProductToUCP(wixProduct: any): UCPProduct {
  // Handle price - Wix has different formats depending on API version
  const price = wixProduct.price || wixProduct.priceData?.price || 0;
  const currency = wixProduct.priceData?.currency || wixProduct.currency || 'USD';
  const formattedPrice = wixProduct.priceData?.formatted?.price || 
    wixProduct.formattedPrice || 
    formatPrice(price, currency);

  // Handle compare at price (original price before discount)
  const compareAtPrice = wixProduct.priceData?.discountedPrice !== wixProduct.priceData?.price
    ? wixProduct.priceData?.price
    : undefined;

  // Handle images
  const images: UCPImage[] = [];
  if (wixProduct.media?.mainMedia?.image) {
    images.push({
      url: wixProduct.media.mainMedia.image.url,
      alt: wixProduct.media.mainMedia.image.altText || wixProduct.name,
      width: wixProduct.media.mainMedia.image.width,
      height: wixProduct.media.mainMedia.image.height,
    });
  }
  if (wixProduct.media?.items) {
    wixProduct.media.items.forEach((item: any) => {
      if (item.image && item.image.url !== images[0]?.url) {
        images.push({
          url: item.image.url,
          alt: item.image.altText || wixProduct.name,
          width: item.image.width,
          height: item.image.height,
        });
      }
    });
  }

  // Handle stock/availability
  const stock = wixProduct.stock || wixProduct.inventory;
  // Product is in stock if: explicitly set, or inventory tracking is disabled, or default to true
  const inStock = stock?.inStock ?? (stock?.trackInventory === false ? true : true);
  const quantity = stock?.quantity;

  return {
    id: wixProduct.id || wixProduct._id,
    name: wixProduct.name,
    description: wixProduct.description || undefined,
    price: {
      amount: typeof price === 'number' ? price : parseFloat(price) || 0,
      currency,
      formatted: formattedPrice,
    },
    compareAtPrice: compareAtPrice ? {
      amount: compareAtPrice,
      currency,
      formatted: formatPrice(compareAtPrice, currency),
    } : undefined,
    images,
    available: inStock,
    stock: quantity,
    category: wixProduct.productType || wixProduct.collections?.[0]?.name,
    sku: wixProduct.sku,
    slug: wixProduct.slug,
    variants: wixProduct.variants?.map((v: any) => {
      // Handle different choices formats (array or object)
      const choices = Array.isArray(v.choices) ? v.choices : 
        (v.choices ? Object.entries(v.choices).map(([key, value]) => ({ optionName: key, value })) : []);
      
      return {
        id: v.id || v._id,
        name: choices.length > 0 ? choices.map((c: any) => c.value || c).join(' / ') : 'Default',
        price: {
          amount: v.variant?.priceData?.price || v.priceData?.price || price,
          currency,
          formatted: v.variant?.priceData?.formatted?.price || v.priceData?.formatted?.price || formattedPrice,
        },
        available: v.stock?.inStock ?? true,
        sku: v.variant?.sku || v.sku,
        options: choices.reduce((acc: any, c: any) => {
          if (c.optionName && c.value) {
            acc[c.optionName] = c.value;
          }
          return acc;
        }, {}),
      };
    }),
  };
}

/**
 * Convert a Wix cart to UCP format
 */
export function wixCartToUCP(wixCart: any): UCPCart {
  const currency = wixCart.currency || 'USD';

  const items: UCPCartItem[] = (wixCart.lineItems || []).map((item: any) => ({
    id: item.id || item._id,
    productId: item.catalogReference?.catalogItemId || item.productId,
    name: item.productName?.original || item.name || 'Unknown Product',
    price: {
      amount: parseFloat(item.price?.amount) || item.price || 0,
      currency,
      formatted: item.price?.formattedAmount || formatPrice(item.price?.amount || item.price, currency),
    },
    quantity: item.quantity || 1,
    image: item.image ? {
      url: item.image.url,
      alt: item.image.altText || item.productName?.original,
    } : undefined,
    variant: item.catalogReference?.options ? {
      id: JSON.stringify(item.catalogReference.options),
      name: Object.values(item.catalogReference.options).join(' / '),
    } : undefined,
  }));

  const subtotal = parseFloat(wixCart.subtotal?.amount) || 
    items.reduce((sum, item) => sum + (item.price.amount * item.quantity), 0);

  return {
    id: wixCart.id || wixCart._id,
    items,
    totals: {
      subtotal: {
        amount: subtotal,
        currency,
        formatted: wixCart.subtotal?.formattedAmount || formatPrice(subtotal, currency),
      },
      total: {
        amount: subtotal,
        currency,
        formatted: formatPrice(subtotal, currency),
      },
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    },
    createdAt: wixCart.createdDate || wixCart.createdAt || new Date().toISOString(),
    updatedAt: wixCart.updatedDate || wixCart.updatedAt || new Date().toISOString(),
  };
}

/**
 * Convert UCP cart item to Wix line item format
 */
export function ucpCartItemToWix(item: { productId: string; quantity: number; variantId?: string }) {
  return {
    catalogReference: {
      catalogItemId: item.productId,
      appId: '1380b703-ce81-ff05-f115-39571d94dfcd', // Wix Stores App ID
      options: item.variantId ? JSON.parse(item.variantId) : undefined,
    },
    quantity: item.quantity,
  };
}

/**
 * Convert a Wix order to UCP format
 */
export function wixOrderToUCP(wixOrder: any): UCPOrder {
  const currency = wixOrder.currency || 'USD';

  const items: UCPOrderItem[] = (wixOrder.lineItems || []).map((item: any) => ({
    id: item.id || item._id,
    productId: item.catalogReference?.catalogItemId || item.productId,
    name: item.productName?.original || item.name || 'Unknown Product',
    price: {
      amount: parseFloat(item.price?.amount) || item.price || 0,
      currency,
      formatted: item.price?.formattedAmount || formatPrice(item.price?.amount, currency),
    },
    quantity: item.quantity || 1,
    image: item.image ? {
      url: item.image.url,
      alt: item.image.altText,
    } : undefined,
  }));

  return {
    id: wixOrder.id || wixOrder._id || wixOrder.number,
    status: mapWixOrderStatus(wixOrder.status || wixOrder.fulfillmentStatus),
    items,
    totals: {
      subtotal: {
        amount: parseFloat(wixOrder.priceSummary?.subtotal?.amount) || 0,
        currency,
        formatted: wixOrder.priceSummary?.subtotal?.formattedAmount || '$0.00',
      },
      tax: {
        amount: parseFloat(wixOrder.priceSummary?.tax?.amount) || 0,
        currency,
        formatted: wixOrder.priceSummary?.tax?.formattedAmount || '$0.00',
      },
      shipping: {
        amount: parseFloat(wixOrder.priceSummary?.shipping?.amount) || 0,
        currency,
        formatted: wixOrder.priceSummary?.shipping?.formattedAmount || '$0.00',
      },
      total: {
        amount: parseFloat(wixOrder.priceSummary?.total?.amount) || 0,
        currency,
        formatted: wixOrder.priceSummary?.total?.formattedAmount || '$0.00',
      },
    },
    shippingAddress: wixOrder.shippingInfo?.logistics?.shippingDestination?.address ? {
      firstName: wixOrder.shippingInfo.logistics.shippingDestination.contactDetails?.firstName,
      lastName: wixOrder.shippingInfo.logistics.shippingDestination.contactDetails?.lastName,
      addressLine1: wixOrder.shippingInfo.logistics.shippingDestination.address.addressLine1,
      addressLine2: wixOrder.shippingInfo.logistics.shippingDestination.address.addressLine2,
      city: wixOrder.shippingInfo.logistics.shippingDestination.address.city,
      state: wixOrder.shippingInfo.logistics.shippingDestination.address.subdivision,
      postalCode: wixOrder.shippingInfo.logistics.shippingDestination.address.postalCode,
      country: wixOrder.shippingInfo.logistics.shippingDestination.address.country,
      phone: wixOrder.shippingInfo.logistics.shippingDestination.contactDetails?.phone,
    } : undefined,
    customer: wixOrder.buyerInfo ? {
      email: wixOrder.buyerInfo.email,
      firstName: wixOrder.buyerInfo.firstName,
      lastName: wixOrder.buyerInfo.lastName,
      phone: wixOrder.buyerInfo.phone,
    } : undefined,
    createdAt: wixOrder.createdDate || wixOrder._createdDate || new Date().toISOString(),
    updatedAt: wixOrder.updatedDate || wixOrder._updatedDate || new Date().toISOString(),
  };
}

/**
 * Map Wix order status to UCP status
 */
function mapWixOrderStatus(wixStatus: string): UCPOrderStatus {
  const statusMap: Record<string, UCPOrderStatus> = {
    'INITIALIZED': 'pending',
    'PENDING': 'pending',
    'APPROVED': 'confirmed',
    'NOT_FULFILLED': 'processing',
    'PARTIALLY_FULFILLED': 'processing',
    'FULFILLED': 'shipped',
    'DELIVERED': 'delivered',
    'CANCELED': 'cancelled',
    'CANCELLED': 'cancelled',
    'REFUNDED': 'refunded',
  };

  return statusMap[wixStatus?.toUpperCase()] || 'pending';
}

/**
 * Format a price with currency symbol
 */
function formatPrice(amount: number | string | undefined, currency: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount || 0;
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(numAmount);
  } catch {
    return `${currency} ${numAmount.toFixed(2)}`;
  }
}
