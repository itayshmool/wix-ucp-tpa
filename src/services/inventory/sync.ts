/**
 * Inventory Sync Utility
 * 
 * Utility for syncing inventory between Wix and external systems.
 */

import { logger } from '../../utils/logger.js';
import { InventoryService } from './inventory.service.js';
import { ExternalInventory, InventorySyncResult } from '../types/inventory.types.js';

export class InventorySyncService {
  private inventoryService: InventoryService;
  private instanceId: string;

  constructor(inventoryService: InventoryService, instanceId: string) {
    this.inventoryService = inventoryService;
    this.instanceId = instanceId;
  }

  /**
   * Sync inventory from external system to Wix
   * 
   * @param externalItems - Array of external inventory items (SKU + quantity)
   * @returns Sync result with counts of updated, failed, and not found items
   */
  async syncFromExternal(externalItems: ExternalInventory[]): Promise<InventorySyncResult> {
    logger.info('Starting inventory sync from external system', {
      instanceId: this.instanceId,
      itemCount: externalItems.length,
    });

    const result: InventorySyncResult = {
      updated: 0,
      failed: 0,
      notFound: 0,
      errors: [],
    };

    // Get all inventory items from Wix
    const wixInventory = await this.inventoryService.listInventory({ limit: 1000 });
    
    // Create SKU -> inventory item map
    const skuMap = new Map(
      wixInventory.items
        .filter((item) => item.sku)
        .map((item) => [item.sku!, item])
    );

    // Process each external item
    for (const externalItem of externalItems) {
      try {
        const wixItem = skuMap.get(externalItem.sku);

        if (!wixItem) {
          logger.warn('SKU not found in Wix inventory', {
            sku: externalItem.sku,
            instanceId: this.instanceId,
          });
          result.notFound++;
          result.errors?.push({
            sku: externalItem.sku,
            error: 'SKU not found in Wix',
          });
          continue;
        }

        // Update quantity in Wix
        await this.inventoryService.updateInventory({
          productId: wixItem.productId,
          variantId: wixItem.variantId,
          setQuantity: externalItem.quantity,
        });

        logger.debug('Inventory synced successfully', {
          sku: externalItem.sku,
          newQuantity: externalItem.quantity,
          instanceId: this.instanceId,
        });

        result.updated++;
      } catch (error) {
        logger.error('Failed to sync inventory item', {
          sku: externalItem.sku,
          instanceId: this.instanceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        result.failed++;
        result.errors?.push({
          sku: externalItem.sku,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Inventory sync completed', {
      instanceId: this.instanceId,
      ...result,
    });

    return result;
  }

  /**
   * Export inventory from Wix to external format
   * 
   * @returns Array of external inventory items (SKU + quantity)
   */
  async exportInventory(): Promise<ExternalInventory[]> {
    logger.info('Exporting inventory from Wix', {
      instanceId: this.instanceId,
    });

    try {
      // Get all inventory items
      const inventory = await this.inventoryService.listInventory({ limit: 1000 });

      // Convert to external format
      const externalItems: ExternalInventory[] = inventory.items
        .filter((item) => item.sku) // Only export items with SKU
        .map((item) => ({
          sku: item.sku!,
          quantity: item.quantity || 0,
        }));

      logger.info('Inventory exported successfully', {
        instanceId: this.instanceId,
        itemCount: externalItems.length,
      });

      return externalItems;
    } catch (error) {
      logger.error('Failed to export inventory', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Reconcile inventory differences between Wix and external system
   * 
   * @param externalItems - External inventory to compare against
   * @returns Array of differences (SKU, Wix quantity, External quantity)
   */
  async reconcile(
    externalItems: ExternalInventory[]
  ): Promise<
    Array<{
      sku: string;
      wixQuantity: number;
      externalQuantity: number;
      difference: number;
    }>
  > {
    logger.info('Reconciling inventory', {
      instanceId: this.instanceId,
      externalItemCount: externalItems.length,
    });

    // Get Wix inventory
    const wixInventory = await this.exportInventory();

    // Create maps for easy lookup
    const wixMap = new Map(wixInventory.map((item) => [item.sku, item.quantity]));
    const externalMap = new Map(externalItems.map((item) => [item.sku, item.quantity]));

    // Find differences
    const differences: Array<{
      sku: string;
      wixQuantity: number;
      externalQuantity: number;
      difference: number;
    }> = [];

    // Check all SKUs (union of Wix and external)
    const allSkus = new Set([...wixMap.keys(), ...externalMap.keys()]);

    for (const sku of allSkus) {
      const wixQuantity = wixMap.get(sku) || 0;
      const externalQuantity = externalMap.get(sku) || 0;

      if (wixQuantity !== externalQuantity) {
        differences.push({
          sku,
          wixQuantity,
          externalQuantity,
          difference: externalQuantity - wixQuantity,
        });
      }
    }

    logger.info('Inventory reconciliation completed', {
      instanceId: this.instanceId,
      totalSkus: allSkus.size,
      differencesFound: differences.length,
    });

    return differences;
  }
}
