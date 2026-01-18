/**
 * UCP Schema Validation
 * 
 * Zod schemas for validating UCP request/response payloads.
 * Ensures compliance with UCP specification.
 */

import { z } from 'zod';

// ============================================================================
// Price & Money Schemas
// ============================================================================

export const UCPPriceSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  formatted: z.string(),
});

// ============================================================================
// Product Schemas
// ============================================================================

export const UCPImageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export const UCPVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: UCPPriceSchema,
  available: z.boolean(),
  sku: z.string().optional(),
  options: z.record(z.string()).optional(),
});

export const UCPProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: UCPPriceSchema,
  compareAtPrice: UCPPriceSchema.optional(),
  images: z.array(UCPImageSchema),
  available: z.boolean(),
  stock: z.number().nonnegative().optional(),
  category: z.string().optional(),
  variants: z.array(UCPVariantSchema).optional(),
  sku: z.string().optional(),
  slug: z.string().optional(),
});

export const UCPPaginationSchema = z.object({
  total: z.number().nonnegative(),
  limit: z.number().positive(),
  offset: z.number().nonnegative(),
  hasMore: z.boolean(),
});

export const UCPProductsResponseSchema = z.object({
  products: z.array(UCPProductSchema),
  pagination: UCPPaginationSchema,
});

// ============================================================================
// Cart Schemas
// ============================================================================

export const UCPAddToCartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  variantId: z.string().optional(),
});

export const UCPCreateCartRequestSchema = z.object({
  items: z.array(UCPAddToCartItemSchema).min(1, 'At least one item is required'),
});

export const UCPUpdateCartItemSchema = z.object({
  quantity: z.number().int().nonnegative('Quantity must be non-negative'),
});

export const UCPCartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  price: UCPPriceSchema,
  quantity: z.number().positive(),
  image: UCPImageSchema.optional(),
  variant: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
});

export const UCPCartTotalsSchema = z.object({
  subtotal: UCPPriceSchema,
  tax: UCPPriceSchema.optional(),
  shipping: UCPPriceSchema.optional(),
  discount: UCPPriceSchema.optional(),
  total: UCPPriceSchema,
  itemCount: z.number().nonnegative(),
});

export const UCPCartSchema = z.object({
  id: z.string().nullable(),
  items: z.array(UCPCartItemSchema),
  totals: UCPCartTotalsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================================================
// Checkout Schemas
// ============================================================================

export const UCPCreateCheckoutRequestSchema = z.object({
  cartId: z.string().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const UCPCheckoutSchema = z.object({
  id: z.string(),
  cartId: z.string(),
  checkoutUrl: z.string().url(),
  expiresAt: z.string().optional(),
  totals: UCPCartTotalsSchema,
});

// ============================================================================
// Address Schemas
// ============================================================================

export const UCPAddressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(2).max(2),
  phone: z.string().optional(),
});

export const UCPCustomerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

// ============================================================================
// Order Schemas
// ============================================================================

export const UCPOrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

export const UCPPaymentStatusSchema = z.enum([
  'pending',
  'paid',
  'refunded',
  'failed',
]);

export const UCPFulfillmentStatusSchema = z.enum([
  'unfulfilled',
  'partially_fulfilled',
  'fulfilled',
]);

export const UCPTrackingInfoSchema = z.object({
  carrier: z.string(),
  trackingNumber: z.string(),
  trackingUrl: z.string().url().optional(),
});

export const UCPFulfillmentSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'shipped', 'delivered']),
  items: z.array(z.object({
    lineItemId: z.string(),
    quantity: z.number().positive(),
  })),
  tracking: UCPTrackingInfoSchema.optional(),
  createdAt: z.string(),
});

export const UCPOrderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  price: UCPPriceSchema,
  quantity: z.number().positive(),
  image: UCPImageSchema.optional(),
  fulfilledQuantity: z.number().nonnegative().optional(),
});

export const UCPOrderTotalsSchema = z.object({
  subtotal: UCPPriceSchema,
  tax: UCPPriceSchema,
  shipping: UCPPriceSchema,
  discount: UCPPriceSchema.optional(),
  total: UCPPriceSchema,
});

export const UCPOrderSchema = z.object({
  id: z.string(),
  number: z.string().optional(),
  status: UCPOrderStatusSchema,
  paymentStatus: UCPPaymentStatusSchema,
  fulfillmentStatus: UCPFulfillmentStatusSchema,
  items: z.array(UCPOrderItemSchema),
  totals: UCPOrderTotalsSchema,
  shippingAddress: UCPAddressSchema.optional(),
  billingAddress: UCPAddressSchema.optional(),
  customer: UCPCustomerSchema.optional(),
  fulfillments: z.array(UCPFulfillmentSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const UCPOrdersListResponseSchema = z.object({
  orders: z.array(UCPOrderSchema),
  pagination: UCPPaginationSchema,
});

// ============================================================================
// Discovery Schema
// ============================================================================

export const UCPCapabilitySchema = z.enum([
  'catalog_search',
  'product_details',
  'cart_management',
  'checkout',
  'orders',
  'fulfillment',
  'discounts',
  // Legacy aliases
  'browse',
  'search',
  'cart',
]);

export const UCPDiscoverySchema = z.object({
  protocol: z.literal('ucp'),
  version: z.string(),
  merchant: z.object({
    id: z.string(),
    name: z.string(),
    domain: z.string(),
    description: z.string().optional(),
    logo: z.string().url().optional(),
    currency: z.string().length(3),
    verified: z.boolean().optional(),
  }),
  capabilities: z.array(UCPCapabilitySchema),
  endpoints: z.object({
    catalog: z.string().url(),
    product: z.string(),
    cart: z.string().url(),
    checkout: z.string().url(),
    orders: z.string().optional(),
  }),
  payment_handlers: z.array(z.string()),
  trust_signals: z.object({
    ssl: z.boolean(),
    return_policy_url: z.string().url().optional(),
    shipping_policy_url: z.string().url().optional(),
    privacy_policy_url: z.string().url().optional(),
  }).optional(),
  supported_countries: z.array(z.string().length(2)).optional(),
  shipping: z.object({
    countries: z.array(z.string()),
    free_shipping_threshold: z.number().nonnegative().optional(),
    default_rate: z.string().optional(),
  }).optional(),
});

// ============================================================================
// Error Schema
// ============================================================================

export const UCPErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const ProductsQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  search: z.string().optional(),
});

export const OrdersQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  email: z.string().email().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type UCPCreateCartRequest = z.infer<typeof UCPCreateCartRequestSchema>;
export type UCPCreateCheckoutRequest = z.infer<typeof UCPCreateCheckoutRequestSchema>;
export type UCPUpdateCartItem = z.infer<typeof UCPUpdateCartItemSchema>;
