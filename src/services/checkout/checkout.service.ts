/**
 * Checkout Service
 * 
 * Manages Wix eCommerce checkouts and generates hosted checkout URLs.
 * This is the CRITICAL service that enables LLM agents to complete purchases.
 */

import { WixApiClient } from '../../wix/client.js';
import { logger } from '../../utils/logger.js';
import {
  Checkout,
  CheckoutStatus,
  PaymentStatus,
  CheckoutLineItem,
  PriceSummary,
  CreateCheckoutOptions,
  CheckoutUrlOptions,
  CheckoutUrlResult,
  BuyerInfo,
  Address,
  ContactDetails,
} from '../types/checkout.types.js';
import { Money } from '../types/cart.types.js';

export class CheckoutService {
  private client: WixApiClient;

  constructor(accessToken: string) {
    this.client = new WixApiClient(accessToken);
  }

  /**
   * Create checkout from cart
   * This is the primary method for converting a cart into a checkout
   */
  async createCheckoutFromCart(cartId: string, options?: CreateCheckoutOptions): Promise<Checkout> {
    logger.info('Creating checkout from cart', { cartId, options });

    try {
      const payload: Record<string, unknown> = {
        cartId,
      };

      if (options?.channelType) {
        payload.channelType = options.channelType;
      }
      if (options?.buyerInfo) {
        payload.buyerInfo = options.buyerInfo;
      }
      if (options?.shippingAddress) {
        payload.shippingInfo = {
          address: options.shippingAddress,
        };
      }
      if (options?.billingAddress) {
        payload.billingInfo = {
          address: options.billingAddress,
        };
      }

      const response = await this.client.post<{ checkout: unknown }>(
        '/ecom/v1/checkouts',
        payload
      );

      const checkout = this.normalizeCheckout(response.checkout);
      logger.info('Checkout created from cart', { checkoutId: checkout.id, cartId });

      return checkout;
    } catch (error) {
      logger.error('Failed to create checkout from cart', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        cartId 
      });
      throw error;
    }
  }

  /**
   * Create checkout directly (without cart)
   */
  async createCheckout(lineItems: CheckoutLineItem[], options?: CreateCheckoutOptions): Promise<Checkout> {
    logger.info('Creating checkout directly', { itemCount: lineItems.length, options });

    try {
      const payload: Record<string, unknown> = {
        lineItems,
      };

      if (options?.channelType) {
        payload.channelType = options.channelType;
      }
      if (options?.buyerInfo) {
        payload.buyerInfo = options.buyerInfo;
      }
      if (options?.shippingAddress) {
        payload.shippingInfo = {
          address: options.shippingAddress,
        };
      }
      if (options?.billingAddress) {
        payload.billingInfo = {
          address: options.billingAddress,
        };
      }

      const response = await this.client.post<{ checkout: unknown }>(
        '/ecom/v1/checkouts',
        payload
      );

      const checkout = this.normalizeCheckout(response.checkout);
      logger.info('Checkout created directly', { checkoutId: checkout.id });

      return checkout;
    } catch (error) {
      logger.error('Failed to create checkout', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        itemCount: lineItems.length 
      });
      throw error;
    }
  }

  /**
   * Get checkout by ID
   */
  async getCheckout(checkoutId: string): Promise<Checkout> {
    logger.debug('Fetching checkout', { checkoutId });

    try {
      const response = await this.client.get<{ checkout: unknown }>(
        `/ecom/v1/checkouts/${checkoutId}`
      );

      const checkout = this.normalizeCheckout(response.checkout);
      return checkout;
    } catch (error) {
      logger.error('Failed to fetch checkout', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        checkoutId 
      });
      throw error;
    }
  }

  /**
   * Get checkout URL - **THE CRITICAL METHOD**
   * This generates the Wix hosted checkout URL where the buyer completes payment
   */
  async getCheckoutUrl(checkoutId: string, options?: CheckoutUrlOptions): Promise<string> {
    logger.info('Generating checkout URL', { checkoutId, options });

    try {
      const payload: Record<string, unknown> = {};

      if (options?.successUrl) {
        payload.successUrl = options.successUrl;
      }
      if (options?.cancelUrl) {
        payload.cancelUrl = options.cancelUrl;
      }
      if (options?.thankYouPageUrl) {
        payload.thankYouPageUrl = options.thankYouPageUrl;
      }

      const response = await this.client.post<{ checkoutUrl: string }>(
        `/ecom/v1/checkouts/${checkoutId}/createCheckoutUrl`,
        payload
      );

      const checkoutUrl = response.checkoutUrl;
      logger.info('Checkout URL generated successfully', { checkoutId, checkoutUrl });

      return checkoutUrl;
    } catch (error) {
      logger.error('Failed to generate checkout URL', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        checkoutId 
      });
      throw error;
    }
  }

  /**
   * Update buyer info on checkout
   */
  async updateBuyerInfo(checkoutId: string, buyerInfo: BuyerInfo): Promise<Checkout> {
    logger.info('Updating checkout buyer info', { checkoutId });

    try {
      const response = await this.client.patch<{ checkout: unknown }>(
        `/ecom/v1/checkouts/${checkoutId}`,
        { buyerInfo }
      );

      const checkout = this.normalizeCheckout(response.checkout);
      logger.info('Checkout buyer info updated', { checkoutId });

      return checkout;
    } catch (error) {
      logger.error('Failed to update checkout buyer info', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        checkoutId 
      });
      throw error;
    }
  }

  /**
   * Update shipping address on checkout
   */
  async updateShippingAddress(
    checkoutId: string, 
    address: Address, 
    contactDetails?: ContactDetails
  ): Promise<Checkout> {
    logger.info('Updating checkout shipping address', { checkoutId });

    try {
      const payload: Record<string, unknown> = {
        shippingInfo: {
          address,
          ...(contactDetails && { contactDetails }),
        },
      };

      const response = await this.client.patch<{ checkout: unknown }>(
        `/ecom/v1/checkouts/${checkoutId}`,
        payload
      );

      const checkout = this.normalizeCheckout(response.checkout);
      logger.info('Checkout shipping address updated', { checkoutId });

      return checkout;
    } catch (error) {
      logger.error('Failed to update checkout shipping address', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        checkoutId 
      });
      throw error;
    }
  }

  /**
   * Convenience method: Create checkout from cart and get URL in one call
   * This is what LLM agents will typically use
   */
  async getCheckoutUrlFromCart(cartId: string, options?: CheckoutUrlOptions & CreateCheckoutOptions): Promise<CheckoutUrlResult> {
    logger.info('Creating checkout from cart and generating URL', { cartId });

    const checkout = await this.createCheckoutFromCart(cartId, options);
    const checkoutUrl = await this.getCheckoutUrl(checkout.id, options);

    return {
      checkoutId: checkout.id,
      checkoutUrl,
    };
  }

  /**
   * Normalize checkout from Wix API response
   */
  private normalizeCheckout(data: any): Checkout {
    return {
      id: data.id || data._id,
      cartId: data.cartId,
      lineItems: (data.lineItems || []).map((item: unknown) => this.normalizeLineItem(item)),
      billingInfo: data.billingInfo,
      shippingInfo: data.shippingInfo,
      buyerInfo: data.buyerInfo,
      priceSummary: this.normalizePriceSummary(data.priceSummary || data.totals),
      appliedDiscounts: data.appliedDiscounts || [],
      paymentStatus: this.normalizePaymentStatus(data.paymentStatus),
      status: this.normalizeCheckoutStatus(data.status),
      currency: data.currency || 'USD',
      checkoutUrl: data.checkoutUrl,
      createdAt: data.createdDate ? new Date(data.createdDate) : new Date(),
      updatedAt: data.updatedDate ? new Date(data.updatedDate) : new Date(),
    };
  }

  /**
   * Normalize line item
   */
  private normalizeLineItem(data: any): CheckoutLineItem {
    return {
      id: data.id || data._id,
      productId: data.productName?.original || data.catalogReference?.catalogItemId || '',
      quantity: data.quantity || 1,
      name: data.productName?.translated || data.productName?.original || 'Unknown Product',
      sku: data.sku,
      price: this.normalizeMoney(data.price),
      totalPrice: this.normalizeMoney(data.lineItemPrice || data.priceBreakdown?.totalPrice),
      media: data.media?.[0] || data.image,
      options: data.options,
    };
  }

  /**
   * Normalize price summary
   */
  private normalizePriceSummary(data: any): PriceSummary {
    return {
      subtotal: this.normalizeMoney(data?.subtotal),
      shipping: data?.shipping ? this.normalizeMoney(data.shipping) : undefined,
      tax: data?.tax ? this.normalizeMoney(data.tax) : undefined,
      discount: data?.discount ? this.normalizeMoney(data.discount) : undefined,
      total: this.normalizeMoney(data?.total),
    };
  }

  /**
   * Normalize payment status
   */
  private normalizePaymentStatus(status: string | undefined): PaymentStatus {
    if (!status) return PaymentStatus.PENDING;

    const statusMap: Record<string, PaymentStatus> = {
      'PENDING': PaymentStatus.PENDING,
      'PAID': PaymentStatus.PAID,
      'PARTIALLY_PAID': PaymentStatus.PAID,
      'NOT_PAID': PaymentStatus.PENDING,
      'FAILED': PaymentStatus.FAILED,
      'REFUNDED': PaymentStatus.REFUNDED,
      'PARTIALLY_REFUNDED': PaymentStatus.REFUNDED,
    };

    return statusMap[status.toUpperCase()] || PaymentStatus.PENDING;
  }

  /**
   * Normalize checkout status
   */
  private normalizeCheckoutStatus(status: string | undefined): CheckoutStatus {
    if (!status) return CheckoutStatus.CREATED;

    const statusMap: Record<string, CheckoutStatus> = {
      'CREATED': CheckoutStatus.CREATED,
      'INITIALIZED': CheckoutStatus.CREATED,
      'COMPLETED': CheckoutStatus.COMPLETED,
      'ABANDONED': CheckoutStatus.ABANDONED,
      'CANCELED': CheckoutStatus.ABANDONED,
    };

    return statusMap[status.toUpperCase()] || CheckoutStatus.CREATED;
  }

  /**
   * Normalize money object
   */
  private normalizeMoney(data: any): Money {
    if (!data) {
      return { amount: '0', currency: 'USD', formattedAmount: '$0.00' };
    }

    return {
      amount: data.amount || data.value || '0',
      currency: data.currency || 'USD',
      formattedAmount: data.formattedAmount || data.formatted || `$${data.amount || '0'}`,
    };
  }
}
