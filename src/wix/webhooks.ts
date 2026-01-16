/**
 * Wix Webhook Handlers
 * 
 * Processes incoming webhooks from Wix platform.
 */

import { logger } from '../utils/logger.js';
import { instanceStore } from '../store/instances.js';
import { WixWebhookPayload, WixWebhookEventType } from './types.js';
import { revokeAccess } from './auth.js';

/**
 * Handle app installed event
 */
async function handleAppInstalled(payload: WixWebhookPayload): Promise<void> {
  logger.info('App installed webhook received', {
    instanceId: payload.instanceId,
  });

  // The instance should already be in the store from OAuth flow
  const instance = instanceStore.get(payload.instanceId);

  if (!instance) {
    logger.warn('Instance not found for app.installed event', {
      instanceId: payload.instanceId,
    });
    return;
  }

  logger.info('App installation confirmed', {
    instanceId: payload.instanceId,
  });
}

/**
 * Handle app removed event
 */
async function handleAppRemoved(payload: WixWebhookPayload): Promise<void> {
  logger.info('App removed webhook received', {
    instanceId: payload.instanceId,
  });

  try {
    await revokeAccess(payload.instanceId);
    logger.info('Successfully processed app removal', {
      instanceId: payload.instanceId,
    });
  } catch (error) {
    logger.error('Failed to process app removal', {
      instanceId: payload.instanceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle site published event
 */
async function handleSitePublished(payload: WixWebhookPayload): Promise<void> {
  logger.info('Site published webhook received', {
    instanceId: payload.instanceId,
  });

  const instance = instanceStore.get(payload.instanceId);

  if (!instance) {
    logger.warn('Instance not found for site.published event', {
      instanceId: payload.instanceId,
    });
    return;
  }

  // TODO: In later phases, trigger any necessary sync operations
  logger.debug('Site published event processed', {
    instanceId: payload.instanceId,
  });
}

/**
 * Handle site unpublished event
 */
async function handleSiteUnpublished(
  payload: WixWebhookPayload
): Promise<void> {
  logger.info('Site unpublished webhook received', {
    instanceId: payload.instanceId,
  });

  // TODO: In later phases, handle site becoming unavailable
  logger.debug('Site unpublished event processed', {
    instanceId: payload.instanceId,
  });
}

/**
 * Main webhook event handler
 */
export async function handleWebhookEvent(
  payload: WixWebhookPayload
): Promise<void> {
  logger.info('Processing webhook event', {
    eventType: payload.eventType,
    instanceId: payload.instanceId,
  });

  try {
    switch (payload.eventType) {
      case WixWebhookEventType.APP_INSTALLED:
        await handleAppInstalled(payload);
        break;

      case WixWebhookEventType.APP_REMOVED:
        await handleAppRemoved(payload);
        break;

      case WixWebhookEventType.SITE_PUBLISHED:
        await handleSitePublished(payload);
        break;

      case WixWebhookEventType.SITE_UNPUBLISHED:
        await handleSiteUnpublished(payload);
        break;

      default:
        logger.warn('Unknown webhook event type', {
          eventType: payload.eventType,
          instanceId: payload.instanceId,
        });
    }

    logger.info('Webhook event processed successfully', {
      eventType: payload.eventType,
      instanceId: payload.instanceId,
    });
  } catch (error) {
    logger.error('Webhook event processing failed', {
      eventType: payload.eventType,
      instanceId: payload.instanceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
