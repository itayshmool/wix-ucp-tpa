/**
 * Redis Instance Store
 * 
 * Persistent storage for Wix app instances using Redis.
 * Survives server restarts and enables multi-tenant scalability.
 */

import Redis from 'ioredis';
import { WixInstance } from '../wix/types.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

const INSTANCE_PREFIX = 'instance:';
const INSTANCE_TTL = 86400 * 30; // 30 days

/**
 * Redis-based store for app instances
 */
export class RedisInstanceStore {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected');
      this.isConnected = true;
    });

    this.redis.on('error', (err) => {
      logger.error('Redis error', { error: err.message });
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    // Connect immediately
    this.redis.connect().catch((err) => {
      logger.error('Failed to connect to Redis', { error: err.message });
    });
  }

  /**
   * Save or update an instance
   */
  async save(instanceId: string, instance: WixInstance): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot save instance', { instanceId });
      throw new Error('Redis not connected');
    }

    const key = INSTANCE_PREFIX + instanceId;
    const value = JSON.stringify({
      ...instance,
      instanceId, // Ensure instanceId is set
    });

    try {
      await this.redis.setex(key, INSTANCE_TTL, value);
      logger.info('Instance saved to Redis', { 
        instanceId, 
        hasTokens: !!(instance.accessToken && instance.refreshToken) 
      });
    } catch (error) {
      logger.error('Failed to save instance to Redis', {
        instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get an instance by ID
   */
  async get(instanceId: string): Promise<WixInstance | undefined> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot get instance', { instanceId });
      return undefined;
    }

    const key = INSTANCE_PREFIX + instanceId;

    try {
      const value = await this.redis.get(key);
      
      if (!value) {
        logger.debug('Instance not found in Redis', { instanceId });
        return undefined;
      }

      const instance = JSON.parse(value) as WixInstance;
      logger.debug('Instance retrieved from Redis', { instanceId });
      return instance;
    } catch (error) {
      logger.error('Failed to get instance from Redis', {
        instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return undefined;
    }
  }

  /**
   * Delete an instance
   */
  async delete(instanceId: string): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot delete instance', { instanceId });
      return false;
    }

    const key = INSTANCE_PREFIX + instanceId;

    try {
      const deleted = await this.redis.del(key);
      
      if (deleted > 0) {
        logger.info('Instance deleted from Redis', { instanceId });
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to delete instance from Redis', {
        instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get all instances
   */
  async getAll(): Promise<WixInstance[]> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot get all instances');
      return [];
    }

    try {
      const keys = await this.redis.keys(INSTANCE_PREFIX + '*');
      
      if (keys.length === 0) {
        return [];
      }

      const values = await this.redis.mget(...keys);
      const instances: WixInstance[] = [];

      for (const value of values) {
        if (value) {
          try {
            instances.push(JSON.parse(value) as WixInstance);
          } catch (error) {
            logger.warn('Failed to parse instance from Redis', { error });
          }
        }
      }

      return instances;
    } catch (error) {
      logger.error('Failed to get all instances from Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Check if an instance exists
   */
  async has(instanceId: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    const key = INSTANCE_PREFIX + instanceId;

    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check instance existence in Redis', {
        instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get count of stored instances
   */
  async count(): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(INSTANCE_PREFIX + '*');
      return keys.length;
    } catch (error) {
      logger.error('Failed to count instances in Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Clear all instances (for testing only)
   */
  async clear(): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot clear instances');
      return;
    }

    try {
      const keys = await this.redis.keys(INSTANCE_PREFIX + '*');
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.warn('All instances cleared from Redis', { count: keys.length });
      }
    } catch (error) {
      logger.error('Failed to clear instances from Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get instance by siteId
   */
  async getBySiteId(siteId: string): Promise<WixInstance | undefined> {
    const instances = await this.getAll();
    return instances.find((instance) => instance.siteId === siteId);
  }

  /**
   * Update instance tokens
   */
  async updateTokens(instanceId: string, accessToken: string, refreshToken: string): Promise<boolean> {
    const instance = await this.get(instanceId);
    
    if (!instance) {
      logger.warn('Cannot update tokens: instance not found in Redis', { instanceId });
      return false;
    }

    instance.accessToken = accessToken;
    instance.refreshToken = refreshToken;
    
    await this.save(instanceId, instance);
    logger.info('Instance tokens updated in Redis', { instanceId });
    return true;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      logger.info('Redis connection closed');
    }
  }
}

/**
 * Factory function to create the appropriate instance store
 */
export function createInstanceStore() {
  if (config.REDIS_URL) {
    logger.info('Using Redis instance store', { url: config.REDIS_URL.replace(/:[^:]*@/, ':***@') });
    return new RedisInstanceStore(config.REDIS_URL);
  } else {
    logger.warn('REDIS_URL not configured, falling back to in-memory store');
    // Import in-memory store
    const { instanceStore: inMemoryStore } = require('./instances.js');
    return inMemoryStore;
  }
}
