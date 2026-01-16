/**
 * Webhook Routes
 * 
 * Handles incoming webhooks from Wix
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { validateWebhook } from '../middleware/validate-webhook.js';
import { handleWebhookEvent } from '../wix/webhooks.js';
import { WixWebhookPayload } from '../wix/types.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /webhooks
 * 
 * Receives and processes Wix webhooks
 */
router.post(
  '/',
  validateWebhook,
  asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as WixWebhookPayload;

    logger.info('Webhook received', {
      eventType: payload.eventType,
      instanceId: payload.instanceId,
    });

    // Process webhook asynchronously
    // We respond immediately to Wix, then process in background
    res.status(200).json({ received: true });

    // Process the webhook
    try {
      await handleWebhookEvent(payload);
    } catch (error) {
      // Log error but don't fail the response
      // (we already responded to Wix)
      logger.error('Webhook processing failed', {
        eventType: payload.eventType,
        instanceId: payload.instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * GET /webhooks/health
 * 
 * Health check for webhook endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    endpoint: '/webhooks',
    message: 'Webhook endpoint is ready',
  });
});

export default router;
