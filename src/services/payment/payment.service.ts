/**
 * Payment Handler Service
 * 
 * Manages payment handlers and credential minting
 * for the UCP Payment Handlers extension.
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import {
  PaymentHandler,
  PaymentHandlerId,
  PaymentHandlerListResponse,
  MintInstrumentRequest,
  MintInstrumentResponse,
  MintedInstrument,
  PaymentErrorCodes,
  SandboxTestCards,
} from './payment.types.js';

// ============================================================================
// Payment Handler Registry
// ============================================================================

const paymentHandlers: Map<PaymentHandlerId, PaymentHandler> = new Map([
  ['com.wix.checkout.v1', {
    id: 'com.wix.checkout.v1',
    name: 'Wix Hosted Checkout',
    description: 'Redirect to Wix secure checkout page',
    capabilities: ['redirect'],
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'ILS', 'CAD', 'AUD'],
    supportedCountries: ['US', 'CA', 'GB', 'DE', 'FR', 'IL', 'AU'],
    logoUrl: 'https://www.wix.com/favicon.ico',
    enabled: true,
  }],
  ['com.google.pay', {
    id: 'com.google.pay',
    name: 'Google Pay',
    description: 'Pay with Google Pay wallet',
    capabilities: ['tokenization', 'direct'],
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
    supportedCountries: ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP'],
    logoUrl: 'https://pay.google.com/about/static/images/social/knowledge_graph_logo.png',
    enabled: false, // Requires merchant setup
  }],
  ['com.apple.pay', {
    id: 'com.apple.pay',
    name: 'Apple Pay',
    description: 'Pay with Apple Pay wallet',
    capabilities: ['tokenization', 'direct'],
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
    supportedCountries: ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP'],
    logoUrl: 'https://www.apple.com/v/apple-pay/o/images/overview/og_image__gnwv4mjs6nua_large.png',
    enabled: false, // Requires merchant setup
  }],
  ['com.ucp.sandbox', {
    id: 'com.ucp.sandbox',
    name: 'Sandbox (Test)',
    description: 'Test payment handler for development',
    capabilities: ['tokenization', 'direct', 'refund'],
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
    supportedCountries: ['US', 'CA', 'GB', 'DE', 'FR'],
    enabled: true,
  }],
]);

// Store minted instruments (in production, use Redis with TTL)
const mintedInstruments: Map<string, MintedInstrument> = new Map();

// Idempotency cache (prevent duplicate minting)
const idempotencyCache: Map<string, string> = new Map();

// ============================================================================
// Handler Management
// ============================================================================

/**
 * Get all available payment handlers
 */
export function getPaymentHandlers(enabledOnly: boolean = true): PaymentHandlerListResponse {
  const handlers = Array.from(paymentHandlers.values())
    .filter(h => !enabledOnly || h.enabled);

  return {
    handlers,
    defaultHandler: 'com.wix.checkout.v1',
  };
}

/**
 * Get a specific payment handler
 */
export function getPaymentHandler(id: PaymentHandlerId): PaymentHandler | undefined {
  return paymentHandlers.get(id);
}

/**
 * Check if a handler supports a currency
 */
export function handlerSupportsCurrency(handlerId: PaymentHandlerId, currency: string): boolean {
  const handler = paymentHandlers.get(handlerId);
  return handler?.supportedCurrencies.includes(currency.toUpperCase()) ?? false;
}

/**
 * Check if a handler supports a country
 */
export function handlerSupportsCountry(handlerId: PaymentHandlerId, country: string): boolean {
  const handler = paymentHandlers.get(handlerId);
  return handler?.supportedCountries.includes(country.toUpperCase()) ?? false;
}

// ============================================================================
// Mint Instrument
// ============================================================================

/**
 * Mint a payment instrument (tokenize payment credentials)
 */
export async function mintInstrument(
  checkoutId: string,
  request: MintInstrumentRequest
): Promise<MintInstrumentResponse> {
  const { handlerId, amount, currency, paymentData, idempotencyKey } = request;

  logger.info('Minting payment instrument', {
    checkoutId,
    handlerId,
    amount,
    currency,
  });

  // Check idempotency
  if (idempotencyKey) {
    const existingInstrumentId = idempotencyCache.get(idempotencyKey);
    if (existingInstrumentId) {
      const existingInstrument = mintedInstruments.get(existingInstrumentId);
      if (existingInstrument) {
        logger.info('Returning existing instrument (idempotency)', { 
          instrumentId: existingInstrumentId 
        });
        return { success: true, instrument: existingInstrument };
      }
    }
  }

  // Validate handler
  const handler = paymentHandlers.get(handlerId);
  if (!handler) {
    return {
      success: false,
      error: `Payment handler '${handlerId}' not found`,
      errorCode: PaymentErrorCodes.HANDLER_NOT_FOUND,
    };
  }

  if (!handler.enabled) {
    return {
      success: false,
      error: `Payment handler '${handlerId}' is not enabled`,
      errorCode: PaymentErrorCodes.HANDLER_DISABLED,
    };
  }

  // Validate currency
  if (!handler.supportedCurrencies.includes(currency.toUpperCase())) {
    return {
      success: false,
      error: `Currency '${currency}' not supported by ${handler.name}`,
      errorCode: PaymentErrorCodes.UNSUPPORTED_CURRENCY,
    };
  }

  // Validate amount
  if (amount <= 0) {
    return {
      success: false,
      error: 'Amount must be greater than zero',
      errorCode: PaymentErrorCodes.INVALID_AMOUNT,
    };
  }

  // Route to appropriate handler
  let instrument: MintedInstrument;

  try {
    switch (handlerId) {
      case 'com.ucp.sandbox':
        instrument = await mintSandboxInstrument(checkoutId, amount, currency, paymentData);
        break;
      
      case 'com.wix.checkout.v1':
        instrument = await mintWixRedirectInstrument(checkoutId, amount, currency);
        break;
      
      case 'com.google.pay':
        instrument = await mintGooglePayInstrument(checkoutId, amount, currency, paymentData);
        break;
      
      default:
        return {
          success: false,
          error: `Handler '${handlerId}' does not support minting`,
          errorCode: PaymentErrorCodes.TOKENIZATION_FAILED,
        };
    }

    // Store instrument
    mintedInstruments.set(instrument.id, instrument);

    // Store idempotency mapping
    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, instrument.id);
    }

    logger.info('Instrument minted successfully', {
      instrumentId: instrument.id,
      type: instrument.type,
      handlerId,
    });

    return { success: true, instrument };

  } catch (error) {
    logger.error('Failed to mint instrument', {
      handlerId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tokenization failed',
      errorCode: PaymentErrorCodes.TOKENIZATION_FAILED,
    };
  }
}

// ============================================================================
// Handler-Specific Minting
// ============================================================================

/**
 * Mint a sandbox test instrument
 */
async function mintSandboxInstrument(
  checkoutId: string,
  amount: number,
  currency: string,
  paymentData?: Record<string, unknown>
): Promise<MintedInstrument> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100));

  const cardNumber = (paymentData?.cardNumber as string) || SandboxTestCards.SUCCESS;
  const last4 = cardNumber.slice(-4);

  // Check for test card scenarios
  if (cardNumber === SandboxTestCards.DECLINE) {
    throw new Error('Card declined');
  }
  if (cardNumber === SandboxTestCards.INSUFFICIENT_FUNDS) {
    throw new Error('Insufficient funds');
  }
  if (cardNumber === SandboxTestCards.EXPIRED) {
    throw new Error('Card expired');
  }
  if (cardNumber === SandboxTestCards.PROCESSING_ERROR) {
    throw new Error('Processing error');
  }

  // Determine card brand from number
  let brand = 'Unknown';
  if (cardNumber.startsWith('4')) brand = 'Visa';
  else if (cardNumber.startsWith('5')) brand = 'Mastercard';
  else if (cardNumber.startsWith('3')) brand = 'Amex';

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

  return {
    id: `inst_sandbox_${uuidv4()}`,
    handlerId: 'com.ucp.sandbox',
    type: 'sandbox',
    token: `tok_sandbox_${uuidv4()}`,
    display: {
      brand,
      last4,
      expiryMonth: 12,
      expiryYear: 2030,
    },
    amount,
    currency: currency.toUpperCase(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
    createdAt: now.toISOString(),
    metadata: {
      checkoutId,
      sandbox: true,
      testCard: cardNumber === SandboxTestCards.SUCCESS ? 'success' : 'custom',
    },
  };
}

/**
 * Mint a Wix redirect instrument
 */
async function mintWixRedirectInstrument(
  checkoutId: string,
  amount: number,
  currency: string
): Promise<MintedInstrument> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

  // In production, this would call Wix API to get the checkout URL
  const redirectUrl = `https://www.wix.com/checkout/${checkoutId}`;

  return {
    id: `inst_wix_${uuidv4()}`,
    handlerId: 'com.wix.checkout.v1',
    type: 'redirect',
    token: `tok_wix_redirect_${checkoutId}`,
    amount,
    currency: currency.toUpperCase(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
    redirectUrl,
    createdAt: now.toISOString(),
    metadata: {
      checkoutId,
      requiresRedirect: true,
    },
  };
}

/**
 * Mint a Google Pay instrument
 */
async function mintGooglePayInstrument(
  checkoutId: string,
  amount: number,
  currency: string,
  paymentData?: Record<string, unknown>
): Promise<MintedInstrument> {
  // Validate Google Pay token is provided
  if (!paymentData?.googlePayToken) {
    throw new Error('Google Pay token is required');
  }

  const googlePayToken = paymentData.googlePayToken as string;
  
  // In production, this would:
  // 1. Decrypt the Google Pay token
  // 2. Extract card details
  // 3. Create a payment token with your PSP

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

  return {
    id: `inst_gpay_${uuidv4()}`,
    handlerId: 'com.google.pay',
    type: 'wallet',
    token: `tok_gpay_${uuidv4()}`,
    display: {
      walletType: 'Google Pay',
      brand: (paymentData.cardNetwork as string) || 'Visa',
      last4: (paymentData.last4 as string) || '****',
    },
    amount,
    currency: currency.toUpperCase(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
    createdAt: now.toISOString(),
    metadata: {
      checkoutId,
      googlePayToken: googlePayToken.substring(0, 20) + '...', // Truncated for logs
    },
  };
}

// ============================================================================
// Instrument Management
// ============================================================================

/**
 * Get a minted instrument by ID
 */
export function getInstrument(instrumentId: string): MintedInstrument | undefined {
  return mintedInstruments.get(instrumentId);
}

/**
 * Validate an instrument can be used for a checkout
 */
export function validateInstrument(
  instrumentId: string,
  _checkoutId: string,  // Reserved for future checkout-instrument binding validation
  amount: number,
  currency: string
): { valid: boolean; error?: string; errorCode?: string } {
  const instrument = mintedInstruments.get(instrumentId);

  if (!instrument) {
    return {
      valid: false,
      error: 'Instrument not found',
      errorCode: PaymentErrorCodes.HANDLER_NOT_FOUND,
    };
  }

  // Check expiration
  if (new Date(instrument.expiresAt) < new Date()) {
    return {
      valid: false,
      error: 'Instrument has expired',
      errorCode: PaymentErrorCodes.INSTRUMENT_EXPIRED,
    };
  }

  // Check status
  if (instrument.status !== 'active') {
    return {
      valid: false,
      error: `Instrument is ${instrument.status}`,
      errorCode: PaymentErrorCodes.INSTRUMENT_ALREADY_USED,
    };
  }

  // Check amount matches
  if (instrument.amount !== amount) {
    return {
      valid: false,
      error: `Instrument amount (${instrument.amount}) does not match checkout amount (${amount})`,
      errorCode: PaymentErrorCodes.INVALID_AMOUNT,
    };
  }

  // Check currency matches
  if (instrument.currency !== currency.toUpperCase()) {
    return {
      valid: false,
      error: `Instrument currency (${instrument.currency}) does not match checkout currency (${currency})`,
      errorCode: PaymentErrorCodes.UNSUPPORTED_CURRENCY,
    };
  }

  return { valid: true };
}

/**
 * Mark an instrument as used
 */
export function useInstrument(instrumentId: string): boolean {
  const instrument = mintedInstruments.get(instrumentId);
  if (!instrument || instrument.status !== 'active') {
    return false;
  }

  instrument.status = 'used';
  mintedInstruments.set(instrumentId, instrument);
  
  logger.info('Instrument marked as used', { instrumentId });
  return true;
}

/**
 * Cancel an instrument
 */
export function cancelInstrument(instrumentId: string): boolean {
  const instrument = mintedInstruments.get(instrumentId);
  if (!instrument) {
    return false;
  }

  instrument.status = 'cancelled';
  mintedInstruments.set(instrumentId, instrument);
  
  logger.info('Instrument cancelled', { instrumentId });
  return true;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all instruments and caches (for testing)
 */
export function clearPaymentData(): void {
  mintedInstruments.clear();
  idempotencyCache.clear();
  logger.info('Payment data cleared');
}

/**
 * Get instrument count (for monitoring)
 */
export function getInstrumentCount(): { total: number; active: number; used: number; expired: number } {
  let active = 0;
  let used = 0;
  let expired = 0;

  for (const instrument of mintedInstruments.values()) {
    if (instrument.status === 'active') {
      if (new Date(instrument.expiresAt) < new Date()) {
        expired++;
      } else {
        active++;
      }
    } else if (instrument.status === 'used') {
      used++;
    }
  }

  return {
    total: mintedInstruments.size,
    active,
    used,
    expired,
  };
}
