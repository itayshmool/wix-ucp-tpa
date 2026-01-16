/**
 * Inventory Service
 * 
 * Service for managing product inventory levels in Wix.
 */

import { WixApiClient } from '../../wix/client.js';
import { logger } from '../../utils/logger.js';
import {
  InventoryItem,
  InventoryQuery,
  InventoryListResult,
  InventoryUpdate,
  BulkInventoryUpdate,
  LowStockItem,
} from '../types/inventory.types.js';
import { ProductsService } from '../products/products.service.js';

export class InventoryService {
  private client: WixApiClient;
  private instanceId: string;
  private productsService: ProductsService;

  constructor(client: WixApiClient, instanceId: string) {
    this.client = client;
    this.instanceId = instanceId;
    this.productsService = new ProductsService(client, instanceId);
  }

  /**
   * Get inventory for a specific product
   */
  async getProductInventory(productId: string): Promise<InventoryItem[]> {
    logger.info('Getting product inventory', {
      instanceId: this.instanceId,
      productId,
    });

    try {
      const result = await this.listInventory({
        productIds: [productId],
      });
      return result.items;
    } catch (error) {
      logger.error('Failed to get product inventory', {
        instanceId: this.instanceId,
        productId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get inventory for a specific variant
   */
  async getVariantInventory(variantId: string): Promise<InventoryItem> {
    logger.info('Getting variant inventory', {
      instanceId: this.instanceId,
      variantId,
    });

    try {
      const result = await this.listInventory({
        variantIds: [variantId],
      });

      if (result.items.length === 0) {
        throw new Error('Variant inventory not found');
      }

      return result.items[0];
    } catch (error) {
      logger.error('Failed to get variant inventory', {
        instanceId: this.instanceId,
        variantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * List inventory items with optional filtering
   */
  async listInventory(query: InventoryQuery = {}): Promise<InventoryListResult> {
    const { limit = 100, offset = 0, productIds, variantIds, inStock, trackingEnabled } = query;

    logger.info('Listing inventory', {
      instanceId: this.instanceId,
      limit,
      offset,
      hasFilters: !!(productIds || variantIds || inStock !== undefined || trackingEnabled !== undefined),
    });

    try {
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

      if (productIds && productIds.length > 0) {
        filters.push({ productId: { $in: productIds } });
      }

      if (variantIds && variantIds.length > 0) {
        filters.push({ variantId: { $in: variantIds } });
      }

      if (inStock !== undefined) {
        filters.push({ inStock });
      }

      if (trackingEnabled !== undefined) {
        filters.push({ trackQuantity: trackingEnabled });
      }

      if (filters.length > 0) {
        requestBody.query.filter = filters.length === 1 ? filters[0] : { $and: filters };
      }

      const response: any = await this.client.post('/stores/v2/inventoryItems/query', requestBody);

      const items = (response.inventoryItems || []).map((raw: any) => 
        this.normalizeInventoryItem(raw)
      );

      return {
        items,
        totalCount: response.metadata?.count || items.length,
        hasMore: items.length === limit,
      };
    } catch (error) {
      logger.error('Failed to list inventory', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update inventory for a product/variant
   */
  async updateInventory(update: InventoryUpdate): Promise<InventoryItem> {
    const { productId, variantId, setQuantity, incrementBy, trackInventory } = update;

    logger.info('Updating inventory', {
      instanceId: this.instanceId,
      productId,
      variantId,
      setQuantity,
      incrementBy,
      trackInventory,
    });

    try {
      // First, find the inventory item ID
      const inventoryItems = variantId
        ? await this.listInventory({ variantIds: [variantId] })
        : await this.listInventory({ productIds: [productId] });

      if (inventoryItems.items.length === 0) {
        throw new Error('Inventory item not found');
      }

      const inventoryItemId = inventoryItems.items[0].id;

      // Prepare update request
      const requestBody: any = {
        inventoryItem: {},
      };

      if (setQuantity !== undefined) {
        requestBody.inventoryItem.quantity = setQuantity;
      }

      if (incrementBy !== undefined) {
        requestBody.inventoryItem.quantityChange = incrementBy;
      }

      if (trackInventory !== undefined) {
        requestBody.inventoryItem.trackQuantity = trackInventory;
      }

      const response: any = await this.client.patch(
        `/stores/v2/inventoryItems/${inventoryItemId}`,
        requestBody
      );

      return this.normalizeInventoryItem(response.inventoryItem);
    } catch (error) {
      logger.error('Failed to update inventory', {
        instanceId: this.instanceId,
        productId,
        variantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Bulk update inventory
   */
  async bulkUpdateInventory(bulkUpdate: BulkInventoryUpdate): Promise<InventoryItem[]> {
    logger.info('Bulk updating inventory', {
      instanceId: this.instanceId,
      itemCount: bulkUpdate.items.length,
    });

    try {
      const updates = await Promise.all(
        bulkUpdate.items.map((update) => this.updateInventory(update))
      );
      return updates;
    } catch (error) {
      logger.error('Failed to bulk update inventory', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Decrement inventory quantity
   */
  async decrementInventory(
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<InventoryItem> {
    return await this.updateInventory({
      productId,
      variantId,
      incrementBy: -quantity,
    });
  }

  /**
   * Increment inventory quantity
   */
  async incrementInventory(
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<InventoryItem> {
    return await this.updateInventory({
      productId,
      variantId,
      incrementBy: quantity,
    });
  }

  /**
   * Get low stock items (items below threshold)
   */
  async getLowStockItems(threshold: number = 10): Promise<LowStockItem[]> {
    logger.info('Getting low stock items', {
      instanceId: this.instanceId,
      threshold,
    });

    try {
      // Get all tracked inventory items
      const inventory = await this.listInventory({
        trackingEnabled: true,
        limit: 500, // Get up to 500 items
      });

      // Filter items below threshold
      const lowStockItems = inventory.items.filter(
        (item) => item.quantity !== undefined && item.quantity < threshold
      );

      // Get product details for low stock items
      const itemsWithDetails = await Promise.all(
        lowStockItems.map(async (item) => {
          try {
            const product = await this.productsService.getProduct(item.productId);
            return {
              ...item,
              productName: product.name,
              threshold,
            };
          } catch (error) {
            logger.warn('Failed to get product details for low stock item', {
              productId: item.productId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            return {
              ...item,
              productName: 'Unknown Product',
              threshold,
            };
          }
        })
      );

      return itemsWithDetails;
    } catch (error) {
      logger.error('Failed to get low stock items', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Enable or disable inventory tracking
   */
  async setTrackingEnabled(
    productId: string,
    enabled: boolean,
    variantId?: string
  ): Promise<InventoryItem> {
    return await this.updateInventory({
      productId,
      variantId,
      trackInventory: enabled,
    });
  }

  // ============================================================================
  // Normalization
  // ============================================================================

  private normalizeInventoryItem(raw: any): InventoryItem {
    return {
      id: raw._id || raw.id,
      productId: raw.productId,
      variantId: raw.variantId,
      sku: raw.sku,
      trackInventory: raw.trackQuantity || false,
      inStock: raw.inStock !== false,
      quantity: raw.quantity,
      preorderEnabled: raw.preorderInfo?.enabled || false,
      preorderLimit: raw.preorderInfo?.limit,
      lastUpdated: raw._updatedDate ? new Date(raw._updatedDate) : new Date(),
    };
  }
}
