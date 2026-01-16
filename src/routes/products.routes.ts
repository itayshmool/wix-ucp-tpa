/**
 * Products API Routes
 * 
 * RESTful API endpoints for accessing product catalog.
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error-handler.js';
import { instanceStore } from '../store/store.js';
import { WixApiClient } from '../wix/client.js';
import { ProductsService } from '../services/products/products.service.js';
import { CollectionsService } from '../services/products/collections.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/:instanceId/products
 * 
 * List products with optional filtering
 * Query params:
 * - limit: number of products (default: 50)
 * - offset: pagination offset (default: 0)
 * - collectionId: filter by collection
 * - search: search term
 */
router.get(
  '/:instanceId/products',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId } = req.params;
    const { limit, offset, collectionId, search } = req.query;

    logger.info('Listing products', {
      instanceId,
      limit,
      offset,
      collectionId,
      search,
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

    // Create API client and products service
    const client = new WixApiClient({ accessToken: instance.accessToken });
    const productsService = new ProductsService(client, instanceId);

    // Query products
    const result = await productsService.listProducts({
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
      collectionId: collectionId as string,
      search: search as string,
    });

    res.json({
      success: true,
      data: result,
      instanceId,
    });
  })
);

/**
 * GET /api/:instanceId/products/:productId
 * 
 * Get a single product by ID
 */
router.get(
  '/:instanceId/products/:productId',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId, productId } = req.params;

    logger.info('Getting product', {
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

    // Create API client and products service
    const client = new WixApiClient({ accessToken: instance.accessToken });
    const productsService = new ProductsService(client, instanceId);

    // Get product
    const product = await productsService.getProduct(productId);

    res.json({
      success: true,
      data: product,
      instanceId,
    });
  })
);

/**
 * GET /api/:instanceId/collections
 * 
 * List all collections
 */
router.get(
  '/:instanceId/collections',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId } = req.params;

    logger.info('Listing collections', { instanceId });

    // Get instance
    const instance = await instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and collections service
    const client = new WixApiClient({ accessToken: instance.accessToken });
    const collectionsService = new CollectionsService(client, instanceId);

    // Get collections
    const collections = await collectionsService.listCollections();

    res.json({
      success: true,
      data: collections,
      instanceId,
    });
  })
);

/**
 * GET /api/:instanceId/collections/:collectionId
 * 
 * Get a single collection by ID
 */
router.get(
  '/:instanceId/collections/:collectionId',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId, collectionId } = req.params;

    logger.info('Getting collection', {
      instanceId,
      collectionId,
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

    // Create API client and collections service
    const client = new WixApiClient({ accessToken: instance.accessToken });
    const collectionsService = new CollectionsService(client, instanceId);

    // Get collection
    const collection = await collectionsService.getCollection(collectionId);

    res.json({
      success: true,
      data: collection,
      instanceId,
    });
  })
);

/**
 * GET /api/:instanceId/collections/:collectionId/products
 * 
 * Get all products in a collection
 */
router.get(
  '/:instanceId/collections/:collectionId/products',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId, collectionId } = req.params;

    logger.info('Getting collection products', {
      instanceId,
      collectionId,
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

    // Create API client and collections service
    const client = new WixApiClient({ accessToken: instance.accessToken });
    const collectionsService = new CollectionsService(client, instanceId);

    // Get products
    const products = await collectionsService.getCollectionProducts(collectionId);

    res.json({
      success: true,
      data: products,
      instanceId,
    });
  })
);

export default router;
