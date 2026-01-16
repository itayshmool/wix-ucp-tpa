/**
 * Instance Store
 * 
 * In-memory storage for Wix app instances (OAuth tokens and metadata).
 * 
 * TODO: Replace with persistent database (PostgreSQL/MongoDB) in Phase 2
 * TODO: Add token encryption at rest
 * TODO: Implement token expiration and refresh logic
 */

import { WixInstance } from '../wix/types.js';
import { logger } from '../utils/logger.js';

/**
 * In-memory store for app instances
 * Map: instanceId -> WixInstance
 */
class InstanceStore {
  private instances: Map<string, WixInstance> = new Map();

  /**
   * Save or update an instance
   */
  save(instanceId: string, instance: WixInstance): void {
    this.instances.set(instanceId, {
      ...instance,
      instanceId, // Ensure instanceId is set
    });
    logger.info('Instance saved', { instanceId, hasTokens: !!(instance.accessToken && instance.refreshToken) });
  }

  /**
   * Get an instance by ID
   */
  get(instanceId: string): WixInstance | undefined {
    const instance = this.instances.get(instanceId);
    if (instance) {
      logger.debug('Instance retrieved', { instanceId });
    } else {
      logger.debug('Instance not found', { instanceId });
    }
    return instance;
  }

  /**
   * Delete an instance
   */
  delete(instanceId: string): boolean {
    const deleted = this.instances.delete(instanceId);
    if (deleted) {
      logger.info('Instance deleted', { instanceId });
    }
    return deleted;
  }

  /**
   * Get all instances
   */
  getAll(): WixInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Check if an instance exists
   */
  has(instanceId: string): boolean {
    return this.instances.has(instanceId);
  }

  /**
   * Get count of stored instances
   */
  count(): number {
    return this.instances.size;
  }

  /**
   * Clear all instances (for testing only)
   */
  clear(): void {
    const count = this.instances.size;
    this.instances.clear();
    logger.warn('All instances cleared', { count });
  }

  /**
   * Get instance by siteId
   */
  getBySiteId(siteId: string): WixInstance | undefined {
    return Array.from(this.instances.values()).find(
      (instance) => instance.siteId === siteId
    );
  }

  /**
   * Update instance tokens
   */
  updateTokens(instanceId: string, accessToken: string, refreshToken: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      logger.warn('Cannot update tokens: instance not found', { instanceId });
      return false;
    }

    instance.accessToken = accessToken;
    instance.refreshToken = refreshToken;
    this.instances.set(instanceId, instance);
    logger.info('Instance tokens updated', { instanceId });
    return true;
  }
}

/**
 * Singleton instance store (in-memory)
 * Used as fallback when Redis is not available
 */
const inMemoryStore = new InstanceStore();

/**
 * Instance store - either Redis or in-memory
 * Import from redis-instances.ts for automatic selection
 */
export const instanceStore = inMemoryStore;
