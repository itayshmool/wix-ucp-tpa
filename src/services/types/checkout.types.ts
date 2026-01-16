/**
 * Checkout Types
 * 
 * Types for Wix eCommerce Checkout API integration.
 * Checkouts are created from carts and generate hosted checkout URLs.
 */

import { Money } from './cart.types.js';

/**
 * Checkout status
 */
export enum CheckoutStatus {
  CREATED = 'CREATED',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

/**
 * Payment status
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/**
 * Address
 */
export interface Address {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  subdivision?: string; // State/Province
  country?: string; // ISO 3166-1 alpha-2
  postalCode?: string;
}

/**
 * Contact details
 */
export interface ContactDetails {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

/**
 * Buyer info
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
 * Billing info
 */
export interface BillingInfo {
  address?: Address;
  contactDetails?: ContactDetails;
}

/**
 * Shipping option
 */
export interface ShippingOption {
  code?: string;
  title?: string;
  cost?: Money;
  logistics?: {
    deliveryTime?: string;
  };
}

/**
 * Shipping info
 */
export interface ShippingInfo {
  address?: Address;
  contactDetails?: ContactDetails;
  shippingOption?: ShippingOption;
}

/**
 * Checkout line item
 */
export interface CheckoutLineItem {
  id: string;
  productId: string;
  quantity: number;
  name: string;
  sku?: string;
  price: Money;
  totalPrice: Money;
  media?: {
    url: string;
    altText?: string;
  };
  options?: Array<{
    option: string;
    selection: string;
  }>;
}

/**
 * Price summary
 */
export interface PriceSummary {
  subtotal: Money;
  shipping?: Money;
  tax?: Money;
  discount?: Money;
  total: Money;
}

/**
 * Applied discount
 */
export interface AppliedDiscount {
  discountType: 'COUPON' | 'AUTOMATIC' | 'MANUAL';
  lineItemIds?: string[];
  coupon?: {
    id: string;
    code: string;
    name?: string;
  };
  discountAmount: Money;
}

/**
 * Checkout
 */
export interface Checkout {
  id: string;
  cartId?: string;
  lineItems: CheckoutLineItem[];
  billingInfo?: BillingInfo;
  shippingInfo?: ShippingInfo;
  buyerInfo?: BuyerInfo;
  priceSummary: PriceSummary;
  appliedDiscounts?: AppliedDiscount[];
  paymentStatus: PaymentStatus;
  status: CheckoutStatus;
  currency: string;
  checkoutUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Channel type for checkout
 */
export enum ChannelType {
  WEB = 'WEB',
  MOBILE = 'MOBILE',
  OTHER = 'OTHER',
}

/**
 * Options when creating checkout
 */
export interface CreateCheckoutOptions {
  channelType?: ChannelType;
  buyerInfo?: BuyerInfo;
  shippingAddress?: Address;
  billingAddress?: Address;
}

/**
 * Options for generating checkout URL
 */
export interface CheckoutUrlOptions {
  successUrl?: string; // URL to redirect after successful payment
  cancelUrl?: string; // URL to redirect if payment is canceled
  thankYouPageUrl?: string; // Custom thank you page
}

/**
 * Result of checkout URL generation
 */
export interface CheckoutUrlResult {
  checkoutId: string;
  checkoutUrl: string;
}
