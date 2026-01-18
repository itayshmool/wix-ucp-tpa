/**
 * UCP Discount Types
 * 
 * Types for the UCP Discounts Extension that handles
 * coupon codes and promotional discounts.
 */

import { z } from 'zod';

// ============================================================================
// Discount Type Schema
// ============================================================================

export const DiscountTypeSchema = z.enum([
  'percentage',
  'fixed_amount',
  'free_shipping',
  'buy_x_get_y',
]);

export type DiscountType = z.infer<typeof DiscountTypeSchema>;

// ============================================================================
// Discount Scope Schema
// ============================================================================

export const DiscountScopeSchema = z.enum([
  'order',           // Applies to entire order
  'line_items',      // Applies to specific line items
  'shipping',        // Applies to shipping costs
]);

export type DiscountScope = z.infer<typeof DiscountScopeSchema>;

// ============================================================================
// Applied Discount Schema
// ============================================================================

export const AppliedDiscountSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  type: DiscountTypeSchema,
  scope: DiscountScopeSchema,
  value: z.number().nonnegative(),           // Percentage (0-100) or fixed amount
  currency: z.string().length(3).optional(), // Required for fixed_amount
  amount: z.number().nonnegative(),          // Actual discount amount in checkout currency
  formattedAmount: z.string(),
  appliedToLineItems: z.array(z.string()).optional(), // Line item IDs if scope is line_items
});

export type AppliedDiscount = z.infer<typeof AppliedDiscountSchema>;

// ============================================================================
// Apply Coupon Request Schema
// ============================================================================

export const ApplyCouponRequestSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50),
  checkoutId: z.string().optional(), // If not provided, applies to current checkout
});

export type ApplyCouponRequest = z.infer<typeof ApplyCouponRequestSchema>;

// ============================================================================
// Apply Coupon Response Schema
// ============================================================================

export const ApplyCouponResponseSchema = z.object({
  success: z.boolean(),
  discount: AppliedDiscountSchema.optional(),
  error: z.string().optional(),
  errorCode: z.string().optional(),
  totals: z.object({
    subtotal: z.object({
      amount: z.number(),
      currency: z.string(),
      formatted: z.string(),
    }),
    discount: z.object({
      amount: z.number(),
      currency: z.string(),
      formatted: z.string(),
    }),
    total: z.object({
      amount: z.number(),
      currency: z.string(),
      formatted: z.string(),
    }),
  }).optional(),
});

export type ApplyCouponResponse = z.infer<typeof ApplyCouponResponseSchema>;

// ============================================================================
// Remove Coupon Request Schema
// ============================================================================

export const RemoveCouponRequestSchema = z.object({
  discountId: z.string().min(1),
  checkoutId: z.string().optional(),
});

export type RemoveCouponRequest = z.infer<typeof RemoveCouponRequestSchema>;

// ============================================================================
// Discount Validation Error Codes
// ============================================================================

export const DiscountErrorCodes = {
  INVALID_CODE: 'INVALID_CODE',
  EXPIRED: 'EXPIRED',
  MIN_PURCHASE_NOT_MET: 'MIN_PURCHASE_NOT_MET',
  MAX_USES_REACHED: 'MAX_USES_REACHED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  ALREADY_APPLIED: 'ALREADY_APPLIED',
  CHECKOUT_NOT_FOUND: 'CHECKOUT_NOT_FOUND',
} as const;

export type DiscountErrorCode = keyof typeof DiscountErrorCodes;

// ============================================================================
// Available Discounts Response
// ============================================================================

export interface AvailableDiscount {
  id: string;
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  currency?: string;
  minPurchase?: number;
  expiresAt?: string;
  usageLimit?: number;
  usageCount?: number;
}

export interface AvailableDiscountsResponse {
  discounts: AvailableDiscount[];
}
