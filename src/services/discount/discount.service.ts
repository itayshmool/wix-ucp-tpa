/**
 * Discount Service
 * 
 * Handles coupon code validation and application
 * for the UCP Discounts Extension.
 */

import { getWixSdkClient } from '../../wix/sdk-client.js';
import { logger } from '../../utils/logger.js';
import {
  AppliedDiscount,
  ApplyCouponResponse,
  DiscountType,
  DiscountErrorCodes,
} from './discount.types.js';

// ============================================================================
// Apply Coupon to Checkout
// ============================================================================

/**
 * Apply a coupon code to a checkout
 */
export async function applyCouponToCheckout(
  code: string,
  checkoutId: string
): Promise<ApplyCouponResponse> {
  try {
    logger.info('Applying coupon to checkout', { code, checkoutId });

    const client = getWixSdkClient();

    // Use Wix SDK to apply coupon - different method name in SDK
    const response = await (client.checkout as any).applyCoupon(checkoutId, code);

    const checkoutData = (response as any).checkout || response;
    
    // Check if coupon was applied successfully
    const appliedCoupon = checkoutData.appliedDiscounts?.find(
      (d: any) => d.coupon?.code?.toLowerCase() === code.toLowerCase()
    );

    if (!appliedCoupon) {
      // Check for error in response
      const error = checkoutData.validationErrors?.find(
        (e: any) => e.type === 'COUPON' || e.couponCode
      );

      return {
        success: false,
        error: error?.message || 'Coupon could not be applied',
        errorCode: mapWixCouponError(error?.type),
      };
    }

    const discount = mapWixDiscountToUCP(appliedCoupon, checkoutData.currency || 'USD');

    return {
      success: true,
      discount,
      totals: {
        subtotal: {
          amount: parseFloat(checkoutData.priceSummary?.subtotal?.amount || '0'),
          currency: checkoutData.currency || 'USD',
          formatted: checkoutData.priceSummary?.subtotal?.formattedAmount || '$0.00',
        },
        discount: {
          amount: discount.amount,
          currency: discount.currency || checkoutData.currency || 'USD',
          formatted: discount.formattedAmount,
        },
        total: {
          amount: parseFloat(checkoutData.priceSummary?.total?.amount || '0'),
          currency: checkoutData.currency || 'USD',
          formatted: checkoutData.priceSummary?.total?.formattedAmount || '$0.00',
        },
      },
    };
  } catch (error: any) {
    logger.error('Failed to apply coupon', {
      code,
      checkoutId,
      error: error.message,
    });

    // Parse Wix error response
    const errorMessage = parseWixError(error);
    const errorCode = getErrorCodeFromMessage(errorMessage);

    return {
      success: false,
      error: errorMessage,
      errorCode,
    };
  }
}

/**
 * Remove a coupon/discount from checkout
 */
export async function removeCouponFromCheckout(
  checkoutId: string
): Promise<ApplyCouponResponse> {
  try {
    logger.info('Removing coupon from checkout', { checkoutId });

    const client = getWixSdkClient();

    // Use Wix SDK to remove coupon
    const response = await client.checkout.removeCoupon(checkoutId);
    const checkoutData = (response as any).checkout || response;

    return {
      success: true,
      totals: {
        subtotal: {
          amount: parseFloat(checkoutData.priceSummary?.subtotal?.amount || '0'),
          currency: checkoutData.currency || 'USD',
          formatted: checkoutData.priceSummary?.subtotal?.formattedAmount || '$0.00',
        },
        discount: {
          amount: 0,
          currency: checkoutData.currency || 'USD',
          formatted: '$0.00',
        },
        total: {
          amount: parseFloat(checkoutData.priceSummary?.total?.amount || '0'),
          currency: checkoutData.currency || 'USD',
          formatted: checkoutData.priceSummary?.total?.formattedAmount || '$0.00',
        },
      },
    };
  } catch (error: any) {
    logger.error('Failed to remove coupon', {
      checkoutId,
      error: error.message,
    });

    return {
      success: false,
      error: parseWixError(error),
      errorCode: 'DISCOUNT_ERROR',
    };
  }
}

/**
 * Get applied discounts for a checkout
 */
export async function getCheckoutDiscounts(
  checkoutId: string
): Promise<AppliedDiscount[]> {
  try {
    logger.info('Getting checkout discounts', { checkoutId });

    const client = getWixSdkClient();
    const response = await client.checkout.getCheckout(checkoutId);
    const checkoutData = (response as any).checkout || response;
    const currency = checkoutData.currency || 'USD';

    const discounts: AppliedDiscount[] = (checkoutData.appliedDiscounts || [])
      .map((d: any) => mapWixDiscountToUCP(d, currency));

    return discounts;
  } catch (error: any) {
    logger.error('Failed to get checkout discounts', {
      checkoutId,
      error: error.message,
    });
    return [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map Wix discount to UCP format
 */
function mapWixDiscountToUCP(wixDiscount: any, currency: string): AppliedDiscount {
  const coupon = wixDiscount.coupon;
  const discountRule = wixDiscount.discountRule;
  
  // Determine discount type
  let type: DiscountType = 'fixed_amount';
  let value = 0;
  
  if (coupon) {
    if (coupon.percentOff) {
      type = 'percentage';
      value = coupon.percentOff;
    } else if (coupon.moneyOff) {
      type = 'fixed_amount';
      value = parseFloat(coupon.moneyOff.amount || '0');
    } else if (coupon.freeShipping) {
      type = 'free_shipping';
      value = 100;
    }
  } else if (discountRule) {
    // Handle automatic discount rules
    if (discountRule.percentage) {
      type = 'percentage';
      value = discountRule.percentage;
    } else if (discountRule.money) {
      type = 'fixed_amount';
      value = parseFloat(discountRule.money.amount || '0');
    }
  }

  const amount = parseFloat(wixDiscount.discountAmount?.amount || '0');

  return {
    id: coupon?._id || discountRule?._id || wixDiscount.id || 'unknown',
    code: coupon?.code,
    name: coupon?.name || discountRule?.name || 'Discount',
    description: coupon?.description || discountRule?.description,
    type,
    scope: wixDiscount.lineItemIds?.length ? 'line_items' : 'order',
    value,
    currency,
    amount,
    formattedAmount: wixDiscount.discountAmount?.formattedAmount || formatPrice(amount, currency),
    appliedToLineItems: wixDiscount.lineItemIds,
  };
}

/**
 * Map Wix coupon error to UCP error code
 */
function mapWixCouponError(wixError?: string): string {
  const errorMap: Record<string, string> = {
    'COUPON_NOT_FOUND': DiscountErrorCodes.INVALID_CODE,
    'COUPON_EXPIRED': DiscountErrorCodes.EXPIRED,
    'COUPON_USAGE_LIMIT_REACHED': DiscountErrorCodes.MAX_USES_REACHED,
    'MIN_SUBTOTAL_NOT_MET': DiscountErrorCodes.MIN_PURCHASE_NOT_MET,
    'COUPON_NOT_APPLICABLE': DiscountErrorCodes.NOT_APPLICABLE,
    'COUPON_ALREADY_APPLIED': DiscountErrorCodes.ALREADY_APPLIED,
  };

  return errorMap[wixError || ''] || DiscountErrorCodes.INVALID_CODE;
}

/**
 * Parse error message from Wix error response
 */
function parseWixError(error: any): string {
  if (error.details?.validationError?.fieldViolations) {
    const violation = error.details.validationError.fieldViolations[0];
    return violation?.description || violation?.message || 'Validation error';
  }
  
  if (error.details?.applicationError) {
    return error.details.applicationError.description || error.details.applicationError.code;
  }
  
  return error.message || 'Unknown error';
}

/**
 * Get error code from error message
 */
function getErrorCodeFromMessage(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('not found') || lowerMessage.includes('invalid')) {
    return DiscountErrorCodes.INVALID_CODE;
  }
  if (lowerMessage.includes('expired')) {
    return DiscountErrorCodes.EXPIRED;
  }
  if (lowerMessage.includes('minimum') || lowerMessage.includes('subtotal')) {
    return DiscountErrorCodes.MIN_PURCHASE_NOT_MET;
  }
  if (lowerMessage.includes('limit') || lowerMessage.includes('usage')) {
    return DiscountErrorCodes.MAX_USES_REACHED;
  }
  if (lowerMessage.includes('already')) {
    return DiscountErrorCodes.ALREADY_APPLIED;
  }
  
  return DiscountErrorCodes.NOT_APPLICABLE;
}

/**
 * Format price with currency
 */
function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
