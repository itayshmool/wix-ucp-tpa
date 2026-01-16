/**
 * Cart Service
 * 
 * Manages Wix eCommerce carts programmatically.
 * Carts are created and modified before being converted to checkouts.
 */

import { WixApiClient } from '../../wix/client.js';
import { logger } from '../../utils/logger.js';
import {
  Cart,
  CartLineItem,
  AddToCartItem,
  CartOptions,
  AddToCartResult,
  CatalogReference,
  WIX_STORES_APP_ID,
  Money,
  AppliedDiscount,
} from '../types/cart.types.js';

export class CartService {
  private client: WixApiClient;

  constructor(accessToken: string) {
    this.client = new WixApiClient(accessToken);
  }

  /**
   * Create an empty cart
   */
  async createCart(options?: CartOptions): Promise<Cart> {
    logger.info('Creating new cart', { options });

    try {
      const payload: Record<string, unknown> = {};

      if (options?.currency) {
        payload.currency = options.currency;
      }
      if (options?.buyerNote) {
        payload.buyerNote = options.buyerNote;
      }

      const response = await this.client.post<{ cart: unknown }>(
        '/ecom/v1/carts',
        payload
      );

      const cart = this.normalizeCart(response.cart);
      logger.info('Cart created successfully', { cartId: cart.id });

      return cart;
    } catch (error) {
      logger.error('Failed to create cart', { error: error instanceof Error ? error.message : 'Unknown error', options });
      throw error;
    }
  }

  /**
   * Get cart by ID
   */
  async getCart(cartId: string): Promise<Cart> {
    logger.debug('Fetching cart', { cartId });

    try {
      const response = await this.client.get<{ cart: unknown }>(
        `/ecom/v1/carts/${cartId}`
      );

      const cart = this.normalizeCart(response.cart);
      return cart;
    } catch (error) {
      logger.error('Failed to fetch cart', { error: error instanceof Error ? error.message : 'Unknown error', cartId });
      throw error;
    }
  }

  /**
   * Add items to cart
   */
  async addToCart(cartId: string, items: AddToCartItem[]): Promise<AddToCartResult> {
    logger.info('Adding items to cart', { cartId, itemCount: items.length });

    try {
      const response = await this.client.post<{ cart: unknown; addedLineItems: unknown[] }>(
        `/ecom/v1/carts/${cartId}/add-to-cart`,
        { lineItems: items }
      );

      const cart = this.normalizeCart(response.cart);
      const addedItems = (response.addedLineItems || []).map((item: unknown) => this.normalizeLineItem(item));

      logger.info('Items added to cart successfully', { cartId, addedItemCount: addedItems.length });

      return { cart, addedItems };
    } catch (error) {
      logger.error('Failed to add items to cart', { error: error instanceof Error ? error.message : 'Unknown error', cartId, itemCount: items.length });
      throw error;
    }
  }

  /**
   * Update line item quantity
   */
  async updateLineItemQuantity(cartId: string, lineItemId: string, quantity: number): Promise<Cart> {
    logger.info('Updating line item quantity', { cartId, lineItemId, quantity });

    try {
      const response = await this.client.post<{ cart: unknown }>(
        `/ecom/v1/carts/${cartId}/update-line-items-quantity`,
        {
          lineItems: [{ id: lineItemId, quantity }]
        }
      );

      const cart = this.normalizeCart(response.cart);
      logger.info('Line item quantity updated', { cartId, lineItemId, quantity });

      return cart;
    } catch (error) {
      logger.error('Failed to update line item quantity', { error: error instanceof Error ? error.message : 'Unknown error', cartId, lineItemId, quantity });
      throw error;
    }
  }

  /**
   * Remove line item from cart
   */
  async removeLineItem(cartId: string, lineItemId: string): Promise<Cart> {
    logger.info('Removing line item from cart', { cartId, lineItemId });

    try {
      const response = await this.client.post<{ cart: unknown }>(
        `/ecom/v1/carts/${cartId}/remove-line-items`,
        {
          lineItemIds: [lineItemId]
        }
      );

      const cart = this.normalizeCart(response.cart);
      logger.info('Line item removed from cart', { cartId, lineItemId });

      return cart;
    } catch (error) {
      logger.error('Failed to remove line item', { error: error instanceof Error ? error.message : 'Unknown error', cartId, lineItemId });
      throw error;
    }
  }

  /**
   * Apply coupon code to cart
   */
  async applyCoupon(cartId: string, couponCode: string): Promise<Cart> {
    logger.info('Applying coupon to cart', { cartId, couponCode });

    try {
      const response = await this.client.post<{ cart: unknown }>(
        `/ecom/v1/carts/${cartId}/add-coupon`,
        { couponCode }
      );

      const cart = this.normalizeCart(response.cart);
      logger.info('Coupon applied to cart', { cartId, couponCode });

      return cart;
    } catch (error) {
      logger.error('Failed to apply coupon', { error: error instanceof Error ? error.message : 'Unknown error', cartId, couponCode });
      throw error;
    }
  }

  /**
   * Remove coupon from cart
   */
  async removeCoupon(cartId: string, couponId: string): Promise<Cart> {
    logger.info('Removing coupon from cart', { cartId, couponId });

    try {
      const response = await this.client.post<{ cart: unknown }>(
        `/ecom/v1/carts/${cartId}/remove-coupon`,
        { couponId }
      );

      const cart = this.normalizeCart(response.cart);
      logger.info('Coupon removed from cart', { cartId, couponId });

      return cart;
    } catch (error) {
      logger.error('Failed to remove coupon', { error: error instanceof Error ? error.message : 'Unknown error', cartId, couponId });
      throw error;
    }
  }

  /**
   * Delete cart
   */
  async deleteCart(cartId: string): Promise<void> {
    logger.info('Deleting cart', { cartId });

    try {
      await this.client.delete(`/ecom/v1/carts/${cartId}`);
      logger.info('Cart deleted successfully', { cartId });
    } catch (error) {
      logger.error('Failed to delete cart', { error: error instanceof Error ? error.message : 'Unknown error', cartId });
      throw error;
    }
  }

  /**
   * Create cart with items in one call
   */
  async createCartWithItems(items: AddToCartItem[], options?: CartOptions): Promise<Cart> {
    logger.info('Creating cart with items', { itemCount: items.length, options });

    const cart = await this.createCart(options);
    const { cart: updatedCart } = await this.addToCart(cart.id, items);

    // Apply coupon if provided
    if (options?.couponCode) {
      return await this.applyCoupon(updatedCart.id, options.couponCode);
    }

    return updatedCart;
  }

  /**
   * Build catalog reference for adding product to cart
   */
  buildCatalogReference(
    productId: string,
    variantId?: string,
    options?: { customTextFields?: Record<string, string> }
  ): CatalogReference {
    return {
      catalogItemId: variantId || productId,
      appId: WIX_STORES_APP_ID,
      options: {
        ...(variantId && { variantId }),
        ...(options?.customTextFields && { customTextFields: options.customTextFields }),
      },
    };
  }

  /**
   * Normalize cart from Wix API response
   */
  private normalizeCart(data: any): Cart {
    return {
      id: data.id || data._id,
      lineItems: (data.lineItems || []).map((item: unknown) => this.normalizeLineItem(item)),
      buyerInfo: data.buyerInfo,
      currency: data.currency || 'USD',
      subtotal: this.normalizeMoney(data.subtotal || data.priceSummary?.subtotal),
      appliedDiscounts: (data.appliedDiscounts || []).map((discount: unknown) => this.normalizeDiscount(discount)),
      buyerNote: data.buyerNote,
      createdAt: data.createdDate ? new Date(data.createdDate) : new Date(),
      updatedAt: data.updatedDate ? new Date(data.updatedDate) : new Date(),
    };
  }

  /**
   * Normalize line item
   */
  private normalizeLineItem(data: any): CartLineItem {
    return {
      id: data.id || data._id,
      productId: data.productName?.original || data.catalogReference?.catalogItemId || '',
      quantity: data.quantity || 1,
      catalogReference: data.catalogReference || {},
      productName: data.productName?.translated || data.productName?.original || 'Unknown Product',
      price: this.normalizeMoney(data.price),
      lineItemPrice: this.normalizeMoney(data.lineItemPrice || data.priceBreakdown?.totalPrice),
      media: data.media?.[0] || data.image,
      sku: data.sku,
      weight: data.weight,
      options: data.options,
    };
  }

  /**
   * Normalize discount
   */
  private normalizeDiscount(data: any): AppliedDiscount {
    return {
      discountType: data.discountType || 'COUPON',
      lineItemIds: data.lineItemIds,
      coupon: data.coupon,
      discountAmount: this.normalizeMoney(data.discountAmount),
    };
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
