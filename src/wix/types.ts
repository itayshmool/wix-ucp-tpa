/**
 * Wix TPA Types and Interfaces
 * 
 * Defines TypeScript types for Wix API interactions, OAuth flow, and webhooks.
 */

// ============================================================================
// App Instance Types
// ============================================================================

/**
 * Represents a Wix app installation instance
 */
export interface WixInstance {
  instanceId: string;
  accessToken: string;
  refreshToken: string;
  installedAt: Date;
  siteId?: string;
  metaSiteId?: string;
  instanceParam?: string; // Raw instance parameter for dashboard-based auth
}

/**
 * OAuth token response from Wix
 */
export interface WixTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * OAuth authorization request parameters
 */
export interface WixAuthRequest {
  code: string;
  state?: string;
  instanceId?: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Wix webhook payload structure
 */
export interface WixWebhookPayload {
  instanceId: string;
  eventType: WixWebhookEventType | string; // Allow string for product webhooks
  data: any; // Changed from unknown to any for easier access
  timestamp: string;
}

/**
 * Supported Wix webhook event types
 */
export enum WixWebhookEventType {
  APP_INSTALLED = 'app.installed',
  APP_REMOVED = 'app.removed',
  SITE_PUBLISHED = 'site.published',
  SITE_UNPUBLISHED = 'site.unpublished',
  // Product webhooks (Phase 2.1)
  PRODUCT_CREATED = 'wix.stores.v1.product_created',
  PRODUCT_UPDATED = 'wix.stores.v1.product_updated',
  PRODUCT_DELETED = 'wix.stores.v1.product_deleted',
  // Order webhooks (Phase 2.2)
  ORDER_CREATED = 'wix.ecom.v1.order_created',
  ORDER_UPDATED = 'wix.ecom.v1.order_updated',
  ORDER_PAID = 'wix.ecom.v1.order_paid',
  ORDER_FULFILLED = 'wix.ecom.v1.order_fulfilled',
  ORDER_CANCELED = 'wix.ecom.v1.order_canceled',
  // Inventory webhooks (Phase 2.3)
  INVENTORY_UPDATED = 'wix.stores.v2.inventory_item_updated',
  INVENTORY_QUANTITY_UPDATED = 'wix.stores.v2.inventory_item_quantity_updated',
}

/**
 * Webhook signature validation result
 */
export interface WebhookValidationResult {
  isValid: boolean;
  instanceId?: string;
  error?: string;
}

// ============================================================================
// API Client Types
// ============================================================================

/**
 * Wix API request options
 */
export interface WixApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  data?: unknown;
  headers?: Record<string, string>;
}

/**
 * Wix API error response
 */
export interface WixApiError {
  message: string;
  code?: string;
  details?: unknown;
}

// ============================================================================
// Dashboard Instance Types
// ============================================================================

/**
 * Decoded Wix instance JWT (passed in dashboard query params)
 */
export interface DecodedInstance {
  instanceId: string;
  appDefId: string;
  signDate: number;
  uid: string;
  permissions: string;
  ipAndPort?: string;
  vendorProductId?: string;
  aid?: string;
  siteOwnerId?: string;
  siteMemberId?: string;
  expirationDate?: number;
  loginAccountId?: string;
  pai?: string;
  lpai?: string;
}

// ============================================================================
// Site Information Types
// ============================================================================

/**
 * Wix site information
 */
export interface WixSite {
  siteId: string;
  metaSiteId: string;
  displayName: string;
  url?: string;
  locale?: string;
  currency?: string;
}

// ============================================================================
// Merchant/Store Types (for later phases)
// ============================================================================

/**
 * Basic merchant information
 */
export interface WixMerchant {
  instanceId: string;
  siteId: string;
  businessName?: string;
  email?: string;
  connectedAt: Date;
  isActive: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for WixWebhookPayload
 */
export function isWixWebhookPayload(obj: unknown): obj is WixWebhookPayload {
  if (!obj || typeof obj !== 'object') return false;
  const payload = obj as Record<string, unknown>;
  return (
    typeof payload.instanceId === 'string' &&
    typeof payload.eventType === 'string' &&
    'data' in payload &&
    typeof payload.timestamp === 'string'
  );
}

/**
 * Type guard for WixTokenResponse
 */
export function isWixTokenResponse(obj: unknown): obj is WixTokenResponse {
  if (!obj || typeof obj !== 'object') return false;
  const response = obj as Record<string, unknown>;
  return (
    typeof response.access_token === 'string' &&
    typeof response.refresh_token === 'string' &&
    typeof response.expires_in === 'number' &&
    typeof response.token_type === 'string'
  );
}
