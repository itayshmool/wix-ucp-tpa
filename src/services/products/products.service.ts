/**
 * Products Service
 * 
 * Main service for accessing and managing Wix product catalog.
 * Supports both Catalog V1 and V3 APIs with automatic version detection.
 */

import { WixApiClient } from '../../wix/client.js';
import { logger } from '../../utils/logger.js';
import { detectCatalogVersion } from './version.js';
import {
  Product,
  ProductQuery,
  ProductListResult,
  ProductPrice,
  ProductMedia,
  ProductInventory,
  ProductVariant,
  ProductOption,
  CatalogVersion,
} from '../types/product.types.js';

export class ProductsService {
  private client: WixApiClient;
  private instanceId: string;
  private version: CatalogVersion | null = null;

  constructor(client: WixApiClient, instanceId: string) {
    this.client = client;
    this.instanceId = instanceId;
  }

  /**
   * Get catalog version for this instance
   */
  async getVersion(): Promise<CatalogVersion> {
    if (!this.version) {
      this.version = await detectCatalogVersion(this.client, this.instanceId);
    }
    return this.version;
  }

  /**
   * List products with optional filtering and pagination
   */
  async listProducts(query: ProductQuery = {}): Promise<ProductListResult> {
    const version = await this.getVersion();
    const { limit = 50, offset = 0, collectionId, search } = query;

    logger.info('Listing products', {
      instanceId: this.instanceId,
      version,
      limit,
      offset,
      collectionId,
      search,
    });

    try {
      if (version === 'V3') {
        return await this.listProductsV3(query);
      } else {
        return await this.listProductsV1(query);
      }
    } catch (error) {
      logger.error('Failed to list products', {
        instanceId: this.instanceId,
        version,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get a single product by ID
   */
  async getProduct(productId: string): Promise<Product> {
    const version = await this.getVersion();

    logger.info('Getting product', {
      instanceId: this.instanceId,
      version,
      productId,
    });

    try {
      if (version === 'V3') {
        return await this.getProductV3(productId);
      } else {
        return await this.getProductV1(productId);
      }
    } catch (error) {
      logger.error('Failed to get product', {
        instanceId: this.instanceId,
        version,
        productId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Search products by term
   */
  async searchProducts(searchTerm: string, limit: number = 20): Promise<Product[]> {
    const result = await this.listProducts({
      search: searchTerm,
      limit,
    });
    return result.products;
  }

  /**
   * Get products in a specific collection
   */
  async getProductsByCollection(collectionId: string, limit: number = 50): Promise<Product[]> {
    const result = await this.listProducts({
      collectionId,
      limit,
    });
    return result.products;
  }

  // ============================================================================
  // V3 API Implementation
  // ============================================================================

  private async listProductsV3(query: ProductQuery): Promise<ProductListResult> {
    const { limit = 50, offset = 0, collectionId, includeHidden = false, search } = query;

    const requestBody: any = {
      query: {
        paging: {
          limit,
          offset,
        },
      },
    };

    // Add filters
    if (collectionId) {
      requestBody.query.filter = {
        collectionIds: { $hasSome: [collectionId] },
      };
    }

    if (!includeHidden) {
      requestBody.query.filter = {
        ...requestBody.query.filter,
        visible: true,
      };
    }

    if (search) {
      requestBody.query.filter = {
        ...requestBody.query.filter,
        name: { $contains: search },
      };
    }

    const response: any = await this.client.post('/stores/v3/products/query', requestBody);

    const products = (response.products || []).map((raw: any) => 
      this.normalizeProduct(raw, 'V3')
    );

    return {
      products,
      totalCount: response.totalResults || products.length,
      hasMore: products.length === limit,
    };
  }

  private async getProductV3(productId: string): Promise<Product> {
    const response: any = await this.client.get(`/stores/v3/products/${productId}`);
    return this.normalizeProduct(response.product, 'V3');
  }

  // ============================================================================
  // V1 API Implementation
  // ============================================================================

  private async listProductsV1(query: ProductQuery): Promise<ProductListResult> {
    const { limit = 50, offset = 0, collectionId, includeHidden = false, search } = query;

    const requestBody: any = {
      query: {
        paging: {
          limit,
          offset,
        },
      },
    };

    // Add filters
    const filters: any[] = [];

    if (collectionId) {
      filters.push({
        collectionIds: { $hasSome: [collectionId] },
      });
    }

    if (!includeHidden) {
      filters.push({ visible: true });
    }

    if (search) {
      filters.push({
        name: { $contains: search },
      });
    }

    if (filters.length > 0) {
      requestBody.query.filter = { $and: filters };
    }

    const response: any = await this.client.post('/stores/v1/products/query', requestBody);

    const products = (response.products || []).map((raw: any) => 
      this.normalizeProduct(raw, 'V1')
    );

    return {
      products,
      totalCount: response.totalResults || products.length,
      hasMore: products.length === limit,
    };
  }

  private async getProductV1(productId: string): Promise<Product> {
    const response: any = await this.client.get(`/stores/v1/products/${productId}`);
    return this.normalizeProduct(response.product, 'V1');
  }

  // ============================================================================
  // Normalization (Convert V1/V3 raw data to unified Product interface)
  // ============================================================================

  private normalizeProduct(raw: any, _version: CatalogVersion): Product {
    return {
      id: raw._id || raw.id,
      name: raw.name || 'Unnamed Product',
      slug: raw.slug || '',
      description: raw.description || '',
      sku: raw.sku || '',
      price: this.normalizePrice(raw.price || raw.priceData),
      compareAtPrice: raw.compareAtPrice ? this.normalizePrice(raw.compareAtPrice) : undefined,
      media: this.normalizeMedia(raw.media || []),
      inventory: this.normalizeInventory(raw.stock || raw.inventory),
      productType: raw.productType || 'physical',
      visible: raw.visible !== false,
      variants: this.normalizeVariants(raw.variants || []),
      options: this.normalizeOptions(raw.productOptions || raw.options || []),
      collections: raw.collectionIds || [],
      createdAt: raw._createdDate ? new Date(raw._createdDate) : new Date(),
      updatedAt: raw._updatedDate ? new Date(raw._updatedDate) : new Date(),
    };
  }

  private normalizePrice(priceData: any): ProductPrice {
    if (!priceData) {
      return { amount: 0, currency: 'USD', formatted: '$0.00' };
    }

    const amount = parseFloat(priceData.price || priceData.amount || '0');
    const currency = priceData.currency || 'USD';
    const formatted = priceData.formatted || `${currency} ${amount.toFixed(2)}`;

    return { amount, currency, formatted };
  }

  private normalizeMedia(mediaItems: any[]): ProductMedia[] {
    return mediaItems.map((item: any) => ({
      id: item.id || item._id || '',
      url: item.url || item.image || '',
      type: item.mediaType || item.type || 'image',
      altText: item.altText || '',
      width: item.width,
      height: item.height,
    }));
  }

  private normalizeInventory(inventoryData: any): ProductInventory {
    if (!inventoryData) {
      return { trackInventory: false, inStock: true };
    }

    return {
      trackInventory: inventoryData.trackQuantity || inventoryData.trackInventory || false,
      inStock: inventoryData.inStock !== false,
      quantity: inventoryData.quantity,
    };
  }

  private normalizeVariants(variants: any[]): ProductVariant[] {
    return variants.map((variant: any) => ({
      id: variant.id || variant._id || '',
      sku: variant.sku,
      price: variant.price ? this.normalizePrice(variant.price) : undefined,
      compareAtPrice: variant.compareAtPrice ? this.normalizePrice(variant.compareAtPrice) : undefined,
      weight: variant.weight,
      weightUnit: variant.weightUnit || 'kg',
      inventory: this.normalizeInventory(variant.stock || variant.inventory),
      choices: variant.choices || [],
      visible: variant.visible !== false,
    }));
  }

  private normalizeOptions(options: any[]): ProductOption[] {
    return options.map((option: any) => ({
      name: option.name || '',
      values: option.choices || option.values || [],
    }));
  }
}
