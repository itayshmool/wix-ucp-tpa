/**
 * UCP (Universal Commerce Protocol) Types
 * 
 * These types define the standardized format for commerce data
 * that LLM agents can understand and work with.
 */

/**
 * UCP Store Discovery Response (Official Spec Compliant)
 * Based on ucp.dev specification
 */
export interface UCPDiscovery {
  protocol: 'ucp';
  version: string;
  merchant: UCPMerchant;
  capabilities: UCPCapability[];
  endpoints: UCPEndpoints;
  payment_handlers: string[];
  trust_signals?: UCPTrustSignals;
  // Geographic scope
  supported_countries?: string[];
  shipping?: UCPShipping;
}

export interface UCPShipping {
  countries: string[];
  free_shipping_threshold?: number;
  default_rate?: string;
}

export interface UCPMerchant {
  id: string;
  name: string;
  domain: string;
  description?: string;
  logo?: string;
  currency: string;
  verified?: boolean;
}

export type UCPCapability = 
  | 'catalog_search' 
  | 'product_details' 
  | 'cart_management' 
  | 'checkout'
  | 'orders'
  | 'fulfillment'
  | 'discounts'
  // Legacy aliases for backward compatibility
  | 'browse' 
  | 'search' 
  | 'cart';

export interface UCPEndpoints {
  catalog: string;
  product: string;
  cart: string;
  checkout: string;
  orders?: string;
}

export interface UCPTrustSignals {
  ssl: boolean;
  return_policy_url?: string;
  shipping_policy_url?: string;
  privacy_policy_url?: string;
}

// Keep old interface for backward compatibility
export interface UCPStore {
  id: string;
  name: string;
  description?: string;
  url: string;
  currency: string;
  categories?: string[];
}

/**
 * UCP Product Types
 */
export interface UCPProduct {
  id: string;
  name: string;
  description?: string;
  price: UCPPrice;
  compareAtPrice?: UCPPrice;
  images: UCPImage[];
  available: boolean;
  stock?: number;
  category?: string;
  variants?: UCPVariant[];
  sku?: string;
  slug?: string;
}

export interface UCPPrice {
  amount: number;
  currency: string;
  formatted: string;
}

export interface UCPImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface UCPVariant {
  id: string;
  name: string;
  price: UCPPrice;
  available: boolean;
  sku?: string;
  options?: Record<string, string>;
}

export interface UCPProductsResponse {
  products: UCPProduct[];
  pagination: UCPPagination;
}

export interface UCPPagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * UCP Cart Types
 */
export interface UCPCart {
  id: string;
  items: UCPCartItem[];
  totals: UCPCartTotals;
  createdAt: string;
  updatedAt: string;
}

export interface UCPCartItem {
  id: string;
  productId: string;
  name: string;
  price: UCPPrice;
  quantity: number;
  image?: UCPImage;
  variant?: {
    id: string;
    name: string;
  };
}

export interface UCPCartTotals {
  subtotal: UCPPrice;
  tax?: UCPPrice;
  shipping?: UCPPrice;
  discount?: UCPPrice;
  total: UCPPrice;
  itemCount: number;
}

export interface UCPCreateCartRequest {
  items: UCPAddToCartItem[];
}

export interface UCPAddToCartItem {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface UCPUpdateCartRequest {
  items: UCPAddToCartItem[];
}

/**
 * UCP Checkout Types
 */
export interface UCPCheckout {
  id: string;
  cartId: string;
  checkoutUrl: string;
  expiresAt?: string;
  totals: UCPCartTotals;
}

export interface UCPCreateCheckoutRequest {
  cartId: string;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * UCP Order Types
 */
export interface UCPOrder {
  id: string;
  number?: string;
  status: UCPOrderStatus;
  paymentStatus: UCPPaymentStatus;
  fulfillmentStatus: UCPFulfillmentStatus;
  items: UCPOrderItem[];
  totals: UCPOrderTotals;
  shippingAddress?: UCPAddress;
  billingAddress?: UCPAddress;
  customer?: UCPCustomer;
  fulfillments?: UCPFulfillment[];
  createdAt: string;
  updatedAt: string;
}

export type UCPOrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type UCPPaymentStatus = 
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'failed';

export type UCPFulfillmentStatus = 
  | 'unfulfilled'
  | 'partially_fulfilled'
  | 'fulfilled';

export interface UCPOrderItem {
  id: string;
  productId: string;
  name: string;
  price: UCPPrice;
  quantity: number;
  image?: UCPImage;
  fulfilledQuantity?: number;
}

export interface UCPOrderTotals {
  subtotal: UCPPrice;
  tax: UCPPrice;
  shipping: UCPPrice;
  discount?: UCPPrice;
  total: UCPPrice;
}

export interface UCPFulfillment {
  id: string;
  status: 'pending' | 'shipped' | 'delivered';
  items: { lineItemId: string; quantity: number }[];
  tracking?: UCPTrackingInfo;
  createdAt: string;
}

export interface UCPTrackingInfo {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
}

export interface UCPOrdersListResponse {
  orders: UCPOrder[];
  pagination: UCPPagination;
}

export interface UCPAddress {
  firstName?: string;
  lastName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface UCPCustomer {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * UCP Error Response
 */
export interface UCPError {
  error: string;
  message: string;
  code?: string;
  details?: unknown;
}
