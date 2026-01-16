/**
 * POC Client for Wix Headless
 * 
 * This module provides a simplified way to get an authenticated Wix API client
 * for the POC (Proof of Concept) phase.
 * 
 * It uses the Headless OAuth Client to generate visitor tokens for anonymous
 * buyer access (browsing, cart, checkout).
 */

import axios from 'axios';
import { WixApiClient, createWixClientWithOAuth } from './client.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * Token cache to avoid generating new tokens on every request
 */
interface TokenCache {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

let tokenCache: TokenCache | null = null;

/**
 * Generate a visitor (anonymous) token using the Headless OAuth Client
 * 
 * This creates a token for anonymous buyers to browse products, 
 * create carts, and checkout.
 */
async function generateVisitorToken(): Promise<TokenCache> {
  const clientId = config.HEADLESS_CLIENT_ID;
  
  if (!clientId) {
    throw new Error('HEADLESS_CLIENT_ID is not configured. Please set it in environment variables.');
  }

  logger.info('Generating visitor token for POC', { clientId: clientId.substring(0, 8) + '...' });

  try {
    const response = await axios.post(
      'https://www.wixapis.com/oauth2/token',
      {
        grant_type: 'anonymous',
        client_id: clientId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    
    // Calculate expiration time (default to 4 hours if not provided)
    const expiresInSeconds = expires_in || 14400;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    logger.info('Visitor token generated successfully', { 
      expiresIn: expiresInSeconds,
      expiresAt: expiresAt.toISOString() 
    });

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('Failed to generate visitor token', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error(`Failed to generate visitor token: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Check if the cached token is still valid
 */
function isTokenValid(): boolean {
  if (!tokenCache) return false;
  
  // Consider token invalid if it expires in less than 5 minutes
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  return tokenCache.expiresAt.getTime() > Date.now() + bufferTime;
}

/**
 * Get or create a visitor token
 */
async function getVisitorToken(): Promise<string> {
  if (isTokenValid() && tokenCache) {
    logger.debug('Using cached visitor token');
    return tokenCache.accessToken;
  }

  logger.debug('Generating new visitor token (cache miss or expired)');
  tokenCache = await generateVisitorToken();
  return tokenCache.accessToken;
}

/**
 * Get a Wix API client for the POC
 * 
 * This is the main function to use throughout the POC.
 * It returns a WixApiClient authenticated with a visitor token.
 * 
 * @example
 * ```typescript
 * const client = await getPocClient();
 * const products = await client.get('/stores/v1/products');
 * ```
 */
export async function getPocClient(): Promise<WixApiClient> {
  const accessToken = await getVisitorToken();
  return createWixClientWithOAuth(accessToken);
}

/**
 * Clear the token cache (useful for testing or forcing re-authentication)
 */
export function clearTokenCache(): void {
  tokenCache = null;
  logger.debug('Token cache cleared');
}

/**
 * Get POC store information
 * Useful for discovery endpoint
 */
export function getPocStoreInfo() {
  return {
    clientId: config.HEADLESS_CLIENT_ID,
    // These would come from your Wix site
    storeName: 'POC Test Store',
    storeUrl: 'https://wixingthis.wixsite.com/persthewp',
    currency: 'USD',
  };
}
