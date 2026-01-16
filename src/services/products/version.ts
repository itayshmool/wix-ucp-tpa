/**
 * Catalog Version Detection
 * 
 * Detects which Wix Catalog API version is available for a given instance.
 * Wix is migrating from V1 to V3, so we need to support both.
 * 
 * Results are cached per instance to avoid repeated API calls.
 */

import { CatalogVersion } from '../types/product.types.js';
import { WixApiClient } from '../../wix/client.js';
import { logger } from '../../utils/logger.js';

/**
 * Version cache: instanceId -> CatalogVersion
 * TODO: Move to persistent storage in Phase 2.2+
 */
const versionCache = new Map<string, CatalogVersion>();

/**
 * Detect catalog version for a given instance
 * 
 * @param client - Authenticated Wix API client
 * @param instanceId - Instance ID (for caching)
 * @returns Catalog version ('V1' or 'V3')
 */
export async function detectCatalogVersion(
  client: WixApiClient,
  instanceId: string
): Promise<CatalogVersion> {
  // Check cache first
  const cached = versionCache.get(instanceId);
  if (cached) {
    logger.debug('Using cached catalog version', { instanceId, version: cached });
    return cached;
  }

  logger.info('Detecting catalog version', { instanceId });

  try {
    // Try V3 first (newer API)
    await client.get('/stores/v3/products?limit=1');
    
    logger.info('Catalog V3 detected', { instanceId });
    versionCache.set(instanceId, 'V3');
    return 'V3';
  } catch (v3Error) {
    logger.debug('V3 not available, trying V1', {
      instanceId,
      error: v3Error instanceof Error ? v3Error.message : 'Unknown',
    });

    try {
      // Fall back to V1
      await client.post('/stores/v1/products/query', { query: { limit: 1 } });
      
      logger.info('Catalog V1 detected', { instanceId });
      versionCache.set(instanceId, 'V1');
      return 'V1';
    } catch (v1Error) {
      logger.error('Neither V1 nor V3 catalog available', {
        instanceId,
        v3Error: v3Error instanceof Error ? v3Error.message : 'Unknown',
        v1Error: v1Error instanceof Error ? v1Error.message : 'Unknown',
      });
      
      // Default to V1 for backward compatibility
      logger.warn('Defaulting to V1', { instanceId });
      versionCache.set(instanceId, 'V1');
      return 'V1';
    }
  }
}

/**
 * Clear version cache for an instance (useful after API changes)
 */
export function clearVersionCache(instanceId: string): void {
  versionCache.delete(instanceId);
  logger.debug('Version cache cleared', { instanceId });
}

/**
 * Clear all version cache (for testing)
 */
export function clearAllVersionCache(): void {
  const count = versionCache.size;
  versionCache.clear();
  logger.debug('All version cache cleared', { count });
}
