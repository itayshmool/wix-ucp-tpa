/**
 * UCP Fulfillment Types
 * 
 * Types for the UCP Fulfillment Extension that handles
 * shipping updates and tracking information.
 */

import { z } from 'zod';

// ============================================================================
// Fulfillment Event Types
// ============================================================================

export const FulfillmentEventTypeSchema = z.enum([
  'fulfillment.created',
  'fulfillment.updated',
  'fulfillment.shipped',
  'fulfillment.delivered',
  'fulfillment.cancelled',
]);

export type FulfillmentEventType = z.infer<typeof FulfillmentEventTypeSchema>;

// ============================================================================
// Tracking Info
// ============================================================================

export const TrackingInfoSchema = z.object({
  carrier: z.string(),
  trackingNumber: z.string(),
  trackingUrl: z.string().url().optional(),
  estimatedDelivery: z.string().datetime().optional(),
});

export type TrackingInfo = z.infer<typeof TrackingInfoSchema>;

// ============================================================================
// Fulfillment Line Item
// ============================================================================

export const FulfillmentLineItemSchema = z.object({
  lineItemId: z.string(),
  quantity: z.number().positive(),
});

export type FulfillmentLineItem = z.infer<typeof FulfillmentLineItemSchema>;

// ============================================================================
// Fulfillment Status
// ============================================================================

export const FulfillmentStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
]);

export type FulfillmentStatus = z.infer<typeof FulfillmentStatusSchema>;

// ============================================================================
// Fulfillment Event Payload
// ============================================================================

export const FulfillmentEventPayloadSchema = z.object({
  fulfillmentId: z.string(),
  orderId: z.string(),
  status: FulfillmentStatusSchema,
  lineItems: z.array(FulfillmentLineItemSchema),
  tracking: TrackingInfoSchema.optional(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export type FulfillmentEventPayload = z.infer<typeof FulfillmentEventPayloadSchema>;

// ============================================================================
// UCP Webhook Event
// ============================================================================

export const UCPWebhookEventSchema = z.object({
  id: z.string(),
  type: FulfillmentEventTypeSchema,
  timestamp: z.string().datetime(),
  payload: FulfillmentEventPayloadSchema,
  merchantId: z.string(),
  signature: z.string().optional(),
});

export type UCPWebhookEvent = z.infer<typeof UCPWebhookEventSchema>;

// ============================================================================
// Webhook Subscription
// ============================================================================

export interface WebhookSubscription {
  id: string;
  url: string;
  events: FulfillmentEventType[];
  secret?: string;
  active: boolean;
  createdAt: string;
}

// ============================================================================
// Webhook Delivery Record
// ============================================================================

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt?: string;
  responseStatus?: number;
  error?: string;
}
