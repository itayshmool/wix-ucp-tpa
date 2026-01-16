/**
 * Client Factory Helpers
 * 
 * Utilities for creating Wix API clients from different auth sources
 */

import { createWixClientWithOAuth, createWixClientWithInstance, WixApiClient } from './client.js';
import { WixInstance } from './types.js';
import { AppError } from '../middleware/error-handler.js';

/**
 * Create a Wix API client from an instance record
 * Automatically selects the best authentication method available:
 * 1. OAuth token (if available)
 * 2. Instance parameter (for Dashboard Extension apps)
 */
export function createClientFromInstance(instance: WixInstance): WixApiClient {
  if (instance.accessToken) {
    // Use OAuth token (preferred for full API access)
    return createWixClientWithOAuth(instance.accessToken);
  } else if (instance.instanceParam) {
    // Use instance parameter (for Dashboard Extension apps without OAuth)
    return createWixClientWithInstance(instance.instanceParam);
  } else {
    throw new AppError(
      'No authentication available. Instance has neither OAuth token nor instance parameter.',
      401
    );
  }
}
