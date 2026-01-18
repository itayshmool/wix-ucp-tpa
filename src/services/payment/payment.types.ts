/**
 * UCP Payment Handler Types
 * 
 * Types for the UCP Payment Handlers that enable
 * credential minting and payment processing.
 */

import { z } from 'zod';

// ============================================================================
// Payment Handler Identifiers
// ============================================================================

export const PaymentHandlerIdSchema = z.enum([
  'com.wix.checkout.v1',      // Wix Hosted Checkout (redirect)
  'com.google.pay',           // Google Pay
  'com.apple.pay',            // Apple Pay
  'com.shopify.shop_pay',     // Shop Pay
  'com.ucp.sandbox',          // Sandbox (for testing)
]);

export type PaymentHandlerId = z.infer<typeof PaymentHandlerIdSchema>;

// ============================================================================
// Payment Handler Capability
// ============================================================================

export const PaymentCapabilitySchema = z.enum([
  'tokenization',        // Can mint payment tokens
  'redirect',            // Redirect-based checkout
  'direct',              // Direct payment processing
  'subscription',        // Supports recurring payments
  'refund',              // Supports refunds
  'partial_capture',     // Supports partial captures
]);

export type PaymentCapability = z.infer<typeof PaymentCapabilitySchema>;

// ============================================================================
// Payment Handler Configuration
// ============================================================================

export interface PaymentHandler {
  id: PaymentHandlerId;
  name: string;
  description: string;
  capabilities: PaymentCapability[];
  supportedCurrencies: string[];
  supportedCountries: string[];
  logoUrl?: string;
  enabled: boolean;
  // Configuration for the handler
  config?: Record<string, unknown>;
}

// ============================================================================
// Mint Instrument Request
// ============================================================================

export const MintInstrumentRequestSchema = z.object({
  // The payment handler to use
  handlerId: PaymentHandlerIdSchema,
  
  // Payment details
  amount: z.number().positive(),
  currency: z.string().length(3),
  
  // Billing information (optional for some handlers)
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
  
  // Handler-specific data (e.g., Google Pay token)
  paymentData: z.record(z.unknown()).optional(),
  
  // Idempotency key to prevent duplicate minting
  idempotencyKey: z.string().optional(),
});

export type MintInstrumentRequest = z.infer<typeof MintInstrumentRequestSchema>;

// ============================================================================
// Minted Instrument (Payment Credential)
// ============================================================================

export const InstrumentTypeSchema = z.enum([
  'card',           // Credit/debit card token
  'wallet',         // Digital wallet (Google Pay, Apple Pay)
  'bank_transfer',  // Bank/ACH transfer
  'redirect',       // Redirect URL (hosted checkout)
  'sandbox',        // Sandbox test token
]);

export type InstrumentType = z.infer<typeof InstrumentTypeSchema>;

export const MintedInstrumentSchema = z.object({
  // Unique instrument ID
  id: z.string(),
  
  // The handler that minted this instrument
  handlerId: PaymentHandlerIdSchema,
  
  // Type of instrument
  type: InstrumentTypeSchema,
  
  // The tokenized credential (never contains raw card data)
  token: z.string(),
  
  // Display information (safe to show user)
  display: z.object({
    brand: z.string().optional(),      // e.g., "Visa", "Mastercard"
    last4: z.string().optional(),      // Last 4 digits
    expiryMonth: z.number().optional(),
    expiryYear: z.number().optional(),
    walletType: z.string().optional(), // e.g., "Google Pay"
  }).optional(),
  
  // Amount this instrument is authorized for
  amount: z.number(),
  currency: z.string(),
  
  // Expiration (instruments are short-lived)
  expiresAt: z.string().datetime(),
  
  // Status
  status: z.enum(['active', 'used', 'expired', 'cancelled']),
  
  // For redirect-based handlers
  redirectUrl: z.string().url().optional(),
  
  // Metadata
  createdAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export type MintedInstrument = z.infer<typeof MintedInstrumentSchema>;

// ============================================================================
// Mint Instrument Response
// ============================================================================

export const MintInstrumentResponseSchema = z.object({
  success: z.boolean(),
  instrument: MintedInstrumentSchema.optional(),
  error: z.string().optional(),
  errorCode: z.string().optional(),
});

export type MintInstrumentResponse = z.infer<typeof MintInstrumentResponseSchema>;

// ============================================================================
// Payment Handler List Response
// ============================================================================

export interface PaymentHandlerListResponse {
  handlers: PaymentHandler[];
  defaultHandler: PaymentHandlerId;
}

// ============================================================================
// Error Codes
// ============================================================================

export const PaymentErrorCodes = {
  HANDLER_NOT_FOUND: 'HANDLER_NOT_FOUND',
  HANDLER_DISABLED: 'HANDLER_DISABLED',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  UNSUPPORTED_CURRENCY: 'UNSUPPORTED_CURRENCY',
  UNSUPPORTED_COUNTRY: 'UNSUPPORTED_COUNTRY',
  INVALID_PAYMENT_DATA: 'INVALID_PAYMENT_DATA',
  TOKENIZATION_FAILED: 'TOKENIZATION_FAILED',
  INSTRUMENT_EXPIRED: 'INSTRUMENT_EXPIRED',
  INSTRUMENT_ALREADY_USED: 'INSTRUMENT_ALREADY_USED',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
} as const;

export type PaymentErrorCode = keyof typeof PaymentErrorCodes;

// ============================================================================
// Instrument Validation Request
// ============================================================================

export const ValidateInstrumentRequestSchema = z.object({
  instrumentId: z.string(),
  checkoutId: z.string(),
});

export type ValidateInstrumentRequest = z.infer<typeof ValidateInstrumentRequestSchema>;

// ============================================================================
// Sandbox Test Cards
// ============================================================================

export const SandboxTestCards = {
  SUCCESS: '4242424242424242',
  DECLINE: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  EXPIRED: '4000000000000069',
  PROCESSING_ERROR: '4000000000000119',
} as const;
