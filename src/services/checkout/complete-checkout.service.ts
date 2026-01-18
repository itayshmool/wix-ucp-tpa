/**
 * Complete Checkout Service
 * 
 * Handles server-side checkout completion (Phase 12)
 * - Validates payment instruments
 * - Processes payments
 * - Creates orders
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import {
  CompleteCheckoutRequest,
  CompleteCheckoutResponse,
  CompleteCheckoutErrorCodes,
  CheckoutState,
} from './complete-checkout.types.js';
import {
  getInstrument,
  validateInstrument,
  useInstrument,
} from '../payment/payment.service.js';

// ============================================================================
// In-Memory Store (for POC - use Redis in production)
// ============================================================================

// Store checkout states
const checkoutStates: Map<string, CheckoutState> = new Map();

// Idempotency cache
const idempotencyCache: Map<string, CompleteCheckoutResponse> = new Map();

// Order counter for generating order numbers
let orderCounter = 1000;

// ============================================================================
// Checkout State Management
// ============================================================================

/**
 * Create or update a checkout state (called when checkout is created)
 */
export function setCheckoutState(checkoutId: string, state: Partial<CheckoutState>): void {
  const existing = checkoutStates.get(checkoutId);
  
  checkoutStates.set(checkoutId, {
    id: checkoutId,
    status: 'created',
    items: [],
    totals: { subtotal: 0, total: 0 },
    currency: 'USD',
    createdAt: new Date(),
    ...existing,
    ...state,
  });
  
  logger.debug('Checkout state updated', { checkoutId });
}

/**
 * Get checkout state
 */
export function getCheckoutState(checkoutId: string): CheckoutState | undefined {
  return checkoutStates.get(checkoutId);
}

/**
 * Check if checkout exists and is valid for completion
 */
function validateCheckoutForCompletion(checkoutId: string): {
  valid: boolean;
  checkout?: CheckoutState;
  error?: string;
  errorCode?: string;
} {
  const checkout = checkoutStates.get(checkoutId);
  
  if (!checkout) {
    // For POC, create a mock checkout if it doesn't exist
    // In production, this would fetch from Wix API
    return {
      valid: true,
      checkout: {
        id: checkoutId,
        status: 'created',
        items: [
          { productId: 'mock-product', name: 'Test Product', quantity: 1, price: 10 }
        ],
        totals: { subtotal: 10, total: 10 },
        currency: 'USD',
        createdAt: new Date(),
      }
    };
  }
  
  if (checkout.status === 'completed') {
    return {
      valid: false,
      error: 'Checkout has already been completed',
      errorCode: CompleteCheckoutErrorCodes.CHECKOUT_ALREADY_COMPLETED,
    };
  }
  
  if (checkout.status === 'expired' || checkout.status === 'cancelled') {
    return {
      valid: false,
      error: `Checkout is ${checkout.status}`,
      errorCode: CompleteCheckoutErrorCodes.CHECKOUT_EXPIRED,
    };
  }
  
  // Check if checkout is older than 24 hours
  const ageMs = Date.now() - checkout.createdAt.getTime();
  if (ageMs > 24 * 60 * 60 * 1000) {
    checkout.status = 'expired';
    return {
      valid: false,
      error: 'Checkout has expired',
      errorCode: CompleteCheckoutErrorCodes.CHECKOUT_EXPIRED,
    };
  }
  
  return { valid: true, checkout };
}

// ============================================================================
// Complete Checkout
// ============================================================================

/**
 * Complete a checkout using a minted payment instrument
 */
export async function completeCheckout(
  checkoutId: string,
  request: CompleteCheckoutRequest
): Promise<CompleteCheckoutResponse> {
  const { instrumentId, idempotencyKey } = request;
  
  logger.info('Completing checkout', { checkoutId, instrumentId });
  
  // Check idempotency
  if (idempotencyKey) {
    const cached = idempotencyCache.get(idempotencyKey);
    if (cached) {
      logger.info('Returning cached response (idempotency)', { idempotencyKey });
      return cached;
    }
  }
  
  try {
    // 1. Validate checkout
    const checkoutValidation = validateCheckoutForCompletion(checkoutId);
    if (!checkoutValidation.valid) {
      return {
        success: false,
        error: checkoutValidation.error,
        errorCode: checkoutValidation.errorCode,
      };
    }
    
    const checkout = checkoutValidation.checkout!;
    
    // 2. Get and validate instrument
    const instrument = getInstrument(instrumentId);
    if (!instrument) {
      return {
        success: false,
        error: 'Payment instrument not found',
        errorCode: CompleteCheckoutErrorCodes.INSTRUMENT_NOT_FOUND,
      };
    }
    
    // 3. Validate instrument matches checkout
    const instrumentValidation = validateInstrument(
      instrumentId,
      checkoutId,
      checkout.totals.total,
      checkout.currency
    );
    
    if (!instrumentValidation.valid) {
      return {
        success: false,
        error: instrumentValidation.error,
        errorCode: instrumentValidation.errorCode as string,
      };
    }
    
    // 4. Process payment (mark instrument as used)
    const paymentProcessed = useInstrument(instrumentId);
    if (!paymentProcessed) {
      return {
        success: false,
        error: 'Failed to process payment',
        errorCode: CompleteCheckoutErrorCodes.PAYMENT_FAILED,
      };
    }
    
    // 5. Create order
    const orderNumber = `ORD-${++orderCounter}`;
    const orderId = `order_${uuidv4()}`;
    const transactionId = `txn_${uuidv4()}`;
    const now = new Date().toISOString();
    
    // Update checkout state
    checkout.status = 'completed';
    checkout.completedAt = new Date();
    checkout.orderId = orderId;
    checkoutStates.set(checkoutId, checkout);
    
    // Build response
    const response: CompleteCheckoutResponse = {
      success: true,
      order: {
        id: orderId,
        number: orderNumber,
        status: 'APPROVED',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'NOT_FULFILLED',
        items: checkout.items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: {
            amount: item.price,
            currency: checkout.currency,
            formatted: `$${item.price.toFixed(2)}`,
          },
        })),
        totals: {
          subtotal: {
            amount: checkout.totals.subtotal,
            currency: checkout.currency,
            formatted: `$${checkout.totals.subtotal.toFixed(2)}`,
          },
          ...(checkout.totals.discount && {
            discount: {
              amount: checkout.totals.discount,
              currency: checkout.currency,
              formatted: `-$${checkout.totals.discount.toFixed(2)}`,
            },
          }),
          ...(checkout.totals.shipping && {
            shipping: {
              amount: checkout.totals.shipping,
              currency: checkout.currency,
              formatted: `$${checkout.totals.shipping.toFixed(2)}`,
            },
          }),
          ...(checkout.totals.tax && {
            tax: {
              amount: checkout.totals.tax,
              currency: checkout.currency,
              formatted: `$${checkout.totals.tax.toFixed(2)}`,
            },
          }),
          total: {
            amount: checkout.totals.total,
            currency: checkout.currency,
            formatted: `$${checkout.totals.total.toFixed(2)}`,
          },
        },
        ...(request.billingAddress && { billingAddress: request.billingAddress as Record<string, string> }),
        ...(request.shippingAddress && { shippingAddress: request.shippingAddress as Record<string, string> }),
        createdAt: now,
      },
      transaction: {
        id: transactionId,
        instrumentId,
        amount: checkout.totals.total,
        currency: checkout.currency,
        status: 'completed',
        processedAt: now,
      },
    };
    
    // Cache response for idempotency
    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, response);
    }
    
    logger.info('Checkout completed successfully', {
      checkoutId,
      orderId,
      orderNumber,
      transactionId,
    });
    
    return response;
    
  } catch (error) {
    logger.error('Failed to complete checkout', {
      checkoutId,
      instrumentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Checkout completion failed',
      errorCode: CompleteCheckoutErrorCodes.ORDER_CREATION_FAILED,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all checkout data (for testing)
 */
export function clearCheckoutData(): void {
  checkoutStates.clear();
  idempotencyCache.clear();
  orderCounter = 1000;
  logger.info('Checkout data cleared');
}

/**
 * Get checkout statistics (for monitoring)
 */
export function getCheckoutStats(): {
  total: number;
  created: number;
  completed: number;
  expired: number;
} {
  let created = 0;
  let completed = 0;
  let expired = 0;
  
  for (const checkout of checkoutStates.values()) {
    if (checkout.status === 'created' || checkout.status === 'pending') {
      created++;
    } else if (checkout.status === 'completed') {
      completed++;
    } else {
      expired++;
    }
  }
  
  return {
    total: checkoutStates.size,
    created,
    completed,
    expired,
  };
}

/**
 * Get order by ID (for order lookup after completion)
 */
export function getCompletedOrder(orderId: string): CompleteCheckoutResponse['order'] | undefined {
  for (const checkout of checkoutStates.values()) {
    if (checkout.orderId === orderId && checkout.status === 'completed') {
      return {
        id: checkout.orderId,
        number: `ORD-${Math.floor(Math.random() * 10000)}`, // Would be stored in real impl
        status: 'APPROVED',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'NOT_FULFILLED',
        items: checkout.items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: {
            amount: item.price,
            currency: checkout.currency,
            formatted: `$${item.price.toFixed(2)}`,
          },
        })),
        totals: {
          subtotal: {
            amount: checkout.totals.subtotal,
            currency: checkout.currency,
            formatted: `$${checkout.totals.subtotal.toFixed(2)}`,
          },
          total: {
            amount: checkout.totals.total,
            currency: checkout.currency,
            formatted: `$${checkout.totals.total.toFixed(2)}`,
          },
        },
        createdAt: checkout.completedAt?.toISOString() || new Date().toISOString(),
      };
    }
  }
  return undefined;
}
