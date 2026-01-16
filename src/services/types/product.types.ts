/**
 * Product Types
 * 
 * Unified product interfaces that abstract differences between Wix Catalog V1 and V3.
 * These types provide a consistent interface regardless of which API version is used.
 */

/**
 * Catalog API version
 */
export type CatalogVersion = 'V1' | 'V3';

/**
 * Product price information
 */
export interface ProductPrice {
  /** Price amount (e.g., 29.99) */
  amount: number;
  /** Currency code (e.g., 'USD') */
  currency: string;
  /** Formatted price string (e.g., '$29.99') */
  formatted: string;
}

/**
 * Product media (images, videos)
 */
export interface ProductMedia {
  /** Media ID */
  id: string;
  /** Media URL */
  url: string;
  /** Media type */
  type: 'image' | 'video';
  /** Alt text for accessibility */
  altText?: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
}

/**
 * Product inventory information
 */
export interface ProductInventory {
  /** Whether inventory is tracked */
  trackInventory: boolean;
  /** Whether product is in stock */
  inStock: boolean;
  /** Quantity available */
  quantity?: number;
}

/**
 * Product option (e.g., Size, Color)
 */
export interface ProductOption {
  /** Option name (e.g., 'Size') */
  name: string;
  /** Available values (e.g., ['S', 'M', 'L']) */
  values: string[];
}

/**
 * Product variant choice (e.g., Size: M)
 */
export interface VariantChoice {
  /** Option name */
  option: string;
  /** Chosen value */
  value: string;
}

/**
 * Product variant (specific combination of options)
 */
export interface ProductVariant {
  /** Variant ID */
  id: string;
  /** SKU (Stock Keeping Unit) */
  sku?: string;
  /** Variant-specific price */
  price?: ProductPrice;
  /** Compare at price (for showing discounts) */
  compareAtPrice?: ProductPrice;
  /** Weight in specified unit */
  weight?: number;
  /** Weight unit (e.g., 'kg', 'lb') */
  weightUnit?: string;
  /** Variant inventory */
  inventory: ProductInventory;
  /** Choices that define this variant */
  choices: VariantChoice[];
  /** Whether variant is visible */
  visible: boolean;
}

/**
 * Unified Product interface
 */
export interface Product {
  /** Product ID */
  id: string;
  /** Product name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Product description (HTML) */
  description?: string;
  /** SKU (for simple products without variants) */
  sku?: string;
  /** Product price */
  price: ProductPrice;
  /** Compare at price (for showing discounts) */
  compareAtPrice?: ProductPrice;
  /** Product media (images, videos) */
  media: ProductMedia[];
  /** Inventory information */
  inventory: ProductInventory;
  /** Product type */
  productType: 'physical' | 'digital';
  /** Whether product is visible in store */
  visible: boolean;
  /** Product variants */
  variants: ProductVariant[];
  /** Product options (defines what variants can have) */
  options: ProductOption[];
  /** Collection IDs this product belongs to */
  collections: string[];
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Product query parameters
 */
export interface ProductQuery {
  /** Number of products to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by collection ID */
  collectionId?: string;
  /** Include hidden products */
  includeHidden?: boolean;
  /** Search term */
  search?: string;
}

/**
 * Product list result with pagination
 */
export interface ProductListResult {
  /** Products array */
  products: Product[];
  /** Total count (across all pages) */
  totalCount: number;
  /** Whether there are more products */
  hasMore: boolean;
}

/**
 * Collection information
 */
export interface Collection {
  /** Collection ID */
  id: string;
  /** Collection name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Collection description */
  description?: string;
  /** Collection media */
  media?: ProductMedia;
  /** Number of products in collection */
  productCount: number;
  /** Whether collection is visible */
  visible: boolean;
}
