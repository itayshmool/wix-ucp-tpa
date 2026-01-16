/**
 * Inventory API Routes
 * 
 * RESTful API endpoints for managing inventory.
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error-handler.js';
import { instanceStore } from '../store/store.js';
import { WixApiClient } from '../wix/client.js';
import { InventoryService } from '../services/inventory/inventory.service.js';
import { InventorySyncService } from '../services/inventory/sync.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/:instanceId/inventory
 * 
 * List inventory items with optional filtering
 * Query params:
 * - limit: number of items (default: 100)
 * - offset: pagination offset (default: 0)
 * - productIds: filter by product IDs (comma-separated)
 * - variantIds: filter by variant IDs (comma-separated)
 * - inStock: filter by in-stock status (true/false)
 * - trackingEnabled: filter by tracking enabled (true/false)
 */
router.get(
  '/:instanceId/inventory',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId } = req.params;
    const { limit, offset, productIds, variantIds, inStock, trackingEnabled } = req.query;

    logger.info('Listing inventory', {
      instanceId,
      limit,
      offset,
      hasFilters: !!(productIds || variantIds || inStock || trackingEnabled),
    });

    // Get instance
    const instance = await instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and inventory service
    const client = new WixApiClient({ accessToken: instance.accessToken });
    const inventoryService = new InventoryService(client, instanceId);

    // Build query
    const query: any = {
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
    };

    // Parse product IDs
    if (productIds) {
      query.productIds = (productIds as string).split(',').map((id) => id.trim());
    }

    // Parse variant IDs
    if (variantIds) {
      query.variantIds = (variantIds as string).split(',').map((id) => id.trim());
    }

    // Parse boolean filters
    if (inStock !== undefined) {
      query.inStock = inStock === 'true';
    }

    if (trackingEnabled !== undefined) {
      query.trackingEnabled = trackingEnabled === 'true';
    }

    // Query inventory
    const result = await inventoryService.listInventory(query);

    res.json({
      success: true,
      data: result,
      instanceId,
    });
  })
);

/**
 * GET /api/:instanceId/inventory/products/:productId
 * 
 * Get inventory for a specific product
 */
router.get(
  '/:instanceId/inventory/products/:productId',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId, productId } = req.params;

    logger.info('Getting product inventory', {
      instanceId,
      productId,
    });

    // Get instance
    const instance = await instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and inventory service
    const client = new WixApiClient({ accessToken: instance.accessToken });
    const inventoryService = new InventoryService(client, instanceId);

    // Get inventory
    const inventory = await inventoryService.getProductInventory(productId);

    res.json({
      success: true,
      data: inventory,
      instanceId,
    });
  })
);

/**
 * GET /api/:instanceId/inventory/low-stock
 * 
 * Get low stock items
 * Query params:
 * - threshold: low stock threshold (default: 10)
 */
router.get(
  '/:instanceId/inventory/low-stock',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId } = req.params;
    const { threshold } = req.query;

    const thresholdValue = threshold ? parseInt(threshold as string) : 10;

    logger.info('Getting low stock items', {
      instanceId,
      threshold: thresholdValue,
    });

    // Get instance
    const instance = await instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and inventory service
    const client = new WixApiClient({ accessToken: instance.accessToken });
    const inventoryService = new InventoryService(client, instanceId);

    // Get low stock items
    const lowStockItems = await inventoryService.getLowStockItems(thresholdValue);

    res.json({
      success: true,
      data: lowStockItems,
      instanceId,
      threshold: thresholdValue,
    });
  })
);

/**
 * PATCH /api/:instanceId/inventory
 * 
 * Update inventory for a product/variant
 * Body:
 * {
 *   "productId": "prod123",
 *   "variantId": "var456", // optional
 *   "setQuantity": 50, // optional - set absolute quantity
 *   "incrementBy": 10, // optional - increment/decrement (negative for decrement)
 *   "trackInventory": true // optional - enable/disable tracking
 * }
 */
router.patch(
  '/:instanceId/inventory',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId } = req.params;
    const update = req.body;

    logger.info('Updating inventory', {
      instanceId,
      productId: update.productId,
      variantId: update.variantId,
    });

    // Validate request body
    if (!update.productId) {
      throw new AppError('productId is required', 400);
    }

    // Get instance
    const instance = await instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and inventory service
    const client = new WixApiClient({ accessToken: instance.accessToken });
    const inventoryService = new InventoryService(client, instanceId);

    // Update inventory
    const result = await inventoryService.updateInventory(update);

    res.json({
      success: true,
      data: result,
      instanceId,
      message: 'Inventory updated successfully',
    });
  })
);

/**
 * POST /api/:instanceId/inventory/bulk
 * 
 * Bulk update inventory
 * Body:
 * {
 *   "items": [
 *     { "productId": "prod123", "setQuantity": 50 },
 *     { "productId": "prod456", "variantId": "var789", "incrementBy": -5 }
 *   ]
 * }
 */
router.post(
  '/:instanceId/inventory/bulk',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId } = req.params;
    const { items } = req.body;

    logger.info('Bulk updating inventory', {
      instanceId,
      itemCount: items?.length || 0,
    });

    // Validate request body
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('items array is required', 400);
    }

    // Get instance
    const instance = await instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and inventory service
    const client = new WixApiClient({ accessToken: instance.accessToken });
    const inventoryService = new InventoryService(client, instanceId);

    // Bulk update
    const results = await inventoryService.bulkUpdateInventory({ items });

    res.json({
      success: true,
      data: results,
      instanceId,
      message: `${results.length} inventory items updated successfully`,
    });
  })
);

/**
 * POST /api/:instanceId/inventory/sync
 * 
 * Sync inventory from external system
 * Body:
 * {
 *   "items": [
 *     { "sku": "SKU-123", "quantity": 50 },
 *     { "sku": "SKU-456", "quantity": 100 }
 *   ]
 * }
 */
router.post(
  '/:instanceId/inventory/sync',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId } = req.params;
    const { items } = req.body;

    logger.info('Syncing inventory from external system', {
      instanceId,
      itemCount: items?.length || 0,
    });

    // Validate request body
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('items array is required', 400);
    }

    // Get instance
    const instance = await instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and services
    const client = new WixApiClient({ accessToken: instance.accessToken });
    const inventoryService = new InventoryService(client, instanceId);
    const syncService = new InventorySyncService(inventoryService, instanceId);

    // Sync inventory
    const result = await syncService.syncFromExternal(items);

    res.json({
      success: true,
      data: result,
      instanceId,
      message: `Sync completed: ${result.updated} updated, ${result.failed} failed, ${result.notFound} not found`,
    });
  })
);

/**
 * GET /api/:instanceId/inventory/export
 * 
 * Export inventory to external format
 */
router.get(
  '/:instanceId/inventory/export',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId } = req.params;

    logger.info('Exporting inventory', { instanceId });

    // Get instance
    const instance = await instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and services
    const client = new WixApiClient({ accessToken: instance.accessToken });
    const inventoryService = new InventoryService(client, instanceId);
    const syncService = new InventorySyncService(inventoryService, instanceId);

    // Export inventory
    const items = await syncService.exportInventory();

    res.json({
      success: true,
      data: items,
      instanceId,
      itemCount: items.length,
    });
  })
);

export default router;
