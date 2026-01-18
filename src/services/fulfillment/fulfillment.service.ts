/**
 * Fulfillment Service
 * 
 * Handles fulfillment events and webhook notifications
 * for the UCP Fulfillment Extension.
 */

import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import {
  UCPWebhookEvent,
  FulfillmentEventType,
  FulfillmentStatus,
  WebhookSubscription,
  WebhookDelivery,
  TrackingInfo,
} from './fulfillment.types.js';

// ============================================================================
// In-Memory Storage (for POC - use Redis in production)
// ============================================================================

const webhookSubscriptions: Map<string, WebhookSubscription> = new Map();
const webhookDeliveries: Map<string, WebhookDelivery> = new Map();
const fulfillmentEvents: Map<string, UCPWebhookEvent[]> = new Map();

// ============================================================================
// Webhook Subscription Management
// ============================================================================

/**
 * Register a new webhook subscription
 */
export function registerWebhook(
  url: string,
  events: FulfillmentEventType[],
  secret?: string
): WebhookSubscription {
  const subscription: WebhookSubscription = {
    id: uuidv4(),
    url,
    events,
    secret,
    active: true,
    createdAt: new Date().toISOString(),
  };

  webhookSubscriptions.set(subscription.id, subscription);
  
  logger.info('Webhook subscription registered', {
    subscriptionId: subscription.id,
    url,
    events,
  });

  return subscription;
}

/**
 * Unregister a webhook subscription
 */
export function unregisterWebhook(subscriptionId: string): boolean {
  const deleted = webhookSubscriptions.delete(subscriptionId);
  
  if (deleted) {
    logger.info('Webhook subscription unregistered', { subscriptionId });
  }
  
  return deleted;
}

/**
 * Get all active webhook subscriptions
 */
export function getWebhookSubscriptions(): WebhookSubscription[] {
  return Array.from(webhookSubscriptions.values()).filter(s => s.active);
}

/**
 * Get subscription by ID
 */
export function getWebhookSubscription(id: string): WebhookSubscription | undefined {
  return webhookSubscriptions.get(id);
}

// ============================================================================
// Fulfillment Event Creation
// ============================================================================

/**
 * Create a fulfillment event from Wix order data
 */
export function createFulfillmentEvent(
  type: FulfillmentEventType,
  orderId: string,
  fulfillmentId: string,
  status: FulfillmentStatus,
  lineItems: { lineItemId: string; quantity: number }[],
  tracking?: TrackingInfo,
  merchantId: string = 'default'
): UCPWebhookEvent {
  const event: UCPWebhookEvent = {
    id: uuidv4(),
    type,
    timestamp: new Date().toISOString(),
    payload: {
      fulfillmentId,
      orderId,
      status,
      lineItems,
      tracking,
      timestamp: new Date().toISOString(),
    },
    merchantId,
  };

  // Store event for order
  const orderEvents = fulfillmentEvents.get(orderId) || [];
  orderEvents.push(event);
  fulfillmentEvents.set(orderId, orderEvents);

  logger.info('Fulfillment event created', {
    eventId: event.id,
    type,
    orderId,
    fulfillmentId,
  });

  return event;
}

/**
 * Get fulfillment events for an order
 */
export function getFulfillmentEvents(orderId: string): UCPWebhookEvent[] {
  return fulfillmentEvents.get(orderId) || [];
}

// ============================================================================
// Webhook Dispatch
// ============================================================================

/**
 * Dispatch a fulfillment event to all subscribed webhooks
 */
export async function dispatchFulfillmentEvent(event: UCPWebhookEvent): Promise<WebhookDelivery[]> {
  const deliveries: WebhookDelivery[] = [];
  const subscriptions = getWebhookSubscriptions().filter(
    sub => sub.events.includes(event.type)
  );

  logger.info('Dispatching fulfillment event', {
    eventId: event.id,
    type: event.type,
    subscriberCount: subscriptions.length,
  });

  for (const subscription of subscriptions) {
    const delivery = await deliverWebhook(subscription, event);
    deliveries.push(delivery);
  }

  return deliveries;
}

/**
 * Deliver webhook to a single subscription
 */
async function deliverWebhook(
  subscription: WebhookSubscription,
  event: UCPWebhookEvent
): Promise<WebhookDelivery> {
  const delivery: WebhookDelivery = {
    id: uuidv4(),
    subscriptionId: subscription.id,
    eventId: event.id,
    status: 'pending',
    attempts: 0,
  };

  try {
    delivery.attempts++;
    delivery.lastAttemptAt = new Date().toISOString();

    // Add signature if secret is configured
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-UCP-Event-Type': event.type,
      'X-UCP-Event-ID': event.id,
      'X-UCP-Timestamp': event.timestamp,
    };

    if (subscription.secret) {
      // In production, use HMAC-SHA256 signature
      headers['X-UCP-Signature'] = `sha256=${computeSignature(event, subscription.secret)}`;
    }

    const response = await fetch(subscription.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
    });

    delivery.responseStatus = response.status;

    if (response.ok) {
      delivery.status = 'delivered';
      logger.info('Webhook delivered successfully', {
        deliveryId: delivery.id,
        subscriptionId: subscription.id,
        status: response.status,
      });
    } else {
      delivery.status = 'failed';
      delivery.error = `HTTP ${response.status}: ${response.statusText}`;
      logger.warn('Webhook delivery failed', {
        deliveryId: delivery.id,
        subscriptionId: subscription.id,
        status: response.status,
      });
    }
  } catch (error) {
    delivery.status = 'failed';
    delivery.error = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Webhook delivery error', {
      deliveryId: delivery.id,
      subscriptionId: subscription.id,
      error: delivery.error,
    });
  }

  webhookDeliveries.set(delivery.id, delivery);
  return delivery;
}

/**
 * Compute HMAC signature for webhook payload
 */
function computeSignature(event: UCPWebhookEvent, _secret: string): string {
  // In production, use crypto.createHmac('sha256', secret)
  // For POC, we'll use a simple hash placeholder
  const payload = JSON.stringify(event);
  return Buffer.from(payload).toString('base64').substring(0, 32);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Map Wix fulfillment status to UCP fulfillment status
 */
export function mapWixFulfillmentStatusToUCP(wixStatus: string): FulfillmentStatus {
  const statusMap: Record<string, FulfillmentStatus> = {
    'PENDING': 'PENDING',
    'PACKED': 'PROCESSING',
    'READY_FOR_PICKUP': 'PROCESSING',
    'SHIPPED': 'SHIPPED',
    'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
    'DELIVERED': 'DELIVERED',
    'FAILED': 'FAILED',
    'CANCELLED': 'CANCELLED',
  };

  return statusMap[wixStatus?.toUpperCase()] || 'PENDING';
}

/**
 * Determine event type based on fulfillment status
 */
export function getEventTypeForStatus(status: FulfillmentStatus): FulfillmentEventType {
  switch (status) {
    case 'SHIPPED':
    case 'OUT_FOR_DELIVERY':
      return 'fulfillment.shipped';
    case 'DELIVERED':
      return 'fulfillment.delivered';
    case 'CANCELLED':
    case 'FAILED':
      return 'fulfillment.cancelled';
    default:
      return 'fulfillment.updated';
  }
}

/**
 * Clear all subscriptions and events (for testing)
 */
export function clearFulfillmentData(): void {
  webhookSubscriptions.clear();
  webhookDeliveries.clear();
  fulfillmentEvents.clear();
  logger.info('Fulfillment data cleared');
}
