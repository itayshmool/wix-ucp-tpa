# Phase 10: Discounts Extension

## Context
The Discounts extension allows agents to apply coupon codes during checkout. This is a common e-commerce pattern that should be exposed via UCP.

## Reference Documentation
- Discounts Extension: https://ucp.dev/specification/checkout/discounts-extension
- Wix Coupons API: https://dev.wix.com/api/rest/wix-coupons

## Goal
Enable agents to apply and remove discount codes during checkout flow.

## Priority: 🟡 Medium | Complexity: 🟡 Medium | Duration: 2-3 days

---

## Tasks

### 1. Create Discount Types (src/services/ucp/discount.types.ts)

```typescript
export interface UCPDiscount {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;  // Percentage (0-100) or fixed amount in cents
  appliedAmount: UCPPrice;  // How much was actually saved
  minimumPurchase?: UCPPrice;
  expiresAt?: string;
}

export interface UCPApplyDiscountRequest {
  code: string;
}

export interface UCPApplyDiscountResponse {
  applied: boolean;
  discount?: UCPDiscount;
  error?: {
    code: string;
    message: string;
  };
  checkout: UCPCheckout;  // Updated checkout with discount applied
}

export interface UCPRemoveDiscountResponse {
  removed: boolean;
  checkout: UCPCheckout;
}

export type DiscountErrorCode = 
  | 'INVALID_CODE'
  | 'EXPIRED_CODE'
  | 'MINIMUM_NOT_MET'
  | 'ALREADY_APPLIED'
  | 'NOT_APPLICABLE'
  | 'USAGE_LIMIT_REACHED';
```

### 2. Create Discount Service (src/services/discounts/discount.service.ts)

```typescript
import { WixApiClient } from '../../wix/client.js';
import { logger } from '../../utils/logger.js';
import { UCPDiscount, UCPPrice } from '../ucp/ucp.types.js';

export class DiscountService {
  private client: WixApiClient;

  constructor(client: WixApiClient) {
    this.client = client;
  }

  /**
   * Apply coupon code to checkout
   */
  async applyCoupon(checkoutId: string, code: string): Promise<{
    success: boolean;
    discount?: UCPDiscount;
    error?: { code: string; message: string };
  }> {
    logger.info('Applying coupon to checkout', { checkoutId, code });

    try {
      // Wix API: Apply coupon to checkout
      const response = await this.client.post(
        `/ecom/v1/checkouts/${checkoutId}/addCoupon`,
        { code }
      );

      const checkout = response.checkout;
      const appliedCoupon = checkout.appliedDiscounts?.find(
        (d: any) => d.coupon?.code === code
      );

      if (!appliedCoupon) {
        return {
          success: false,
          error: {
            code: 'NOT_APPLICABLE',
            message: 'Coupon could not be applied to this checkout',
          },
        };
      }

      const discount: UCPDiscount = {
        id: appliedCoupon.coupon?.id || code,
        code: appliedCoupon.coupon?.code || code,
        name: appliedCoupon.coupon?.name || code,
        type: this.mapDiscountType(appliedCoupon.discountType),
        value: this.extractDiscountValue(appliedCoupon),
        appliedAmount: {
          amount: parseFloat(appliedCoupon.amount?.amount || '0'),
          currency: checkout.currency || 'USD',
          formatted: appliedCoupon.amount?.formattedAmount || '$0.00',
        },
      };

      logger.info('Coupon applied successfully', { 
        checkoutId, 
        code, 
        savings: discount.appliedAmount.formatted 
      });

      return { success: true, discount };
    } catch (error: any) {
      logger.error('Failed to apply coupon', { 
        checkoutId, 
        code, 
        error: error.message 
      });

      // Map Wix error to UCP error code
      const errorCode = this.mapWixErrorToCode(error);
      return {
        success: false,
        error: {
          code: errorCode,
          message: this.getErrorMessage(errorCode),
        },
      };
    }
  }

  /**
   * Remove coupon from checkout
   */
  async removeCoupon(checkoutId: string, code: string): Promise<boolean> {
    logger.info('Removing coupon from checkout', { checkoutId, code });

    try {
      await this.client.post(
        `/ecom/v1/checkouts/${checkoutId}/removeCoupon`,
        { code }
      );

      logger.info('Coupon removed successfully', { checkoutId, code });
      return true;
    } catch (error: any) {
      logger.error('Failed to remove coupon', { 
        checkoutId, 
        code, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Validate coupon code without applying
   */
  async validateCoupon(code: string, cartTotal?: number): Promise<{
    valid: boolean;
    discount?: Partial<UCPDiscount>;
    error?: { code: string; message: string };
  }> {
    logger.info('Validating coupon', { code });

    try {
      // Query Wix coupons API
      const response = await this.client.post('/coupons/v2/coupons/query', {
        query: {
          filter: { code: { $eq: code } },
          paging: { limit: 1 },
        },
      });

      const coupon = response.coupons?.[0];
      if (!coupon) {
        return {
          valid: false,
          error: { code: 'INVALID_CODE', message: 'Coupon code not found' },
        };
      }

      // Check expiration
      if (coupon.expirationTime && new Date(coupon.expirationTime) < new Date()) {
        return {
          valid: false,
          error: { code: 'EXPIRED_CODE', message: 'Coupon has expired' },
        };
      }

      // Check usage limit
      if (coupon.usageLimit && coupon.numberOfUsages >= coupon.usageLimit) {
        return {
          valid: false,
          error: { code: 'USAGE_LIMIT_REACHED', message: 'Coupon usage limit reached' },
        };
      }

      // Check minimum purchase
      const minPurchase = parseFloat(coupon.minimumSubtotal?.amount || '0');
      if (cartTotal !== undefined && cartTotal < minPurchase) {
        return {
          valid: false,
          error: { 
            code: 'MINIMUM_NOT_MET', 
            message: `Minimum purchase of $${minPurchase.toFixed(2)} required` 
          },
        };
      }

      return {
        valid: true,
        discount: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          type: this.mapDiscountType(coupon.discountType),
          value: this.extractCouponValue(coupon),
        },
      };
    } catch (error: any) {
      logger.error('Failed to validate coupon', { code, error: error.message });
      return {
        valid: false,
        error: { code: 'INVALID_CODE', message: 'Could not validate coupon' },
      };
    }
  }

  private mapDiscountType(wixType: string): 'percentage' | 'fixed_amount' | 'free_shipping' {
    const map: Record<string, 'percentage' | 'fixed_amount' | 'free_shipping'> = {
      'PERCENTAGE': 'percentage',
      'FIXED_AMOUNT': 'fixed_amount',
      'FREE_SHIPPING': 'free_shipping',
      'FIXED': 'fixed_amount',
    };
    return map[wixType] || 'fixed_amount';
  }

  private extractDiscountValue(discount: any): number {
    if (discount.discountType === 'PERCENTAGE') {
      return parseFloat(discount.coupon?.percentageDiscount || '0');
    }
    return parseFloat(discount.amount?.amount || '0');
  }

  private extractCouponValue(coupon: any): number {
    if (coupon.percentageDiscount) {
      return parseFloat(coupon.percentageDiscount);
    }
    return parseFloat(coupon.moneyDiscount?.amount || '0');
  }

  private mapWixErrorToCode(error: any): DiscountErrorCode {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('not found') || message.includes('invalid')) {
      return 'INVALID_CODE';
    }
    if (message.includes('expired')) {
      return 'EXPIRED_CODE';
    }
    if (message.includes('minimum')) {
      return 'MINIMUM_NOT_MET';
    }
    if (message.includes('already')) {
      return 'ALREADY_APPLIED';
    }
    if (message.includes('limit')) {
      return 'USAGE_LIMIT_REACHED';
    }
    
    return 'NOT_APPLICABLE';
  }

  private getErrorMessage(code: DiscountErrorCode): string {
    const messages: Record<DiscountErrorCode, string> = {
      'INVALID_CODE': 'Invalid coupon code',
      'EXPIRED_CODE': 'This coupon has expired',
      'MINIMUM_NOT_MET': 'Cart total does not meet minimum purchase requirement',
      'ALREADY_APPLIED': 'This coupon is already applied',
      'NOT_APPLICABLE': 'This coupon cannot be applied to your cart',
      'USAGE_LIMIT_REACHED': 'This coupon has reached its usage limit',
    };
    return messages[code];
  }
}
```

### 3. Add Discount Endpoints (src/routes/ucp.routes.ts)

```typescript
import { DiscountService } from '../services/discounts/discount.service.js';

/**
 * Apply discount code to checkout
 * POST /ucp/checkout/:id/discounts
 */
router.post('/ucp/checkout/:id/discounts', async (req: Request, res: Response) => {
  try {
    const { id: checkoutId } = req.params;
    const { code } = req.body;
    
    if (!code) {
      return sendError(res, 400, 'Discount code is required', 'INVALID_REQUEST');
    }
    
    logger.info('UCP: Applying discount', { checkoutId, code });

    const client = getWixSdkClient();
    const discountService = new DiscountService(client);
    
    const result = await discountService.applyCoupon(checkoutId, code);
    
    if (!result.success) {
      return res.status(400).json({
        applied: false,
        error: result.error,
      });
    }
    
    // Get updated checkout
    const checkoutResponse = await client.get(`/ecom/v1/checkouts/${checkoutId}`);
    const checkout = checkoutResponse.checkout;
    
    res.json({
      applied: true,
      discount: result.discount,
      checkout: {
        id: checkout._id,
        totals: {
          subtotal: checkout.priceSummary?.subtotal,
          discount: checkout.priceSummary?.discount,
          total: checkout.priceSummary?.total,
        },
        appliedDiscounts: checkout.appliedDiscounts?.map((d: any) => ({
          code: d.coupon?.code,
          name: d.coupon?.name,
          amount: d.amount,
        })),
      },
    });
  } catch (error: any) {
    logger.error('UCP: Failed to apply discount', { error: error.message });
    sendError(res, 500, 'Failed to apply discount', 'DISCOUNT_ERROR');
  }
});

/**
 * Remove discount from checkout
 * DELETE /ucp/checkout/:id/discounts/:code
 */
router.delete('/ucp/checkout/:id/discounts/:code', async (req: Request, res: Response) => {
  try {
    const { id: checkoutId, code } = req.params;
    
    logger.info('UCP: Removing discount', { checkoutId, code });

    const client = getWixSdkClient();
    const discountService = new DiscountService(client);
    
    const removed = await discountService.removeCoupon(checkoutId, code);
    
    if (!removed) {
      return sendError(res, 404, 'Discount not found or already removed', 'NOT_FOUND');
    }
    
    // Get updated checkout
    const checkoutResponse = await client.get(`/ecom/v1/checkouts/${checkoutId}`);
    const checkout = checkoutResponse.checkout;
    
    res.json({
      removed: true,
      checkout: {
        id: checkout._id,
        totals: {
          subtotal: checkout.priceSummary?.subtotal,
          discount: checkout.priceSummary?.discount,
          total: checkout.priceSummary?.total,
        },
        appliedDiscounts: checkout.appliedDiscounts || [],
      },
    });
  } catch (error: any) {
    logger.error('UCP: Failed to remove discount', { error: error.message });
    sendError(res, 500, 'Failed to remove discount', 'DISCOUNT_ERROR');
  }
});

/**
 * Validate discount code (without applying)
 * POST /ucp/discounts/validate
 */
router.post('/ucp/discounts/validate', async (req: Request, res: Response) => {
  try {
    const { code, cartTotal } = req.body;
    
    if (!code) {
      return sendError(res, 400, 'Discount code is required', 'INVALID_REQUEST');
    }
    
    logger.info('UCP: Validating discount', { code });

    const client = getWixSdkClient();
    const discountService = new DiscountService(client);
    
    const result = await discountService.validateCoupon(code, cartTotal);
    
    res.json(result);
  } catch (error: any) {
    logger.error('UCP: Failed to validate discount', { error: error.message });
    sendError(res, 500, 'Failed to validate discount', 'DISCOUNT_ERROR');
  }
});
```

### 4. Update Checkout Response to Include Discounts

Ensure discounts appear in checkout responses:

```typescript
// In checkout response builder
function buildCheckoutResponse(checkout: any): UCPCheckout {
  return {
    id: checkout._id,
    // ... other fields
    totals: {
      subtotal: {
        amount: parseFloat(checkout.priceSummary?.subtotal?.amount || '0'),
        currency: checkout.currency || 'USD',
        formatted: checkout.priceSummary?.subtotal?.formattedAmount || '$0.00',
      },
      discount: checkout.priceSummary?.discount ? {
        amount: parseFloat(checkout.priceSummary.discount.amount || '0'),
        currency: checkout.currency || 'USD',
        formatted: checkout.priceSummary.discount.formattedAmount || '$0.00',
      } : undefined,
      total: {
        amount: parseFloat(checkout.priceSummary?.total?.amount || '0'),
        currency: checkout.currency || 'USD',
        formatted: checkout.priceSummary?.total?.formattedAmount || '$0.00',
      },
      itemCount: checkout.lineItems?.length || 0,
    },
    appliedDiscounts: (checkout.appliedDiscounts || []).map((d: any) => ({
      id: d.coupon?.id || d._id,
      code: d.coupon?.code,
      name: d.coupon?.name || 'Discount',
      type: d.discountType?.toLowerCase() || 'fixed_amount',
      appliedAmount: {
        amount: parseFloat(d.amount?.amount || '0'),
        currency: checkout.currency || 'USD',
        formatted: d.amount?.formattedAmount || '$0.00',
      },
    })),
  };
}
```

### 5. Update Discovery

```typescript
const discovery: UCPDiscovery = {
  // ... existing fields
  capabilities: [
    'catalog_search', 
    'product_details', 
    'cart_management', 
    'checkout',
    'orders',
    'fulfillment',
    'discounts',  // ADD THIS
  ],
  extensions: {
    // ... existing extensions
    discounts: {
      supported_types: ['percentage', 'fixed_amount', 'free_shipping'],
      apply_endpoint: `${baseUrl}/ucp/checkout/{checkoutId}/discounts`,
      validate_endpoint: `${baseUrl}/ucp/discounts/validate`,
    },
  },
};
```

---

## API Reference

### Apply Discount
```
POST /ucp/checkout/:checkoutId/discounts
Content-Type: application/json

{
  "code": "SAVE10"
}

Response 200 (Success):
{
  "applied": true,
  "discount": {
    "id": "coupon-123",
    "code": "SAVE10",
    "name": "10% Off",
    "type": "percentage",
    "value": 10,
    "appliedAmount": {
      "amount": 4.00,
      "currency": "USD",
      "formatted": "$4.00"
    }
  },
  "checkout": {
    "id": "checkout-456",
    "totals": {
      "subtotal": { "amount": 40.00, "formatted": "$40.00" },
      "discount": { "amount": 4.00, "formatted": "-$4.00" },
      "total": { "amount": 36.00, "formatted": "$36.00" }
    }
  }
}

Response 400 (Error):
{
  "applied": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "Invalid coupon code"
  }
}
```

### Remove Discount
```
DELETE /ucp/checkout/:checkoutId/discounts/:code

Response 200:
{
  "removed": true,
  "checkout": { ... }
}
```

### Validate Discount
```
POST /ucp/discounts/validate
Content-Type: application/json

{
  "code": "SAVE10",
  "cartTotal": 50.00
}

Response 200:
{
  "valid": true,
  "discount": {
    "id": "coupon-123",
    "code": "SAVE10",
    "name": "10% Off",
    "type": "percentage",
    "value": 10
  }
}
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| INVALID_CODE | 400 | Coupon code not found |
| EXPIRED_CODE | 400 | Coupon has expired |
| MINIMUM_NOT_MET | 400 | Cart below minimum purchase |
| ALREADY_APPLIED | 400 | Coupon already on checkout |
| USAGE_LIMIT_REACHED | 400 | Coupon usage limit exceeded |
| NOT_APPLICABLE | 400 | Coupon cannot be applied |
| DISCOUNT_ERROR | 500 | Generic discount error |

---

## Acceptance Criteria

- [ ] POST /ucp/checkout/:id/discounts applies coupon
- [ ] DELETE /ucp/checkout/:id/discounts/:code removes coupon
- [ ] POST /ucp/discounts/validate checks code validity
- [ ] Error codes follow UCP format
- [ ] Checkout totals update after discount applied
- [ ] Discovery includes discounts extension
- [ ] Multiple discounts can be applied (if Wix supports)

---

## Notes

### Wix Coupon Limitations
- Some Wix stores may have limited coupon API access
- Free plan stores may not support coupons
- Check Wix permissions: `WIX_COUPONS.READ_COUPONS`, `WIX_COUPONS.MANAGE_COUPONS`

### Future Enhancements
- Automatic discount suggestions based on cart
- Discount stacking rules
- Time-limited flash sale support
