/**
 * Unified Instance Store
 * 
 * Provides consistent async interface for both Redis and in-memory stores
 */

import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { WixInstance } from '../wix/types.js';

let storeInstance: any = null;
let isRedis = false;

// Initialize store on module load
(async () => {
  if (config.REDIS_URL) {
    try {
      const { RedisInstanceStore } = await import('./redis-instances.js');
      storeInstance = new RedisInstanceStore(config.REDIS_URL);
      isRedis = true;
      logger.info('✅ Using Redis instance store');
    } catch (error) {
      logger.error('Failed to initialize Redis, falling back to in-memory', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      const { instanceStore: inMemory } = await import('./instances.js');
      storeInstance = inMemory;
    }
  } else {
    const { instanceStore: inMemory } = await import('./instances.js');
    storeInstance = inMemory;
    logger.info('Using in-memory instance store (set REDIS_URL for persistence)');
  }
})();

/**
 * Unified instance store with async interface
 */
export const instanceStore = {
  async save(instanceId: string, instance: WixInstance): Promise<void> {
    if (!storeInstance) throw new Error('Store not initialized');
    if (isRedis) {
      return await storeInstance.save(instanceId, instance);
    } else {
      storeInstance.save(instanceId, instance);
    }
  },

  async get(instanceId: string): Promise<WixInstance | undefined> {
    if (!storeInstance) throw new Error('Store not initialized');
    if (isRedis) {
      return await storeInstance.get(instanceId);
    } else {
      return storeInstance.get(instanceId);
    }
  },

  async delete(instanceId: string): Promise<boolean> {
    if (!storeInstance) throw new Error('Store not initialized');
    if (isRedis) {
      return await storeInstance.delete(instanceId);
    } else {
      return storeInstance.delete(instanceId);
    }
  },

  async getAll(): Promise<WixInstance[]> {
    if (!storeInstance) throw new Error('Store not initialized');
    if (isRedis) {
      return await storeInstance.getAll();
    } else {
      return storeInstance.getAll();
    }
  },

  async has(instanceId: string): Promise<boolean> {
    if (!storeInstance) throw new Error('Store not initialized');
    if (isRedis) {
      return await storeInstance.has(instanceId);
    } else {
      return storeInstance.has(instanceId);
    }
  },

  async count(): Promise<number> {
    if (!storeInstance) throw new Error('Store not initialized');
    if (isRedis) {
      return await storeInstance.count();
    } else {
      return storeInstance.count();
    }
  },

  async clear(): Promise<void> {
    if (!storeInstance) throw new Error('Store not initialized');
    if (isRedis) {
      return await storeInstance.clear();
    } else {
      storeInstance.clear();
    }
  },

  async getBySiteId(siteId: string): Promise<WixInstance | undefined> {
    if (!storeInstance) throw new Error('Store not initialized');
    if (isRedis) {
      return await storeInstance.getBySiteId(siteId);
    } else {
      return storeInstance.getBySiteId(siteId);
    }
  },

  async updateTokens(instanceId: string, accessToken: string, refreshToken: string): Promise<boolean> {
    if (!storeInstance) throw new Error('Store not initialized');
    if (isRedis) {
      return await storeInstance.updateTokens(instanceId, accessToken, refreshToken);
    } else {
      return storeInstance.updateTokens(instanceId, accessToken, refreshToken);
    }
  },
};
