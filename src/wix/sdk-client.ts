/**
 * Wix SDK Client for Headless POC
 * 
 * Uses the official Wix SDK instead of raw REST APIs.
 * This provides better reliability and automatic handling of:
 * - Authentication
 * - Endpoint paths
 * - Request/response formats
 */

import { createClient, OAuthStrategy } from '@wix/sdk';
import { cart, currentCart, checkout } from '@wix/ecom';
import { products, collections } from '@wix/stores';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Creates a Wix SDK client configured for Headless use.
 * Uses OAuthStrategy with the Headless Client ID for visitor authentication.
 */
export function createWixSdkClient() {
  if (!config.HEADLESS_CLIENT_ID) {
    throw new Error('HEADLESS_CLIENT_ID is required for Wix SDK client');
  }

  logger.debug('Creating Wix SDK client', { 
    clientId: config.HEADLESS_CLIENT_ID.substring(0, 10) + '...' 
  });

  const client = createClient({
    modules: {
      // eCommerce modules
      cart,
      currentCart,
      checkout,
      // Stores modules
      products,
      collections,
    },
    auth: OAuthStrategy({
      clientId: config.HEADLESS_CLIENT_ID,
    }),
  });

  return client;
}

/**
 * Type for the Wix SDK client with all modules loaded.
 */
export type WixSdkClient = ReturnType<typeof createWixSdkClient>;

/**
 * Singleton instance for the SDK client.
 * The SDK handles session management internally.
 */
let sdkClientInstance: WixSdkClient | null = null;

/**
 * Gets or creates the singleton SDK client instance.
 * The SDK manages visitor sessions automatically.
 */
export function getWixSdkClient(): WixSdkClient {
  if (!sdkClientInstance) {
    logger.info('Initializing Wix SDK client singleton');
    sdkClientInstance = createWixSdkClient();
  }
  return sdkClientInstance;
}

/**
 * Resets the SDK client singleton (useful for testing or session refresh).
 */
export function resetWixSdkClient(): void {
  logger.info('Resetting Wix SDK client singleton');
  sdkClientInstance = null;
}
