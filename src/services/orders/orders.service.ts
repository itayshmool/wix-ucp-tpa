/**
 * Orders Service
 * 
 * Service for accessing and managing Wix eCommerce orders.
 */

import { WixApiClient } from '../../wix/client.js';
import { logger } from '../../utils/logger.js';
import {
  Order,
  OrderQuery,
  OrderListResult,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  OrderLineItem,
  Money,
  Address,
  Buyer,
  ShippingInfo,
  BillingInfo,
  OrderPricing,
  Fulfillment,
  CreateFulfillmentRequest,
  TrackingInfo,
} from '../types/order.types.js';

export class OrdersService {
  private client: WixApiClient;
  private instanceId: string;

  constructor(client: WixApiClient, instanceId: string) {
    this.client = client;
    this.instanceId = instanceId;
  }

  /**
   * List orders with optional filtering and pagination
   */
  async listOrders(query: OrderQuery = {}): Promise<OrderListResult> {
    const { limit = 50, offset = 0, status, paymentStatus, dateRange, search } = query;

    logger.info('Listing orders', {
      instanceId: this.instanceId,
      limit,
      offset,
      hasFilters: !!(status || paymentStatus || dateRange || search),
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

      if (status && status.length > 0) {
        filters.push({ status: { $in: status } });
      }

      if (paymentStatus && paymentStatus.length > 0) {
        filters.push({ paymentStatus: { $in: paymentStatus } });
      }

      if (dateRange) {
        filters.push({
          _createdDate: {
            $gte: dateRange.from.toISOString(),
            $lte: dateRange.to.toISOString(),
          },
        });
      }

      if (search) {
        filters.push({
          $or: [
            { number: { $contains: search } },
            { 'buyer.email': { $contains: search } },
          ],
        });
      }

      if (filters.length > 0) {
        requestBody.query.filter = filters.length === 1 ? filters[0] : { $and: filters };
      }

      const response: any = await this.client.post('/ecom/v1/orders/query', requestBody);

      const orders = (response.orders || []).map((raw: any) => this.normalizeOrder(raw));

      return {
        orders,
        totalCount: response.metadata?.count || orders.length,
        hasMore: orders.length === limit,
      };
    } catch (error) {
      logger.error('Failed to list orders', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get a single order by ID
   */
  async getOrder(orderId: string): Promise<Order> {
    logger.info('Getting order', {
      instanceId: this.instanceId,
      orderId,
    });

    try {
      const response: any = await this.client.get(`/ecom/v1/orders/${orderId}`);
      return this.normalizeOrder(response.order);
    } catch (error) {
      logger.error('Failed to get order', {
        instanceId: this.instanceId,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Search orders by term (order number or customer email)
   */
  async searchOrders(searchTerm: string, limit: number = 20): Promise<Order[]> {
    const result = await this.listOrders({
      search: searchTerm,
      limit,
    });
    return result.orders;
  }

  /**
   * Get orders by customer email
   */
  async getOrdersByCustomer(email: string): Promise<Order[]> {
    return await this.searchOrders(email, 100);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<Order> {
    logger.info('Canceling order', {
      instanceId: this.instanceId,
      orderId,
    });

    try {
      const response: any = await this.client.post(`/ecom/v1/orders/${orderId}/cancel`, {});
      return this.normalizeOrder(response.order);
    } catch (error) {
      logger.error('Failed to cancel order', {
        instanceId: this.instanceId,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create fulfillment for an order
   */
  async createFulfillment(request: CreateFulfillmentRequest): Promise<Fulfillment> {
    const { orderId, lineItems, trackingInfo } = request;

    logger.info('Creating fulfillment', {
      instanceId: this.instanceId,
      orderId,
      lineItemCount: lineItems.length,
      hasTracking: !!trackingInfo,
    });

    try {
      const requestBody: any = {
        fulfillment: {
          lineItems: lineItems.map((item) => ({
            id: item.lineItemId,
            quantity: item.quantity,
          })),
        },
      };

      if (trackingInfo) {
        requestBody.fulfillment.trackingInfo = {
          trackingNumber: trackingInfo.trackingNumber,
          shippingProvider: trackingInfo.carrier,
          trackingLink: trackingInfo.trackingUrl,
        };
      }

      const response: any = await this.client.post(
        `/ecom/v1/orders/${orderId}/fulfillments`,
        requestBody
      );

      return this.normalizeFulfillment(response.fulfillment);
    } catch (error) {
      logger.error('Failed to create fulfillment', {
        instanceId: this.instanceId,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update fulfillment tracking information
   */
  async updateFulfillmentTracking(
    orderId: string,
    fulfillmentId: string,
    trackingInfo: TrackingInfo
  ): Promise<Fulfillment> {
    logger.info('Updating fulfillment tracking', {
      instanceId: this.instanceId,
      orderId,
      fulfillmentId,
    });

    try {
      const response: any = await this.client.patch(
        `/ecom/v1/orders/${orderId}/fulfillments/${fulfillmentId}`,
        {
          fulfillment: {
            trackingInfo: {
              trackingNumber: trackingInfo.trackingNumber,
              shippingProvider: trackingInfo.carrier,
              trackingLink: trackingInfo.trackingUrl,
            },
          },
        }
      );

      return this.normalizeFulfillment(response.fulfillment);
    } catch (error) {
      logger.error('Failed to update fulfillment tracking', {
        instanceId: this.instanceId,
        orderId,
        fulfillmentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ============================================================================
  // Normalization (Convert Wix API data to unified Order interface)
  // ============================================================================

  private normalizeOrder(raw: any): Order {
    return {
      id: raw._id || raw.id,
      number: raw.number || raw._id,
      status: this.normalizeOrderStatus(raw.status),
      paymentStatus: this.normalizePaymentStatus(raw.paymentStatus),
      fulfillmentStatus: this.normalizeFulfillmentStatus(raw.fulfillmentStatus),
      buyer: this.normalizeBuyer(raw.buyerInfo || raw.buyer),
      lineItems: (raw.lineItems || []).map((item: any) => this.normalizeLineItem(item)),
      shippingInfo: this.normalizeShippingInfo(raw.shippingInfo),
      billingInfo: this.normalizeBillingInfo(raw.billingInfo),
      pricing: this.normalizePricing(raw.priceSummary || raw.pricing),
      fulfillments: (raw.fulfillments || []).map((f: any) => this.normalizeFulfillment(f)),
      channelInfo: raw.channelInfo || raw.channel,
      customerNote: raw.buyerNote || raw.customerNote,
      createdAt: raw._createdDate ? new Date(raw._createdDate) : new Date(),
      updatedAt: raw._updatedDate ? new Date(raw._updatedDate) : new Date(),
    };
  }

  private normalizeOrderStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      INITIALIZED: OrderStatus.INITIALIZED,
      APPROVED: OrderStatus.APPROVED,
      CANCELED: OrderStatus.CANCELED,
      FULFILLED: OrderStatus.FULFILLED,
      PARTIALLY_FULFILLED: OrderStatus.PARTIALLY_FULFILLED,
    };
    return statusMap[status] || OrderStatus.INITIALIZED;
  }

  private normalizePaymentStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      NOT_PAID: PaymentStatus.NOT_PAID,
      PENDING: PaymentStatus.PENDING,
      PAID: PaymentStatus.PAID,
      PARTIALLY_REFUNDED: PaymentStatus.PARTIALLY_REFUNDED,
      FULLY_REFUNDED: PaymentStatus.FULLY_REFUNDED,
    };
    return statusMap[status] || PaymentStatus.NOT_PAID;
  }

  private normalizeFulfillmentStatus(status: string): FulfillmentStatus {
    const statusMap: Record<string, FulfillmentStatus> = {
      NOT_FULFILLED: FulfillmentStatus.NOT_FULFILLED,
      PARTIALLY_FULFILLED: FulfillmentStatus.PARTIALLY_FULFILLED,
      FULFILLED: FulfillmentStatus.FULFILLED,
    };
    return statusMap[status] || FulfillmentStatus.NOT_FULFILLED;
  }

  private normalizeBuyer(buyer: any): Buyer {
    if (!buyer) return {};

    return {
      contactId: buyer.contactId || buyer.id,
      email: buyer.email,
      phone: buyer.phone,
      firstName: buyer.firstName,
      lastName: buyer.lastName,
    };
  }

  private normalizeLineItem(item: any): OrderLineItem {
    return {
      id: item._id || item.id,
      productId: item.catalogReference?.catalogItemId || item.productId,
      variantId: item.catalogReference?.options?.variantId || item.variantId,
      name: item.productName?.translated || item.productName?.original || item.name || 'Unknown',
      quantity: item.quantity || 0,
      sku: item.sku,
      price: this.normalizeMoney(item.price || item.priceData),
      totalPrice: this.normalizeMoney(item.totalPrice || item.priceData),
      weight: item.physicalProperties?.weight,
      weightUnit: item.physicalProperties?.weightUnit,
      media: item.image ? { url: item.image, altText: item.name } : undefined,
      options: item.descriptionLines?.map((line: any) => ({
        option: line.name?.translated || line.name?.original || '',
        value: line.colorInfo?.original || line.plainText?.original || '',
      })),
      fulfilledQuantity: item.fulfilledQuantity || 0,
    };
  }

  private normalizeMoney(money: any): Money {
    if (!money) {
      return { amount: 0, currency: 'USD', formatted: '$0.00' };
    }

    const amount = parseFloat(money.amount || money.value || '0');
    const currency = money.currency || 'USD';
    const formatted = money.formattedAmount || money.formatted || `${currency} ${amount.toFixed(2)}`;

    return { amount, currency, formatted };
  }

  private normalizeAddress(addr: any): Address | undefined {
    if (!addr) return undefined;

    return {
      street: addr.addressLine1 || addr.street,
      street2: addr.addressLine2,
      city: addr.city,
      state: addr.subdivision || addr.state,
      postalCode: addr.postalCode || addr.zipCode,
      country: addr.country,
      formatted: addr.formatted,
    };
  }

  private normalizeShippingInfo(shipping: any): ShippingInfo | undefined {
    if (!shipping) return undefined;

    return {
      address: this.normalizeAddress(shipping.shippingDestination || shipping.address),
      deliveryOption: shipping.deliveryOption?.title || shipping.deliveryOption,
      estimatedDelivery: shipping.estimatedDeliveryTime
        ? new Date(shipping.estimatedDeliveryTime)
        : undefined,
      price: this.normalizeMoney(shipping.cost || shipping.price),
    };
  }

  private normalizeBillingInfo(billing: any): BillingInfo | undefined {
    if (!billing) return undefined;

    return {
      address: this.normalizeAddress(billing.address),
    };
  }

  private normalizePricing(pricing: any): OrderPricing {
    if (!pricing) {
      const zero = { amount: 0, currency: 'USD', formatted: '$0.00' };
      return {
        subtotal: zero,
        shipping: zero,
        tax: zero,
        discount: zero,
        total: zero,
      };
    }

    return {
      subtotal: this.normalizeMoney(pricing.subtotal),
      shipping: this.normalizeMoney(pricing.shipping),
      tax: this.normalizeMoney(pricing.tax),
      discount: this.normalizeMoney(pricing.discount),
      total: this.normalizeMoney(pricing.total),
    };
  }

  private normalizeFulfillment(fulfillment: any): Fulfillment {
    return {
      id: fulfillment._id || fulfillment.id,
      lineItems: (fulfillment.lineItems || []).map((item: any) => ({
        lineItemId: item.id || item.lineItemId,
        quantity: item.quantity || 0,
      })),
      trackingInfo: fulfillment.trackingInfo
        ? {
            trackingNumber: fulfillment.trackingInfo.trackingNumber,
            carrier: fulfillment.trackingInfo.shippingProvider || fulfillment.trackingInfo.carrier,
            trackingUrl: fulfillment.trackingInfo.trackingLink || fulfillment.trackingInfo.trackingUrl,
          }
        : undefined,
      createdAt: fulfillment._createdDate ? new Date(fulfillment._createdDate) : new Date(),
    };
  }
}
