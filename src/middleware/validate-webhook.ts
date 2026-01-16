/**
 * Webhook Validation Middleware
 * 
 * Validates Wix webhook signatures to ensure authenticity.
 * 
 * Wix signs webhooks using HMAC-SHA256 with the webhook public key.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { isWixWebhookPayload } from '../wix/types.js';

/**
 * Verify webhook signature
 */
function verifySignature(payload: string, signature: string): boolean {
  try {
    // Create HMAC using webhook public key
    const hmac = crypto.createHmac('sha256', config.WIX_WEBHOOK_PUBLIC_KEY);
    hmac.update(payload);
    const expectedSignature = hmac.digest('base64');

    // Compare signatures (timing-safe comparison)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Signature verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Middleware to validate Wix webhooks
 */
export function validateWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get signature from header
    const signature = req.headers['x-wix-webhook-signature'] as string;

    if (!signature) {
      logger.warn('Webhook rejected: missing signature');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing webhook signature',
      });
      return;
    }

    // Get raw body (should be preserved by body parser)
    const rawBody = (req as Request & { rawBody?: string }).rawBody;

    if (!rawBody) {
      logger.error('Webhook validation failed: raw body not available');
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Cannot validate webhook signature',
      });
      return;
    }

    // Verify signature
    const isValid = verifySignature(rawBody, signature);

    if (!isValid) {
      logger.warn('Webhook rejected: invalid signature');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook signature',
      });
      return;
    }

    // Validate payload structure
    if (!isWixWebhookPayload(req.body)) {
      logger.warn('Webhook rejected: invalid payload structure');
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid webhook payload',
      });
      return;
    }

    logger.debug('Webhook signature validated', {
      instanceId: req.body.instanceId,
      eventType: req.body.eventType,
    });

    next();
  } catch (error) {
    logger.error('Webhook validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Webhook validation failed',
    });
  }
}

/**
 * Middleware to preserve raw body for webhook signature validation
 */
export function preserveRawBody(
  req: Request,
  _res: Response,
  buf: Buffer,
  encoding: BufferEncoding
): void {
  if (buf && buf.length) {
    (req as Request & { rawBody?: string }).rawBody = buf.toString(
      encoding || 'utf8'
    );
  }
}
