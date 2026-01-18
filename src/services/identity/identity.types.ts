/**
 * Identity Linking Types
 * 
 * Types for cross-platform identity management (Phase 14)
 */

import { z } from 'zod';

// ============================================================================
// Linked Identity
// ============================================================================

export interface LinkedIdentity {
  id: string;
  
  // Primary identifier (usually email)
  primaryId: string;
  primaryIdType: 'email' | 'phone' | 'custom';
  
  // Linked platform identities
  platforms: PlatformIdentity[];
  
  // Profile data (merged from platforms)
  profile?: IdentityProfile;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

export interface PlatformIdentity {
  platform: string;       // e.g., 'wix', 'shopify', 'google', 'apple'
  userId: string;         // Platform-specific user ID
  displayName?: string;
  email?: string;
  verified: boolean;
  linkedAt: string;
  lastUsedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface IdentityProfile {
  displayName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  locale?: string;
  timezone?: string;
}

// ============================================================================
// Link Identity Request
// ============================================================================

export const LinkIdentityRequestSchema = z.object({
  // Primary identifier to link to
  primaryId: z.string().min(1, 'Primary ID is required'),
  primaryIdType: z.enum(['email', 'phone', 'custom']).default('email'),
  
  // Platform to link
  platform: z.string().min(1, 'Platform is required'),
  userId: z.string().min(1, 'User ID is required'),
  
  // Optional profile data from platform
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  verified: z.boolean().default(false),
  
  // Additional metadata
  metadata: z.record(z.unknown()).optional(),
});

export type LinkIdentityRequest = z.infer<typeof LinkIdentityRequestSchema>;

// ============================================================================
// Link Identity Response
// ============================================================================

export interface LinkIdentityResponse {
  success: boolean;
  identity?: LinkedIdentity;
  isNew?: boolean;  // True if this created a new linked identity
  error?: string;
  errorCode?: string;
}

// ============================================================================
// Identity Lookup
// ============================================================================

export const IdentityLookupSchema = z.object({
  // Look up by primary ID
  primaryId: z.string().optional(),
  
  // Or look up by platform identity
  platform: z.string().optional(),
  userId: z.string().optional(),
  
  // Or look up by email
  email: z.string().email().optional(),
});

export type IdentityLookup = z.infer<typeof IdentityLookupSchema>;

// ============================================================================
// Unlink Request
// ============================================================================

export const UnlinkIdentityRequestSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  userId: z.string().min(1, 'User ID is required'),
});

export type UnlinkIdentityRequest = z.infer<typeof UnlinkIdentityRequestSchema>;

// ============================================================================
// Error Codes
// ============================================================================

export const IdentityErrorCodes = {
  IDENTITY_NOT_FOUND: 'IDENTITY_NOT_FOUND',
  PLATFORM_ALREADY_LINKED: 'PLATFORM_ALREADY_LINKED',
  PLATFORM_NOT_LINKED: 'PLATFORM_NOT_LINKED',
  INVALID_PRIMARY_ID: 'INVALID_PRIMARY_ID',
  MERGE_CONFLICT: 'MERGE_CONFLICT',
} as const;

export type IdentityErrorCode = keyof typeof IdentityErrorCodes;
