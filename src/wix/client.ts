/**
 * Wix API Client
 * 
 * Handles authenticated requests to Wix APIs.
 * Supports two authentication methods:
 * 1. OAuth (access token) - For merchant dashboard
 * 2. API Keys - For public buyer/LLM endpoints
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../utils/logger.js';
import { WixApiRequestOptions, WixApiError } from './types.js';

/**
 * Base URL for Wix APIs
 */
const WIX_API_BASE_URL = 'https://www.wixapis.com';

/**
 * Authentication configuration
 */
interface WixAuthConfig {
  // OAuth authentication
  accessToken?: string;
  
  // API Key authentication
  apiKey?: string;
  accountId?: string;
  siteId?: string;
}

/**
 * Wix API Client class
 */
export class WixApiClient {
  private client: AxiosInstance;
  private authConfig: WixAuthConfig;

  constructor(authConfig: WixAuthConfig) {
    this.authConfig = authConfig;
    
    // Validate auth configuration
    const hasOAuth = !!authConfig.accessToken;
    const hasApiKeys = !!(authConfig.apiKey && authConfig.accountId && authConfig.siteId);
    
    if (!hasOAuth && !hasApiKeys) {
      throw new Error('WixApiClient requires either accessToken or (apiKey + accountId + siteId)');
    }

    this.client = axios.create({
      baseURL: WIX_API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        if (this.authConfig.accessToken) {
          // OAuth authentication
          config.headers.Authorization = `Bearer ${this.authConfig.accessToken}`;
        } else if (this.authConfig.apiKey) {
          // API Key authentication
          config.headers.Authorization = this.authConfig.apiKey;
          config.headers['wix-account-id'] = this.authConfig.accountId!;
          config.headers['wix-site-id'] = this.authConfig.siteId!;
        }
        return config;
      },
      (error) => {
        logger.error('Request interceptor error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError = this.handleError(error);
        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Make a request to Wix API
   */
  async request<T>(options: WixApiRequestOptions): Promise<T> {
    try {
      logger.debug('Wix API request', {
        method: options.method,
        path: options.path,
      });

      const response = await this.client.request({
        method: options.method,
        url: options.path,
        data: options.data,
        headers: options.headers,
      });

      logger.debug('Wix API response', {
        status: response.status,
        path: options.path,
      });

      return response.data;
    } catch (error) {
      logger.error('Wix API request failed', {
        path: options.path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>({ method: 'GET', path, headers });
  }

  /**
   * POST request
   */
  async post<T>(
    path: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>({ method: 'POST', path, data, headers });
  }

  /**
   * PUT request
   */
  async put<T>(
    path: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>({ method: 'PUT', path, data, headers });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    path: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>({ method: 'PATCH', path, data, headers });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>({ method: 'DELETE', path, headers });
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): WixApiError {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data
          ? JSON.stringify(error.response.data)
          : error.message,
        code: error.response.status.toString(),
        details: error.response.data,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        message: 'No response from Wix API',
        code: 'NO_RESPONSE',
        details: error.message,
      };
    } else {
      // Error setting up request
      return {
        message: error.message || 'Unknown API error',
        code: 'REQUEST_ERROR',
      };
    }
  }

  /**
   * Get site information
   */
  async getSiteInfo(siteId: string) {
    return this.get(`/sites/${siteId}`);
  }
}

/**
 * Create a Wix API client instance with OAuth
 * Use for merchant dashboard endpoints
 */
export function createWixClientWithOAuth(accessToken: string): WixApiClient {
  return new WixApiClient({ accessToken });
}

/**
 * Create a Wix API client instance with API Keys
 * Use for public buyer/LLM endpoints
 */
export function createWixClientWithApiKeys(
  apiKey: string,
  accountId: string,
  siteId: string
): WixApiClient {
  return new WixApiClient({ apiKey, accountId, siteId });
}

/**
 * Create a Wix API client instance from environment variables
 * Uses API Keys from env for public endpoints
 */
export function createWixClientFromEnv(): WixApiClient {
  const apiKey = process.env.WIX_API_KEY;
  const accountId = process.env.WIX_ACCOUNT_ID;
  const siteId = process.env.WIX_SITE_ID;

  if (!apiKey || !accountId || !siteId) {
    throw new Error(
      'Missing Wix API Key environment variables: WIX_API_KEY, WIX_ACCOUNT_ID, WIX_SITE_ID'
    );
  }

  return createWixClientWithApiKeys(apiKey, accountId, siteId);
}

/**
 * @deprecated Use createWixClientWithOAuth instead
 * Legacy method for backward compatibility
 */
export function createWixClient(accessToken: string): WixApiClient {
  return createWixClientWithOAuth(accessToken);
}
