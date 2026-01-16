/**
 * Inventory Types
 * 
 * Type definitions for Wix inventory management.
 */

/**
 * Inventory item
 */
export interface InventoryItem {
  /** Inventory item ID */
  id: string;
  /** Product ID */
  productId: string;
  /** Variant ID (if applicable) */
  variantId?: string;
  /** SKU */
  sku?: string;
  /** Whether inventory tracking is enabled */
  trackInventory: boolean;
  /** Whether item is in stock */
  inStock: boolean;
  /** Available quantity */
  quantity?: number;
  /** Whether preorder is enabled */
  preorderEnabled?: boolean;
  /** Preorder quantity limit */
  preorderLimit?: number;
  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Inventory update request
 */
export interface InventoryUpdate {
  /** Product ID */
  productId: string;
  /** Variant ID (if applicable) */
  variantId?: string;
  /** Set quantity to absolute value */
  setQuantity?: number;
  /** Increment quantity by value (can be negative for decrement) */
  incrementBy?: number;
  /** Enable/disable inventory tracking */
  trackInventory?: boolean;
}

/**
 * Bulk inventory update
 */
export interface BulkInventoryUpdate {
  /** Array of inventory updates */
  items: InventoryUpdate[];
}

/**
 * Inventory query parameters
 */
export interface InventoryQuery {
  /** Filter by product IDs */
  productIds?: string[];
  /** Filter by variant IDs */
  variantIds?: string[];
  /** Filter by in-stock status */
  inStock?: boolean;
  /** Filter by tracking enabled */
  trackingEnabled?: boolean;
  /** Number of items to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Inventory list result with pagination
 */
export interface InventoryListResult {
  /** Inventory items array */
  items: InventoryItem[];
  /** Total count (across all pages) */
  totalCount: number;
  /** Whether there are more items */
  hasMore: boolean;
}

/**
 * Low stock item (extends InventoryItem with additional info)
 */
export interface LowStockItem extends InventoryItem {
  /** Product name */
  productName: string;
  /** Low stock threshold */
  threshold: number;
}

/**
 * External inventory item (for syncing with external systems)
 */
export interface ExternalInventory {
  /** SKU */
  sku: string;
  /** Quantity */
  quantity: number;
}

/**
 * Inventory sync result
 */
export interface InventorySyncResult {
  /** Number of items updated */
  updated: number;
  /** Number of items that failed to update */
  failed: number;
  /** Number of items not found */
  notFound: number;
  /** Details of failed updates */
  errors?: Array<{
    sku: string;
    error: string;
  }>;
}
