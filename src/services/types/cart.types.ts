/**
 * Cart Types
 * 
 * Types for Wix eCommerce Cart API integration.
 * Carts are created programmatically and converted to checkouts.
 */

/**
 * Wix Stores App ID - Required for catalog references
 */
export const WIX_STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

/**
 * Money representation
 */
export interface Money {
  amount: string; // Decimal as string, e.g., "29.99"
  currency: string; // ISO 4217 currency code, e.g., "USD"
  formattedAmount?: string; // e.g., "$29.99"
}

/**
 * Catalog reference for a product/variant
 * Used when adding items to cart
 */
export interface CatalogReference {
  catalogItemId: string; // Product ID or Variant ID
  appId: string; // Always WIX_STORES_APP_ID for Wix products
  options?: {
    variantId?: string;
    customTextFields?: Record<string, string>;
  };
}

/**
 * Cart line item
 */
export interface CartLineItem {
  id: string;
  productId: string;
  quantity: number;
  catalogReference: CatalogReference;
  productName: string;
  price: Money;
  lineItemPrice: Money; // price * quantity
  media?: {
    url: string;
    altText?: string;
  };
  sku?: string;
  weight?: number;
  options?: Array<{
    option: string;
    selection: string;
  }>;
}

/**
 * Discount applied to cart
 */
export interface AppliedDiscount {
  discountType: 'COUPON' | 'AUTOMATIC' | 'MANUAL';
  lineItemIds?: string[]; // Items this discount applies to
  coupon?: {
    id: string;
    code: string;
    name?: string;
  };
  discountAmount: Money;
}

/**
 * Buyer information
 */
export interface BuyerInfo {
  contactId?: string;
  visitorId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Cart
 */
export interface Cart {
  id: string;
  lineItems: CartLineItem[];
  buyerInfo?: BuyerInfo;
  currency: string;
  subtotal: Money;
  appliedDiscounts?: AppliedDiscount[];
  buyerNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Item to add to cart
 */
export interface AddToCartItem {
  catalogReference: CatalogReference;
  quantity: number;
}

/**
 * Options when creating a cart
 */
export interface CartOptions {
  currency?: string; // Default: "USD"
  buyerNote?: string;
  couponCode?: string;
}

/**
 * Result of adding items to cart
 */
export interface AddToCartResult {
  cart: Cart;
  addedItems: CartLineItem[];
}

/**
 * Update line item quantity request
 */
export interface UpdateLineItemQuantity {
  lineItemId: string;
  quantity: number;
}
