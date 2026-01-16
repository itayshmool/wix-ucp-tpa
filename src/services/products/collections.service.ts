/**
 * Collections Service
 * 
 * Service for accessing and managing product collections (categories).
 */

import { WixApiClient } from '../../wix/client.js';
import { logger } from '../../utils/logger.js';
import { detectCatalogVersion } from './version.js';
import { Collection, Product, ProductMedia, CatalogVersion } from '../types/product.types.js';
import { ProductsService } from './products.service.js';

export class CollectionsService {
  private client: WixApiClient;
  private instanceId: string;
  private version: CatalogVersion | null = null;
  private productsService: ProductsService;

  constructor(client: WixApiClient, instanceId: string) {
    this.client = client;
    this.instanceId = instanceId;
    this.productsService = new ProductsService(client, instanceId);
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
   * List all collections
   */
  async listCollections(): Promise<Collection[]> {
    const version = await this.getVersion();

    logger.info('Listing collections', {
      instanceId: this.instanceId,
      version,
    });

    try {
      if (version === 'V3') {
        return await this.listCollectionsV3();
      } else {
        return await this.listCollectionsV1();
      }
    } catch (error) {
      logger.error('Failed to list collections', {
        instanceId: this.instanceId,
        version,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get a single collection by ID
   */
  async getCollection(collectionId: string): Promise<Collection> {
    const version = await this.getVersion();

    logger.info('Getting collection', {
      instanceId: this.instanceId,
      version,
      collectionId,
    });

    try {
      if (version === 'V3') {
        return await this.getCollectionV3(collectionId);
      } else {
        return await this.getCollectionV1(collectionId);
      }
    } catch (error) {
      logger.error('Failed to get collection', {
        instanceId: this.instanceId,
        version,
        collectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get all products in a collection
   */
  async getCollectionProducts(collectionId: string): Promise<Product[]> {
    logger.info('Getting collection products', {
      instanceId: this.instanceId,
      collectionId,
    });

    return await this.productsService.getProductsByCollection(collectionId);
  }

  // ============================================================================
  // V3 API Implementation
  // ============================================================================

  private async listCollectionsV3(): Promise<Collection[]> {
    const response: any = await this.client.post('/stores/v3/collections/query', {
      query: {
        paging: {
          limit: 100,
        },
      },
    });

    return (response.collections || []).map((raw: any) => 
      this.normalizeCollection(raw, 'V3')
    );
  }

  private async getCollectionV3(collectionId: string): Promise<Collection> {
    const response: any = await this.client.get(`/stores/v3/collections/${collectionId}`);
    return this.normalizeCollection(response.collection, 'V3');
  }

  // ============================================================================
  // V1 API Implementation
  // ============================================================================

  private async listCollectionsV1(): Promise<Collection[]> {
    const response: any = await this.client.post('/stores/v1/collections/query', {
      query: {
        paging: {
          limit: 100,
        },
      },
    });

    return (response.collections || []).map((raw: any) => 
      this.normalizeCollection(raw, 'V1')
    );
  }

  private async getCollectionV1(collectionId: string): Promise<Collection> {
    const response: any = await this.client.get(`/stores/v1/collections/${collectionId}`);
    return this.normalizeCollection(response.collection, 'V1');
  }

  // ============================================================================
  // Normalization
  // ============================================================================

  private normalizeCollection(raw: any, _version: CatalogVersion): Collection {
    return {
      id: raw._id || raw.id,
      name: raw.name || 'Unnamed Collection',
      slug: raw.slug || '',
      description: raw.description || '',
      media: this.normalizeMedia(raw.media),
      productCount: raw.numberOfProducts || raw.productCount || 0,
      visible: raw.visible !== false,
    };
  }

  private normalizeMedia(mediaData: any): ProductMedia | undefined {
    if (!mediaData) return undefined;

    return {
      id: mediaData.id || '',
      url: mediaData.url || mediaData.image || '',
      type: 'image',
      altText: mediaData.altText || '',
      width: mediaData.width,
      height: mediaData.height,
    };
  }
}
