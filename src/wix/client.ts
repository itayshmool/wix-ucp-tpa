/**
 * Wix API Client
 * 
 * Handles authenticated requests to Wix APIs.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../utils/logger.js';
import { WixApiRequestOptions, WixApiError } from './types.js';

/**
 * Base URL for Wix APIs
 */
const WIX_API_BASE_URL = 'https://www.wixapis.com';

/**
 * Wix API Client class
 */
export class WixApiClient {
  private client: AxiosInstance;
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
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
        config.headers.Authorization = `Bearer ${this.accessToken}`;
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
 * Create a Wix API client instance
 */
export function createWixClient(accessToken: string): WixApiClient {
  return new WixApiClient(accessToken);
}
