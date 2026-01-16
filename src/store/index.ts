/**
 * Instance Store Index
 * 
 * Automatically selects Redis or in-memory based on REDIS_URL configuration
 */

import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Import types
import type { WixInstance } from '../wix/types.js';

// Define store interface that works for both sync and async
export interface IInstanceStore {
  save(instanceId: string, instance: WixInstance): void | Promise<void>;
  get(instanceId: string): WixInstance | undefined | Promise<WixInstance | undefined>;
  delete(instanceId: string): boolean | Promise<boolean>;
  getAll(): WixInstance[] | Promise<WixInstance[]>;
  has(instanceId: string): boolean | Promise<boolean>;
  count(): number | Promise<number>;
  clear(): void | Promise<void>;
  getBySiteId(siteId: string): WixInstance | undefined | Promise<WixInstance | undefined>;
  updateTokens(instanceId: string, accessToken: string, refreshToken: string): boolean | Promise<boolean>;
}

// Dynamically import the appropriate store
async function initializeStore(): Promise<IInstanceStore> {
  if (config.REDIS_URL) {
    logger.info('Initializing Redis instance store');
    const { RedisInstanceStore } = await import('./redis-instances.js');
    return new RedisInstanceStore(config.REDIS_URL);
  } else {
    logger.warn('REDIS_URL not configured, using in-memory store');
    const { instanceStore: inMemoryStore } = await import('./instances.js');
    return inMemoryStore;
  }
}

// Create and export store instance
let storeInstance: IInstanceStore | null = null;

export async function getInstanceStore(): Promise<IInstanceStore> {
  if (!storeInstance) {
    storeInstance = await initializeStore();
  }
  return storeInstance;
}

// For backwards compatibility with sync code
// This will be the in-memory store initially, then swapped for Redis
let syncStore: IInstanceStore | null = null;

if (config.REDIS_URL) {
  // Initialize Redis store immediately
  initializeStore().then((store) => {
    syncStore = store;
    logger.info('Redis store initialized');
  }).catch((error) => {
    logger.error('Failed to initialize Redis store', { error: error.message });
    // Fall back to in-memory
    import('./instances.js').then((module) => {
      syncStore = module.instanceStore;
    });
  });
} else {
  // Use in-memory store
  import('./instances.js').then((module) => {
    syncStore = module.instanceStore;
  });
}

// Export for immediate use (starts as null, gets populated)
export const instanceStore = new Proxy({} as IInstanceStore, {
  get(_target, prop) {
    if (!syncStore) {
      throw new Error('Instance store not yet initialized');
    }
    return (syncStore as any)[prop];
  }
});
