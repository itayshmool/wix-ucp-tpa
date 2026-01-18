/**
 * MCP (Model Context Protocol) Types
 * 
 * Defines the tool interface for AI models to interact with UCP.
 * Based on the MCP specification for tool definitions.
 */

import { z } from 'zod';

// ============================================================================
// MCP Tool Definition Types
// ============================================================================

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, MCPPropertySchema>;
    required?: string[];
  };
}

export interface MCPPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: MCPPropertySchema;
  properties?: Record<string, MCPPropertySchema>;
  default?: unknown;
}

// ============================================================================
// MCP Request/Response Types
// ============================================================================

export interface MCPToolCallRequest {
  tool: string;
  arguments: Record<string, unknown>;
  requestId?: string;
}

export interface MCPToolCallResponse {
  success: boolean;
  requestId?: string;
  result?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface MCPToolsListResponse {
  tools: MCPToolDefinition[];
  version: string;
  capabilities: string[];
}

// ============================================================================
// MCP Validation Schemas
// ============================================================================

export const MCPToolCallRequestSchema = z.object({
  tool: z.string().min(1, 'Tool name is required'),
  arguments: z.record(z.unknown()).default({}),
  requestId: z.string().optional(),
});

// ============================================================================
// UCP Tool Definitions
// ============================================================================

export const UCP_MCP_TOOLS: MCPToolDefinition[] = [
  // Discovery
  {
    name: 'ucp_discover',
    description: 'Get merchant profile and available capabilities',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  
  // Product Catalog
  {
    name: 'ucp_search_products',
    description: 'Search the product catalog by keyword, category, or filters',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (product name, description, or keywords)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (1-100)',
          default: 20,
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip for pagination',
          default: 0,
        },
      },
    },
  },
  {
    name: 'ucp_get_product',
    description: 'Get detailed information about a specific product',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'The unique product identifier',
        },
      },
      required: ['productId'],
    },
  },
  
  // Cart Management
  {
    name: 'ucp_create_cart',
    description: 'Create a new shopping cart with items',
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Array of items to add to cart',
          items: {
            type: 'object',
            properties: {},
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'ucp_get_cart',
    description: 'Get the current cart contents and totals',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'ucp_add_to_cart',
    description: 'Add an item to the current cart',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'The product ID to add',
        },
        quantity: {
          type: 'number',
          description: 'Quantity to add (default: 1)',
          default: 1,
        },
      },
      required: ['productId'],
    },
  },
  {
    name: 'ucp_update_cart_item',
    description: 'Update quantity of an item in the cart',
    inputSchema: {
      type: 'object',
      properties: {
        itemId: {
          type: 'string',
          description: 'The cart item ID to update',
        },
        quantity: {
          type: 'number',
          description: 'New quantity (0 to remove)',
        },
      },
      required: ['itemId', 'quantity'],
    },
  },
  {
    name: 'ucp_clear_cart',
    description: 'Remove all items from the cart',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  
  // Checkout
  {
    name: 'ucp_create_checkout',
    description: 'Create a checkout session from the current cart',
    inputSchema: {
      type: 'object',
      properties: {
        cartId: {
          type: 'string',
          description: 'Optional cart ID (uses current cart if not provided)',
        },
      },
    },
  },
  {
    name: 'ucp_get_checkout',
    description: 'Get checkout details and status',
    inputSchema: {
      type: 'object',
      properties: {
        checkoutId: {
          type: 'string',
          description: 'The checkout session ID',
        },
      },
      required: ['checkoutId'],
    },
  },
  
  // Discounts
  {
    name: 'ucp_apply_coupon',
    description: 'Apply a coupon or discount code to the checkout',
    inputSchema: {
      type: 'object',
      properties: {
        checkoutId: {
          type: 'string',
          description: 'The checkout session ID',
        },
        couponCode: {
          type: 'string',
          description: 'The coupon or promo code to apply',
        },
      },
      required: ['checkoutId', 'couponCode'],
    },
  },
  {
    name: 'ucp_remove_coupon',
    description: 'Remove a coupon from the checkout',
    inputSchema: {
      type: 'object',
      properties: {
        checkoutId: {
          type: 'string',
          description: 'The checkout session ID',
        },
      },
      required: ['checkoutId'],
    },
  },
  
  // Payment
  {
    name: 'ucp_list_payment_handlers',
    description: 'List available payment methods',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'ucp_mint_instrument',
    description: 'Create a payment instrument for checkout',
    inputSchema: {
      type: 'object',
      properties: {
        checkoutId: {
          type: 'string',
          description: 'The checkout session ID',
        },
        handlerId: {
          type: 'string',
          description: 'Payment handler ID (e.g., com.ucp.sandbox)',
        },
        amount: {
          type: 'number',
          description: 'Payment amount',
        },
        currency: {
          type: 'string',
          description: 'Currency code (e.g., USD)',
        },
        paymentData: {
          type: 'object',
          description: 'Payment-specific data (e.g., card details for sandbox)',
        },
      },
      required: ['checkoutId', 'handlerId', 'amount', 'currency'],
    },
  },
  
  // Complete Checkout
  {
    name: 'ucp_complete_checkout',
    description: 'Complete the checkout and create an order',
    inputSchema: {
      type: 'object',
      properties: {
        checkoutId: {
          type: 'string',
          description: 'The checkout session ID',
        },
        instrumentId: {
          type: 'string',
          description: 'The minted payment instrument ID',
        },
        billingAddress: {
          type: 'object',
          description: 'Billing address details',
        },
        shippingAddress: {
          type: 'object',
          description: 'Shipping address details',
        },
      },
      required: ['checkoutId', 'instrumentId'],
    },
  },
  
  // Orders
  {
    name: 'ucp_list_orders',
    description: 'List orders with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of results',
          default: 20,
        },
        status: {
          type: 'string',
          description: 'Filter by order status',
          enum: ['PENDING', 'APPROVED', 'CANCELED'],
        },
      },
    },
  },
  {
    name: 'ucp_get_order',
    description: 'Get details of a specific order',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The order ID',
        },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'ucp_get_order_fulfillments',
    description: 'Get fulfillment/shipping status for an order',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The order ID',
        },
      },
      required: ['orderId'],
    },
  },
  
  // Webhooks
  {
    name: 'ucp_register_webhook',
    description: 'Register a webhook for order/fulfillment updates',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The webhook callback URL',
        },
        events: {
          type: 'array',
          description: 'Events to subscribe to',
          items: {
            type: 'string',
            enum: ['order.created', 'order.updated', 'fulfillment.created', 'fulfillment.shipped', 'fulfillment.delivered'],
          },
        },
      },
      required: ['url', 'events'],
    },
  },
];

// ============================================================================
// Tool Name Mapping to UCP Endpoints
// ============================================================================

export const TOOL_TO_ENDPOINT_MAP: Record<string, { method: string; path: string }> = {
  ucp_discover: { method: 'GET', path: '/.well-known/ucp' },
  ucp_search_products: { method: 'GET', path: '/ucp/products' },
  ucp_get_product: { method: 'GET', path: '/ucp/products/:productId' },
  ucp_create_cart: { method: 'POST', path: '/ucp/cart' },
  ucp_get_cart: { method: 'GET', path: '/ucp/cart' },
  ucp_add_to_cart: { method: 'POST', path: '/ucp/cart/items' },
  ucp_update_cart_item: { method: 'PUT', path: '/ucp/cart/items/:itemId' },
  ucp_clear_cart: { method: 'DELETE', path: '/ucp/cart' },
  ucp_create_checkout: { method: 'POST', path: '/ucp/checkout' },
  ucp_get_checkout: { method: 'GET', path: '/ucp/checkout/:checkoutId/status' },
  ucp_apply_coupon: { method: 'POST', path: '/ucp/checkout/:checkoutId/coupons' },
  ucp_remove_coupon: { method: 'DELETE', path: '/ucp/checkout/:checkoutId/coupons' },
  ucp_list_payment_handlers: { method: 'GET', path: '/ucp/payment-handlers' },
  ucp_mint_instrument: { method: 'POST', path: '/ucp/checkout/:checkoutId/mint' },
  ucp_complete_checkout: { method: 'POST', path: '/ucp/checkout/:checkoutId/complete' },
  ucp_list_orders: { method: 'GET', path: '/ucp/orders' },
  ucp_get_order: { method: 'GET', path: '/ucp/orders/:orderId' },
  ucp_get_order_fulfillments: { method: 'GET', path: '/ucp/orders/:orderId/fulfillments' },
  ucp_register_webhook: { method: 'POST', path: '/ucp/webhooks' },
};
