/**
 * Consent Management Types
 * 
 * GDPR-compliant consent tracking (Phase 14)
 */

import { z } from 'zod';

// ============================================================================
// Consent Types
// ============================================================================

export type ConsentType = 
  | 'marketing'           // Marketing emails/communications
  | 'analytics'           // Analytics and tracking
  | 'personalization'     // Personalized recommendations
  | 'third_party'         // Sharing with third parties
  | 'cookies'             // Cookie usage
  | 'terms'               // Terms of service
  | 'privacy';            // Privacy policy

export type ConsentStatus = 'granted' | 'denied' | 'pending' | 'withdrawn';

// ============================================================================
// Consent Record
// ============================================================================

export interface ConsentRecord {
  id: string;
  
  // Who gave consent
  subjectId: string;           // Email or user ID
  subjectType: 'email' | 'user_id' | 'session';
  
  // What consent was given for
  type: ConsentType;
  status: ConsentStatus;
  
  // When and how consent was given
  grantedAt?: string;
  withdrawnAt?: string;
  expiresAt?: string;
  
  // Audit trail
  source: string;              // e.g., 'checkout_form', 'preferences', 'api'
  ipAddress?: string;
  userAgent?: string;
  
  // Version tracking (for policy updates)
  policyVersion?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Subject Consent (all consents for a subject)
// ============================================================================

export interface SubjectConsent {
  subjectId: string;
  subjectType: 'email' | 'user_id' | 'session';
  consents: Record<ConsentType, ConsentRecord>;
  lastUpdated: string;
}

// ============================================================================
// Grant Consent Request
// ============================================================================

export const GrantConsentRequestSchema = z.object({
  // Who is giving consent
  subjectId: z.string().min(1, 'Subject ID is required'),
  subjectType: z.enum(['email', 'user_id', 'session']).default('email'),
  
  // What consent is being given
  consents: z.array(z.object({
    type: z.enum(['marketing', 'analytics', 'personalization', 'third_party', 'cookies', 'terms', 'privacy']),
    granted: z.boolean(),
  })).min(1, 'At least one consent is required'),
  
  // Source of consent
  source: z.string().default('api'),
  
  // Optional audit data
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  
  // Policy version they're consenting to
  policyVersion: z.string().optional(),
});

export type GrantConsentRequest = z.infer<typeof GrantConsentRequestSchema>;

// ============================================================================
// Grant Consent Response
// ============================================================================

export interface GrantConsentResponse {
  success: boolean;
  consents?: SubjectConsent;
  error?: string;
  errorCode?: string;
}

// ============================================================================
// Withdraw Consent Request
// ============================================================================

export const WithdrawConsentRequestSchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
  type: z.enum(['marketing', 'analytics', 'personalization', 'third_party', 'cookies', 'terms', 'privacy']),
  reason: z.string().optional(),
});

export type WithdrawConsentRequest = z.infer<typeof WithdrawConsentRequestSchema>;

// ============================================================================
// Consent Status Check
// ============================================================================

export interface ConsentCheck {
  subjectId: string;
  type: ConsentType;
  hasConsent: boolean;
  status: ConsentStatus;
  grantedAt?: string;
  expiresAt?: string;
}

// ============================================================================
// GDPR Data Export
// ============================================================================

export interface GDPRExport {
  subjectId: string;
  exportedAt: string;
  data: {
    identity?: unknown;
    consents: SubjectConsent;
    orders?: unknown[];
    activity?: unknown[];
  };
}

// ============================================================================
// GDPR Deletion Request
// ============================================================================

export const GDPRDeletionRequestSchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
  subjectType: z.enum(['email', 'user_id']).default('email'),
  reason: z.string().optional(),
  confirmDeletion: z.literal(true, {
    errorMap: () => ({ message: 'Must confirm deletion' }),
  }),
});

export type GDPRDeletionRequest = z.infer<typeof GDPRDeletionRequestSchema>;

// ============================================================================
// Error Codes
// ============================================================================

export const ConsentErrorCodes = {
  SUBJECT_NOT_FOUND: 'SUBJECT_NOT_FOUND',
  CONSENT_NOT_FOUND: 'CONSENT_NOT_FOUND',
  INVALID_CONSENT_TYPE: 'INVALID_CONSENT_TYPE',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  DELETION_NOT_CONFIRMED: 'DELETION_NOT_CONFIRMED',
} as const;

export type ConsentErrorCode = keyof typeof ConsentErrorCodes;
