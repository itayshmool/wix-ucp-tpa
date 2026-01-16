/**
 * Order Types
 * 
 * Comprehensive type definitions for Wix eCommerce orders.
 */

/**
 * Order status
 */
export enum OrderStatus {
  INITIALIZED = 'INITIALIZED',
  APPROVED = 'APPROVED',
  CANCELED = 'CANCELED',
  FULFILLED = 'FULFILLED',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
}

/**
 * Payment status
 */
export enum PaymentStatus {
  NOT_PAID = 'NOT_PAID',
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  FULLY_REFUNDED = 'FULLY_REFUNDED',
}

/**
 * Fulfillment status
 */
export enum FulfillmentStatus {
  NOT_FULFILLED = 'NOT_FULFILLED',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
  FULFILLED = 'FULFILLED',
}

/**
 * Money representation
 */
export interface Money {
  /** Amount */
  amount: number;
  /** Currency code (e.g., 'USD') */
  currency: string;
  /** Formatted string (e.g., '$29.99') */
  formatted: string;
}

/**
 * Address information
 */
export interface Address {
  /** Street address */
  street?: string;
  /** Street address line 2 */
  street2?: string;
  /** City */
  city?: string;
  /** State/Province */
  state?: string;
  /** Postal/ZIP code */
  postalCode?: string;
  /** Country code */
  country?: string;
  /** Full formatted address */
  formatted?: string;
}

/**
 * Buyer information
 */
export interface Buyer {
  /** Contact ID */
  contactId?: string;
  /** Email */
  email?: string;
  /** Phone */
  phone?: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
}

/**
 * Order line item option (e.g., Size: M)
 */
export interface LineItemOption {
  /** Option name */
  option: string;
  /** Selected value */
  value: string;
}

/**
 * Order line item media
 */
export interface LineItemMedia {
  /** Media URL */
  url: string;
  /** Alt text */
  altText?: string;
}

/**
 * Order line item
 */
export interface OrderLineItem {
  /** Line item ID */
  id: string;
  /** Product ID */
  productId?: string;
  /** Variant ID */
  variantId?: string;
  /** Product name */
  name: string;
  /** Quantity */
  quantity: number;
  /** SKU */
  sku?: string;
  /** Unit price */
  price: Money;
  /** Total price (quantity × price) */
  totalPrice: Money;
  /** Weight */
  weight?: number;
  /** Weight unit */
  weightUnit?: string;
  /** Product media */
  media?: LineItemMedia;
  /** Selected options */
  options?: LineItemOption[];
  /** Fulfillment quantity */
  fulfilledQuantity?: number;
}

/**
 * Shipping information
 */
export interface ShippingInfo {
  /** Shipping address */
  address?: Address;
  /** Delivery option name */
  deliveryOption?: string;
  /** Estimated delivery date */
  estimatedDelivery?: Date;
  /** Shipping price */
  price?: Money;
}

/**
 * Billing information
 */
export interface BillingInfo {
  /** Billing address */
  address?: Address;
}

/**
 * Order pricing breakdown
 */
export interface OrderPricing {
  /** Subtotal (items only) */
  subtotal: Money;
  /** Shipping cost */
  shipping: Money;
  /** Tax */
  tax: Money;
  /** Discount */
  discount: Money;
  /** Total (final amount) */
  total: Money;
}

/**
 * Tracking information
 */
export interface TrackingInfo {
  /** Tracking number */
  trackingNumber?: string;
  /** Shipping carrier */
  carrier?: string;
  /** Tracking URL */
  trackingUrl?: string;
}

/**
 * Fulfillment
 */
export interface Fulfillment {
  /** Fulfillment ID */
  id: string;
  /** Fulfilled line items */
  lineItems: Array<{
    /** Line item ID */
    lineItemId: string;
    /** Quantity fulfilled */
    quantity: number;
  }>;
  /** Tracking information */
  trackingInfo?: TrackingInfo;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Channel information (where order came from)
 */
export interface ChannelInfo {
  /** Channel type (e.g., 'WEB', 'POS', 'OTHER') */
  type: string;
  /** External order ID (if from another platform) */
  externalOrderId?: string;
}

/**
 * Order
 */
export interface Order {
  /** Order ID */
  id: string;
  /** Human-readable order number */
  number: string;
  /** Order status */
  status: OrderStatus;
  /** Payment status */
  paymentStatus: PaymentStatus;
  /** Fulfillment status */
  fulfillmentStatus: FulfillmentStatus;
  /** Buyer information */
  buyer: Buyer;
  /** Order line items */
  lineItems: OrderLineItem[];
  /** Shipping information */
  shippingInfo?: ShippingInfo;
  /** Billing information */
  billingInfo?: BillingInfo;
  /** Pricing breakdown */
  pricing: OrderPricing;
  /** Fulfillments */
  fulfillments: Fulfillment[];
  /** Channel information */
  channelInfo?: ChannelInfo;
  /** Customer notes */
  customerNote?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Date range filter
 */
export interface DateRange {
  /** Start date */
  from: Date;
  /** End date */
  to: Date;
}

/**
 * Order query parameters
 */
export interface OrderQuery {
  /** Number of orders to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by order status */
  status?: OrderStatus[];
  /** Filter by payment status */
  paymentStatus?: PaymentStatus[];
  /** Filter by date range */
  dateRange?: DateRange;
  /** Search by order number or customer email */
  search?: string;
}

/**
 * Order list result with pagination
 */
export interface OrderListResult {
  /** Orders array */
  orders: Order[];
  /** Total count (across all pages) */
  totalCount: number;
  /** Whether there are more orders */
  hasMore: boolean;
}

/**
 * Fulfillment creation request
 */
export interface CreateFulfillmentRequest {
  /** Order ID */
  orderId: string;
  /** Line items to fulfill */
  lineItems: Array<{
    /** Line item ID */
    lineItemId: string;
    /** Quantity to fulfill */
    quantity: number;
  }>;
  /** Optional tracking information */
  trackingInfo?: TrackingInfo;
}
