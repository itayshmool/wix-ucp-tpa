/**
 * Intent Detection Tests
 * 
 * Tests for the chat intent detection logic used in /test/llm
 */

import { describe, it, expect } from 'vitest';

/**
 * Intent detection function (extracted from test-llm.routes.ts)
 * This is the same logic used in the client-side JavaScript
 * 
 * IMPORTANT: Order matters! More specific patterns must be checked first.
 */
function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  
  // CHECK SPECIFIC INTENTS FIRST (before generic ones)
  
  // Clear cart (must be before VIEW_CART because "clear cart" contains "cart")
  if (lower.match(/clear|empty|remove all|start over/)) {
    return 'CLEAR_CART';
  }
  
  // Checkout (must be before ADD_TO_CART because "finish" could match "order")
  if (lower.match(/checkout|pay now|purchase|complete order|finish shopping|done shopping|ready to pay/)) {
    return 'CHECKOUT';
  }
  
  // Check status (must be before ADD_TO_CART because "order" could match)
  if (lower.match(/status|paid|payment|confirm/)) {
    return 'CHECK_STATUS';
  }
  
  // Add to cart
  if (lower.match(/add|want|buy|get me|i('ll| will) (take|have)|order a|order the/)) {
    return 'ADD_TO_CART';
  }
  
  // View cart
  if (lower.match(/view.*(cart|basket|bag)|my cart|my basket|my bag|in.*(cart|basket|bag)/)) {
    return 'VIEW_CART';
  }
  
  // Browse (most generic, check last)
  if (lower.match(/show|list|what|browse|products|drinks|menu|available|have you got/)) {
    return 'BROWSE';
  }
  
  return 'UNKNOWN';
}

/**
 * Product extraction function (extracted from test-llm.routes.ts)
 */
interface Product {
  id: string;
  name: string;
  price?: { amount: number; formatted: string };
}

function extractProductInfo(message: string, products: Product[]): { product: Product | undefined; quantity: number } {
  const lower = message.toLowerCase();
  let quantity = 1;
  
  // Extract quantity
  const qtyMatch = lower.match(/(\d+)\s*(of|x|×)?/);
  if (qtyMatch) quantity = parseInt(qtyMatch[1]);
  
  // Find matching product
  const product = products.find(p => 
    lower.includes(p.name.toLowerCase()) ||
    lower.includes(p.name.toLowerCase().split(' ')[0])
  );
  
  return { product, quantity };
}

describe('Intent Detection', () => {
  describe('BROWSE intent', () => {
    it('should detect "show me products"', () => {
      expect(detectIntent('show me products')).toBe('BROWSE');
    });

    it('should detect "what do you have"', () => {
      expect(detectIntent('what do you have')).toBe('BROWSE');
    });

    it('should detect "list drinks"', () => {
      expect(detectIntent('list drinks')).toBe('BROWSE');
    });

    it('should detect "browse menu"', () => {
      expect(detectIntent('browse menu')).toBe('BROWSE');
    });

    it('should detect "what is available"', () => {
      expect(detectIntent('what is available')).toBe('BROWSE');
    });
  });

  describe('ADD_TO_CART intent', () => {
    it('should detect "add cone crusher to cart"', () => {
      expect(detectIntent('add cone crusher to cart')).toBe('ADD_TO_CART');
    });

    it('should detect "I want a nitro dr"', () => {
      expect(detectIntent('I want a nitro dr')).toBe('ADD_TO_CART');
    });

    it('should detect "buy a cone crusher"', () => {
      expect(detectIntent('buy a cone crusher')).toBe('ADD_TO_CART');
    });

    it('should detect "I\'ll take the cone crusher"', () => {
      expect(detectIntent("I'll take the cone crusher")).toBe('ADD_TO_CART');
    });

    it('should detect "get me a pink slip"', () => {
      expect(detectIntent('get me a pink slip')).toBe('ADD_TO_CART');
    });

    it('should detect "order a caramel clutch"', () => {
      expect(detectIntent('order a caramel clutch')).toBe('ADD_TO_CART');
    });
  });

  describe('CHECKOUT intent', () => {
    it('should detect "checkout"', () => {
      expect(detectIntent('checkout')).toBe('CHECKOUT');
    });

    it('should detect "ready to pay"', () => {
      expect(detectIntent('ready to pay')).toBe('CHECKOUT');
    });

    it('should detect "complete order"', () => {
      expect(detectIntent('complete order')).toBe('CHECKOUT');
    });

    it('should detect "purchase"', () => {
      expect(detectIntent('purchase')).toBe('CHECKOUT');
    });

    it('should detect "done shopping"', () => {
      expect(detectIntent('done shopping')).toBe('CHECKOUT');
    });
  });

  describe('VIEW_CART intent', () => {
    it('should detect "view my cart"', () => {
      expect(detectIntent('view my cart')).toBe('VIEW_CART');
    });

    it('should detect "what is in my cart"', () => {
      expect(detectIntent('what is in my cart')).toBe('VIEW_CART');
    });

    it('should detect "my basket"', () => {
      expect(detectIntent('my basket')).toBe('VIEW_CART');
    });
  });

  describe('CLEAR_CART intent', () => {
    it('should detect "clear"', () => {
      expect(detectIntent('clear')).toBe('CLEAR_CART');
    });

    it('should detect "empty"', () => {
      expect(detectIntent('empty')).toBe('CLEAR_CART');
    });

    it('should detect "remove all"', () => {
      expect(detectIntent('remove all')).toBe('CLEAR_CART');
    });

    it('should detect "start over"', () => {
      expect(detectIntent('start over')).toBe('CLEAR_CART');
    });
  });

  describe('CHECK_STATUS intent', () => {
    it('should detect "check status"', () => {
      expect(detectIntent('check status')).toBe('CHECK_STATUS');
    });

    it('should detect "payment confirmation"', () => {
      expect(detectIntent('payment confirmation')).toBe('CHECK_STATUS');
    });

    it('should detect "I paid"', () => {
      expect(detectIntent('I paid')).toBe('CHECK_STATUS');
    });
  });

  describe('UNKNOWN intent', () => {
    it('should return UNKNOWN for unrecognized messages', () => {
      expect(detectIntent('hello there')).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for random text', () => {
      expect(detectIntent('the weather is nice today')).toBe('UNKNOWN');
    });
  });
});

describe('Product Extraction', () => {
  const mockProducts: Product[] = [
    { id: 'prod-1', name: 'Cone Crusher', price: { amount: 4, formatted: '$4.00' } },
    { id: 'prod-2', name: 'Nitro Dr', price: { amount: 4, formatted: '$4.00' } },
    { id: 'prod-3', name: 'Caramel Clutch', price: { amount: 4, formatted: '$4.00' } },
    { id: 'prod-4', name: 'Pink Slip', price: { amount: 4, formatted: '$4.00' } },
  ];

  describe('product matching', () => {
    it('should find exact product name', () => {
      const result = extractProductInfo('add cone crusher to cart', mockProducts);
      expect(result.product?.name).toBe('Cone Crusher');
    });

    it('should find product by first word', () => {
      const result = extractProductInfo('I want a nitro', mockProducts);
      expect(result.product?.name).toBe('Nitro Dr');
    });

    it('should be case insensitive', () => {
      const result = extractProductInfo('ADD CARAMEL CLUTCH', mockProducts);
      expect(result.product?.name).toBe('Caramel Clutch');
    });

    it('should return undefined for unknown product', () => {
      const result = extractProductInfo('add mystery drink', mockProducts);
      expect(result.product).toBeUndefined();
    });
  });

  describe('quantity extraction', () => {
    it('should default to quantity 1', () => {
      const result = extractProductInfo('add cone crusher', mockProducts);
      expect(result.quantity).toBe(1);
    });

    it('should extract quantity from "2 cone crushers"', () => {
      const result = extractProductInfo('2 cone crushers', mockProducts);
      expect(result.quantity).toBe(2);
    });

    it('should extract quantity from "add 3 of nitro dr"', () => {
      const result = extractProductInfo('add 3 of nitro dr', mockProducts);
      expect(result.quantity).toBe(3);
    });

    it('should extract quantity from "5x pink slip"', () => {
      const result = extractProductInfo('5x pink slip', mockProducts);
      expect(result.quantity).toBe(5);
    });
  });
});
