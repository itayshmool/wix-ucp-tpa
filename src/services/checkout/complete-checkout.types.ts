/**
 * Complete Checkout Types
 * 
 * Types for server-side checkout completion (Phase 12)
 */

import { z } from 'zod';

// ============================================================================
// Complete Checkout Request
// ============================================================================

export const CompleteCheckoutRequestSchema = z.object({
  // The minted instrument ID to use for payment
  instrumentId: z.string().min(1, 'Instrument ID is required'),
  
  // Optional billing address (if not provided during minting)
  billingAddress: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().length(2).optional(),
  }).optional(),
  
  // Optional shipping address
  shippingAddress: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().length(2).optional(),
  }).optional(),
  
  // Optional buyer note
  buyerNote: z.string().max(500).optional(),
  
  // Idempotency key to prevent duplicate orders
  idempotencyKey: z.string().optional(),
});

export type CompleteCheckoutRequest = z.infer<typeof CompleteCheckoutRequestSchema>;

// ============================================================================
// Complete Checkout Response
// ============================================================================

export interface CompleteCheckoutResponse {
  success: boolean;
  
  // Order details (on success)
  order?: {
    id: string;
    number: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    items: Array<{
      productId: string;
      name: string;
      quantity: number;
      price: {
        amount: number;
        currency: string;
        formatted: string;
      };
    }>;
    totals: {
      subtotal: { amount: number; currency: string; formatted: string };
      discount?: { amount: number; currency: string; formatted: string };
      shipping?: { amount: number; currency: string; formatted: string };
      tax?: { amount: number; currency: string; formatted: string };
      total: { amount: number; currency: string; formatted: string };
    };
    billingAddress?: Record<string, string>;
    shippingAddress?: Record<string, string>;
    createdAt: string;
  };
  
  // Transaction details
  transaction?: {
    id: string;
    instrumentId: string;
    amount: number;
    currency: string;
    status: 'completed' | 'pending' | 'failed';
    processedAt: string;
  };
  
  // Error details (on failure)
  error?: string;
  errorCode?: string;
}

// ============================================================================
// Error Codes
// ============================================================================

export const CompleteCheckoutErrorCodes = {
  CHECKOUT_NOT_FOUND: 'CHECKOUT_NOT_FOUND',
  CHECKOUT_ALREADY_COMPLETED: 'CHECKOUT_ALREADY_COMPLETED',
  CHECKOUT_EXPIRED: 'CHECKOUT_EXPIRED',
  INSTRUMENT_NOT_FOUND: 'INSTRUMENT_NOT_FOUND',
  INSTRUMENT_INVALID: 'INSTRUMENT_INVALID',
  INSTRUMENT_EXPIRED: 'INSTRUMENT_EXPIRED',
  INSTRUMENT_ALREADY_USED: 'INSTRUMENT_ALREADY_USED',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  CURRENCY_MISMATCH: 'CURRENCY_MISMATCH',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ORDER_CREATION_FAILED: 'ORDER_CREATION_FAILED',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
} as const;

export type CompleteCheckoutErrorCode = keyof typeof CompleteCheckoutErrorCodes;

// ============================================================================
// Internal Types
// ============================================================================

export interface CheckoutState {
  id: string;
  status: 'created' | 'pending' | 'completed' | 'expired' | 'cancelled';
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  totals: {
    subtotal: number;
    discount?: number;
    shipping?: number;
    tax?: number;
    total: number;
  };
  currency: string;
  createdAt: Date;
  completedAt?: Date;
  orderId?: string;
}
