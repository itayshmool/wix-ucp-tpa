/**
 * Identity Linking Service
 * 
 * Manages cross-platform identity linking (Phase 14)
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import {
  LinkedIdentity,
  LinkIdentityRequest,
  LinkIdentityResponse,
  IdentityLookup,
  UnlinkIdentityRequest,
  IdentityErrorCodes,
} from './identity.types.js';

// ============================================================================
// In-Memory Storage (use database in production)
// ============================================================================

// Map of identity ID to LinkedIdentity
const identities: Map<string, LinkedIdentity> = new Map();

// Index: primaryId -> identity ID
const primaryIdIndex: Map<string, string> = new Map();

// Index: platform:userId -> identity ID
const platformIndex: Map<string, string> = new Map();

// ============================================================================
// Identity Linking
// ============================================================================

/**
 * Link a platform identity to a primary ID
 */
export function linkIdentity(request: LinkIdentityRequest): LinkIdentityResponse {
  const { primaryId, primaryIdType, platform, userId, displayName, email, verified, metadata } = request;
  
  logger.info('Identity: Linking identity', { primaryId, platform, userId });
  
  // Check if this platform identity is already linked elsewhere
  const platformKey = `${platform}:${userId}`;
  const existingPlatformIdentityId = platformIndex.get(platformKey);
  
  if (existingPlatformIdentityId) {
    const existingIdentity = identities.get(existingPlatformIdentityId);
    if (existingIdentity && existingIdentity.primaryId !== primaryId) {
      return {
        success: false,
        error: 'Platform identity is already linked to a different primary ID',
        errorCode: IdentityErrorCodes.PLATFORM_ALREADY_LINKED,
      };
    }
  }
  
  // Check if primary ID already has a linked identity
  const existingIdentityId = primaryIdIndex.get(primaryId);
  let identity: LinkedIdentity;
  let isNew = false;
  
  if (existingIdentityId) {
    // Update existing identity
    identity = identities.get(existingIdentityId)!;
    
    // Check if platform is already linked
    const existingPlatform = identity.platforms.find(p => p.platform === platform);
    if (existingPlatform) {
      // Update existing platform link
      existingPlatform.userId = userId;
      existingPlatform.displayName = displayName || existingPlatform.displayName;
      existingPlatform.email = email || existingPlatform.email;
      existingPlatform.verified = verified;
      existingPlatform.lastUsedAt = new Date().toISOString();
      existingPlatform.metadata = metadata || existingPlatform.metadata;
    } else {
      // Add new platform link
      identity.platforms.push({
        platform,
        userId,
        displayName,
        email,
        verified,
        linkedAt: new Date().toISOString(),
        metadata,
      });
    }
    
    identity.updatedAt = new Date().toISOString();
    identity.lastActiveAt = new Date().toISOString();
    
  } else {
    // Create new linked identity
    isNew = true;
    const now = new Date().toISOString();
    
    identity = {
      id: `identity_${uuidv4()}`,
      primaryId,
      primaryIdType,
      platforms: [{
        platform,
        userId,
        displayName,
        email,
        verified,
        linkedAt: now,
        metadata,
      }],
      profile: {
        displayName,
        email: email || (primaryIdType === 'email' ? primaryId : undefined),
      },
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    };
    
    // Store and index
    identities.set(identity.id, identity);
    primaryIdIndex.set(primaryId, identity.id);
  }
  
  // Update platform index
  platformIndex.set(platformKey, identity.id);
  
  logger.info('Identity: Link successful', { identityId: identity.id, isNew });
  
  return {
    success: true,
    identity,
    isNew,
  };
}

/**
 * Get an identity by lookup criteria
 */
export function getIdentity(lookup: IdentityLookup): LinkedIdentity | undefined {
  // Lookup by primary ID
  if (lookup.primaryId) {
    const identityId = primaryIdIndex.get(lookup.primaryId);
    if (identityId) {
      return identities.get(identityId);
    }
  }
  
  // Lookup by platform identity
  if (lookup.platform && lookup.userId) {
    const platformKey = `${lookup.platform}:${lookup.userId}`;
    const identityId = platformIndex.get(platformKey);
    if (identityId) {
      return identities.get(identityId);
    }
  }
  
  // Lookup by email (search through all identities)
  if (lookup.email) {
    for (const identity of identities.values()) {
      if (identity.primaryIdType === 'email' && identity.primaryId === lookup.email) {
        return identity;
      }
      if (identity.profile?.email === lookup.email) {
        return identity;
      }
      for (const platform of identity.platforms) {
        if (platform.email === lookup.email) {
          return identity;
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Get identity by platform
 */
export function getIdentityByPlatform(platform: string, userId: string): LinkedIdentity | undefined {
  const platformKey = `${platform}:${userId}`;
  const identityId = platformIndex.get(platformKey);
  if (identityId) {
    return identities.get(identityId);
  }
  return undefined;
}

/**
 * Unlink a platform from an identity
 */
export function unlinkPlatform(
  primaryId: string,
  request: UnlinkIdentityRequest
): LinkIdentityResponse {
  const { platform, userId } = request;
  
  logger.info('Identity: Unlinking platform', { primaryId, platform, userId });
  
  // Get the identity
  const identityId = primaryIdIndex.get(primaryId);
  if (!identityId) {
    return {
      success: false,
      error: 'Identity not found',
      errorCode: IdentityErrorCodes.IDENTITY_NOT_FOUND,
    };
  }
  
  const identity = identities.get(identityId)!;
  
  // Find and remove the platform
  const platformIndex_local = identity.platforms.findIndex(
    p => p.platform === platform && p.userId === userId
  );
  
  if (platformIndex_local === -1) {
    return {
      success: false,
      error: 'Platform not linked to this identity',
      errorCode: IdentityErrorCodes.PLATFORM_NOT_LINKED,
    };
  }
  
  // Remove platform
  identity.platforms.splice(platformIndex_local, 1);
  identity.updatedAt = new Date().toISOString();
  
  // Remove from platform index
  const platformKey = `${platform}:${userId}`;
  platformIndex.delete(platformKey);
  
  logger.info('Identity: Platform unlinked', { identityId, platform });
  
  return {
    success: true,
    identity,
  };
}

/**
 * Delete an entire identity
 */
export function deleteIdentity(primaryId: string): boolean {
  const identityId = primaryIdIndex.get(primaryId);
  if (!identityId) {
    return false;
  }
  
  const identity = identities.get(identityId);
  if (identity) {
    // Remove all platform indexes
    for (const platform of identity.platforms) {
      const platformKey = `${platform.platform}:${platform.userId}`;
      platformIndex.delete(platformKey);
    }
  }
  
  // Remove identity
  identities.delete(identityId);
  primaryIdIndex.delete(primaryId);
  
  logger.info('Identity: Deleted', { identityId, primaryId });
  
  return true;
}

/**
 * List all identities (for admin/testing)
 */
export function listIdentities(): LinkedIdentity[] {
  return Array.from(identities.values());
}

/**
 * Update last active timestamp
 */
export function touchIdentity(primaryId: string): void {
  const identityId = primaryIdIndex.get(primaryId);
  if (identityId) {
    const identity = identities.get(identityId);
    if (identity) {
      identity.lastActiveAt = new Date().toISOString();
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all identity data (for testing)
 */
export function clearIdentityData(): void {
  identities.clear();
  primaryIdIndex.clear();
  platformIndex.clear();
  logger.info('Identity: Data cleared');
}

/**
 * Get identity statistics
 */
export function getIdentityStats(): {
  total: number;
  byPlatform: Record<string, number>;
} {
  const byPlatform: Record<string, number> = {};
  
  for (const identity of identities.values()) {
    for (const platform of identity.platforms) {
      byPlatform[platform.platform] = (byPlatform[platform.platform] || 0) + 1;
    }
  }
  
  return {
    total: identities.size,
    byPlatform,
  };
}
