/**
 * Orders API Routes
 * 
 * RESTful API endpoints for accessing and managing orders.
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error-handler.js';
import { instanceStore } from '../store/instances.js';
import { WixApiClient } from '../wix/client.js';
import { OrdersService } from '../services/orders/orders.service.js';
import { OrderStatus, PaymentStatus, CreateFulfillmentRequest } from '../services/types/order.types.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/:instanceId/orders
 * 
 * List orders with optional filtering
 * Query params:
 * - limit: number of orders (default: 50)
 * - offset: pagination offset (default: 0)
 * - status: filter by order status (comma-separated)
 * - paymentStatus: filter by payment status (comma-separated)
 * - search: search by order number or customer email
 * - fromDate: filter orders from date (ISO string)
 * - toDate: filter orders to date (ISO string)
 */
router.get(
  '/:instanceId/orders',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId } = req.params;
    const { limit, offset, status, paymentStatus, search, fromDate, toDate } = req.query;

    logger.info('Listing orders', {
      instanceId,
      limit,
      offset,
      hasFilters: !!(status || paymentStatus || search || fromDate || toDate),
    });

    // Get instance
    const instance = instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and orders service
    const client = new WixApiClient(instance.accessToken);
    const ordersService = new OrdersService(client, instanceId);

    // Build query
    const query: any = {
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    };

    // Parse status filters
    if (status) {
      const statusArray = (status as string).split(',').map((s) => s.trim());
      query.status = statusArray.filter((s) => Object.values(OrderStatus).includes(s as OrderStatus));
    }

    // Parse payment status filters
    if (paymentStatus) {
      const paymentStatusArray = (paymentStatus as string).split(',').map((s) => s.trim());
      query.paymentStatus = paymentStatusArray.filter((s) =>
        Object.values(PaymentStatus).includes(s as PaymentStatus)
      );
    }

    // Parse date range
    if (fromDate && toDate) {
      query.dateRange = {
        from: new Date(fromDate as string),
        to: new Date(toDate as string),
      };
    }

    // Search term
    if (search) {
      query.search = search as string;
    }

    // Query orders
    const result = await ordersService.listOrders(query);

    res.json({
      success: true,
      data: result,
      instanceId,
    });
  })
);

/**
 * GET /api/:instanceId/orders/:orderId
 * 
 * Get a single order by ID
 */
router.get(
  '/:instanceId/orders/:orderId',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId, orderId } = req.params;

    logger.info('Getting order', {
      instanceId,
      orderId,
    });

    // Get instance
    const instance = instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and orders service
    const client = new WixApiClient(instance.accessToken);
    const ordersService = new OrdersService(client, instanceId);

    // Get order
    const order = await ordersService.getOrder(orderId);

    res.json({
      success: true,
      data: order,
      instanceId,
    });
  })
);

/**
 * POST /api/:instanceId/orders/:orderId/cancel
 * 
 * Cancel an order
 */
router.post(
  '/:instanceId/orders/:orderId/cancel',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId, orderId } = req.params;

    logger.info('Canceling order', {
      instanceId,
      orderId,
    });

    // Get instance
    const instance = instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and orders service
    const client = new WixApiClient(instance.accessToken);
    const ordersService = new OrdersService(client, instanceId);

    // Cancel order
    const order = await ordersService.cancelOrder(orderId);

    res.json({
      success: true,
      data: order,
      instanceId,
      message: 'Order canceled successfully',
    });
  })
);

/**
 * POST /api/:instanceId/orders/:orderId/fulfill
 * 
 * Create fulfillment for an order
 * Body:
 * {
 *   "lineItems": [
 *     { "lineItemId": "item123", "quantity": 2 }
 *   ],
 *   "trackingInfo": {
 *     "trackingNumber": "1Z999AA1...",
 *     "carrier": "UPS",
 *     "trackingUrl": "https://..."
 *   }
 * }
 */
router.post(
  '/:instanceId/orders/:orderId/fulfill',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId, orderId } = req.params;
    const { lineItems, trackingInfo } = req.body;

    logger.info('Creating fulfillment', {
      instanceId,
      orderId,
      lineItemCount: lineItems?.length || 0,
    });

    // Validate request body
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      throw new AppError('lineItems array is required', 400);
    }

    // Get instance
    const instance = instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and orders service
    const client = new WixApiClient(instance.accessToken);
    const ordersService = new OrdersService(client, instanceId);

    // Create fulfillment request
    const fulfillmentRequest: CreateFulfillmentRequest = {
      orderId,
      lineItems,
      trackingInfo,
    };

    // Create fulfillment
    const fulfillment = await ordersService.createFulfillment(fulfillmentRequest);

    res.json({
      success: true,
      data: fulfillment,
      instanceId,
      message: 'Fulfillment created successfully',
    });
  })
);

/**
 * PATCH /api/:instanceId/orders/:orderId/fulfillments/:fulfillmentId/tracking
 * 
 * Update tracking information for a fulfillment
 * Body:
 * {
 *   "trackingNumber": "1Z999AA1...",
 *   "carrier": "UPS",
 *   "trackingUrl": "https://..."
 * }
 */
router.patch(
  '/:instanceId/orders/:orderId/fulfillments/:fulfillmentId/tracking',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId, orderId, fulfillmentId } = req.params;
    const trackingInfo = req.body;

    logger.info('Updating fulfillment tracking', {
      instanceId,
      orderId,
      fulfillmentId,
    });

    // Get instance
    const instance = instanceStore.get(instanceId);
    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check for access token
    if (!instance.accessToken) {
      throw new AppError('Access token not available. Please complete OAuth flow.', 401);
    }

    // Create API client and orders service
    const client = new WixApiClient(instance.accessToken);
    const ordersService = new OrdersService(client, instanceId);

    // Update tracking
    const fulfillment = await ordersService.updateFulfillmentTracking(
      orderId,
      fulfillmentId,
      trackingInfo
    );

    res.json({
      success: true,
      data: fulfillment,
      instanceId,
      message: 'Tracking information updated successfully',
    });
  })
);

export default router;
