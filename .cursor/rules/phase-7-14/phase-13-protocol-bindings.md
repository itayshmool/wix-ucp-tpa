# Phase 13: Protocol Bindings (MCP, A2A)

## Context
Protocol bindings allow AI agents to interact with UCP using their native protocols. MCP (Model Context Protocol) enables Claude and other LLMs to use UCP as tools. A2A (Agent-to-Agent) enables autonomous agent communication.

## Reference Documentation
- MCP Specification: https://modelcontextprotocol.io/
- MCP Binding: https://ucp.dev/specification/checkout/mcp-binding
- A2A Binding: https://ucp.dev/specification/checkout/a2a-binding

## Goal
Expose UCP capabilities through MCP and A2A protocol bindings.

## Priority: 🟡 Medium | Complexity: 🔴 High | Duration: 2-3 weeks

---

## Sub-Phases

### Phase 13A: MCP Binding (1-2 weeks)
Enable UCP as MCP tools for Claude and compatible LLMs.

### Phase 13B: A2A Binding (1 week)
Enable agent-to-agent protocol for autonomous commerce.

---

# Phase 13A: MCP Binding

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MCP Architecture                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐        ┌─────────────────┐        ┌─────────────────┐ │
│  │  Claude /   │        │   MCP Server    │        │   UCP TPA       │ │
│  │  LLM Agent  │◄──────►│   (this)        │◄──────►│   REST API      │ │
│  └─────────────┘  MCP   └─────────────────┘  HTTP  └─────────────────┘ │
│                                                                         │
│  Tools exposed:                                                         │
│  - browse_products                                                      │
│  - search_products                                                      │
│  - add_to_cart                                                          │
│  - view_cart                                                            │
│  - create_checkout                                                      │
│  - complete_purchase                                                    │
│  - get_order_status                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tasks

### 1. Install MCP SDK

```bash
npm install @modelcontextprotocol/sdk
```

### 2. Create MCP Server (src/mcp/server.ts)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';

// Import UCP tools
import { browseProducts, searchProducts } from './tools/products.js';
import { addToCart, viewCart, clearCart } from './tools/cart.js';
import { createCheckout, completeCheckout } from './tools/checkout.js';
import { getOrderStatus } from './tools/orders.js';

const UCP_BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export class UCPMCPServer {
  private server: Server;
  
  constructor() {
    this.server = new Server(
      {
        name: 'ucp-commerce',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });
    
    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info('MCP tool called', { tool: name, args });
      
      try {
        const result = await this.executeTool(name, args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        logger.error('MCP tool error', { tool: name, error: error.message });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: error.message }),
            },
          ],
          isError: true,
        };
      }
    });
  }
  
  private getTools(): Tool[] {
    return [
      {
        name: 'browse_products',
        description: 'Browse products from the Pop Stop store. Returns a list of available products with prices and images.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of products to return (default 20, max 100)',
            },
            category: {
              type: 'string',
              description: 'Filter by category name',
            },
          },
        },
      },
      {
        name: 'search_products',
        description: 'Search for products by name or keyword.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'add_to_cart',
        description: 'Add a product to the shopping cart.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              description: 'The product ID to add',
            },
            quantity: {
              type: 'number',
              description: 'Quantity to add (default 1)',
            },
          },
          required: ['productId'],
        },
      },
      {
        name: 'view_cart',
        description: 'View the current shopping cart contents and totals.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'clear_cart',
        description: 'Remove all items from the shopping cart.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_checkout',
        description: 'Create a checkout from the current cart. Returns a checkout ID and payment link.',
        inputSchema: {
          type: 'object',
          properties: {
            buyerEmail: {
              type: 'string',
              description: 'Buyer email address (optional)',
            },
          },
        },
      },
      {
        name: 'complete_purchase',
        description: 'Complete a purchase using a payment instrument. For testing, use the sandbox handler.',
        inputSchema: {
          type: 'object',
          properties: {
            checkoutId: {
              type: 'string',
              description: 'The checkout ID to complete',
            },
            paymentHandler: {
              type: 'string',
              description: 'Payment handler ID (e.g., "com.test.sandbox")',
              default: 'com.test.sandbox',
            },
          },
          required: ['checkoutId'],
        },
      },
      {
        name: 'get_order_status',
        description: 'Get the status of an order by order ID.',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'The order ID to look up',
            },
          },
          required: ['orderId'],
        },
      },
    ];
  }
  
  private async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'browse_products':
        return browseProducts(UCP_BASE_URL, args);
      case 'search_products':
        return searchProducts(UCP_BASE_URL, args);
      case 'add_to_cart':
        return addToCart(UCP_BASE_URL, args);
      case 'view_cart':
        return viewCart(UCP_BASE_URL);
      case 'clear_cart':
        return clearCart(UCP_BASE_URL);
      case 'create_checkout':
        return createCheckout(UCP_BASE_URL, args);
      case 'complete_purchase':
        return completeCheckout(UCP_BASE_URL, args);
      case 'get_order_status':
        return getOrderStatus(UCP_BASE_URL, args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
  
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP server started');
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new UCPMCPServer();
  server.start().catch(console.error);
}
```

### 3. Create MCP Tools (src/mcp/tools/)

#### Products Tools (src/mcp/tools/products.ts)
```typescript
export async function browseProducts(baseUrl: string, args: { limit?: number; category?: string }) {
  const params = new URLSearchParams();
  if (args.limit) params.set('limit', args.limit.toString());
  if (args.category) params.set('category', args.category);
  
  const response = await fetch(`${baseUrl}/ucp/products?${params}`);
  const data = await response.json();
  
  return {
    products: data.products.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price.formatted,
      available: p.available,
      image: p.images?.[0]?.url,
    })),
    total: data.pagination.total,
  };
}

export async function searchProducts(baseUrl: string, args: { query: string; limit?: number }) {
  const params = new URLSearchParams();
  params.set('search', args.query);
  if (args.limit) params.set('limit', args.limit.toString());
  
  const response = await fetch(`${baseUrl}/ucp/products?${params}`);
  const data = await response.json();
  
  return {
    query: args.query,
    results: data.products.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price.formatted,
      available: p.available,
    })),
    count: data.products.length,
  };
}
```

#### Cart Tools (src/mcp/tools/cart.ts)
```typescript
export async function addToCart(baseUrl: string, args: { productId: string; quantity?: number }) {
  const response = await fetch(`${baseUrl}/ucp/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: args.productId, quantity: args.quantity || 1 }],
    }),
  });
  
  const cart = await response.json();
  
  return {
    success: true,
    cart: {
      itemCount: cart.totals.itemCount,
      total: cart.totals.total.formatted,
    },
  };
}

export async function viewCart(baseUrl: string) {
  const response = await fetch(`${baseUrl}/ucp/cart`);
  const cart = await response.json();
  
  return {
    items: cart.items.map((i: any) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price.formatted,
    })),
    totals: {
      subtotal: cart.totals.subtotal.formatted,
      total: cart.totals.total.formatted,
      itemCount: cart.totals.itemCount,
    },
  };
}

export async function clearCart(baseUrl: string) {
  await fetch(`${baseUrl}/ucp/cart`, { method: 'DELETE' });
  return { success: true, message: 'Cart cleared' };
}
```

#### Checkout Tools (src/mcp/tools/checkout.ts)
```typescript
export async function createCheckout(baseUrl: string, args: { buyerEmail?: string }) {
  const response = await fetch(`${baseUrl}/ucp/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyerInfo: args.buyerEmail ? { email: args.buyerEmail } : undefined,
    }),
  });
  
  const checkout = await response.json();
  
  return {
    checkoutId: checkout.id,
    checkoutUrl: checkout.checkoutUrl,
    total: checkout.totals.total.formatted,
    message: 'Checkout created. User can pay at checkoutUrl, or use complete_purchase for server-side payment.',
  };
}

export async function completeCheckout(baseUrl: string, args: { checkoutId: string; paymentHandler?: string }) {
  const handler = args.paymentHandler || 'com.test.sandbox';
  
  // 1. Mint instrument
  const mintResponse = await fetch(`${baseUrl}/ucp/payment-handlers/${handler}/mint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkoutId: args.checkoutId }),
  });
  
  const mintResult = await mintResponse.json();
  if (!mintResult.success) {
    return { success: false, error: mintResult.error };
  }
  
  // 2. Complete checkout
  const completeResponse = await fetch(`${baseUrl}/ucp/checkout/${args.checkoutId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instrumentId: mintResult.instrument.id }),
  });
  
  const result = await completeResponse.json();
  
  if (result.status === 'completed') {
    return {
      success: true,
      order: {
        id: result.order.id,
        number: result.order.number,
        total: result.order.totals.total.formatted,
      },
      message: `Order ${result.order.number} created successfully!`,
    };
  }
  
  return {
    success: false,
    status: result.status,
    error: result.error,
  };
}
```

#### Orders Tools (src/mcp/tools/orders.ts)
```typescript
export async function getOrderStatus(baseUrl: string, args: { orderId: string }) {
  const response = await fetch(`${baseUrl}/ucp/orders/${args.orderId}`);
  
  if (!response.ok) {
    return { error: 'Order not found' };
  }
  
  const order = await response.json();
  
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    total: order.totals.total.formatted,
    items: order.items.map((i: any) => ({
      name: i.name,
      quantity: i.quantity,
    })),
  };
}
```

### 4. Create MCP Entry Point (src/mcp/index.ts)

```typescript
#!/usr/bin/env node
import { UCPMCPServer } from './server.js';

const server = new UCPMCPServer();
server.start().catch(console.error);
```

### 5. Add MCP to package.json

```json
{
  "bin": {
    "ucp-mcp": "./dist/mcp/index.js"
  },
  "scripts": {
    "mcp": "tsx src/mcp/index.ts"
  }
}
```

---

# Phase 13B: A2A Binding

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           A2A Architecture                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐        ┌─────────────────┐        ┌─────────────────┐ │
│  │   Agent A   │◄──────►│  A2A Registry   │◄──────►│   Agent B       │ │
│  │  (Buyer)    │  A2A   │  (this)         │  A2A   │  (Seller/UCP)   │ │
│  └─────────────┘        └─────────────────┘        └─────────────────┘ │
│                                                                         │
│  Message types:                                                         │
│  - commerce.discover                                                    │
│  - commerce.checkout.create                                             │
│  - commerce.checkout.update                                             │
│  - commerce.checkout.complete                                           │
│  - commerce.order.status                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tasks

### 1. Create A2A Types (src/a2a/types.ts)

```typescript
export interface A2AAgent {
  id: string;
  name: string;
  description?: string;
  capabilities: string[];
  endpoint: string;
  publicKey?: string;  // For message signing
}

export interface A2AMessage {
  id: string;
  type: string;
  from: string;  // Agent ID
  to: string;    // Agent ID
  timestamp: string;
  payload: unknown;
  signature?: string;
}

export interface A2AResponse {
  messageId: string;
  status: 'success' | 'error';
  payload?: unknown;
  error?: {
    code: string;
    message: string;
  };
}
```

### 2. Create A2A Handler (src/a2a/handler.ts)

```typescript
import { A2AMessage, A2AResponse } from './types.js';
import { logger } from '../utils/logger.js';

export async function handleA2AMessage(message: A2AMessage): Promise<A2AResponse> {
  logger.info('A2A message received', { 
    type: message.type, 
    from: message.from 
  });
  
  switch (message.type) {
    case 'commerce.discover':
      return handleDiscovery(message);
    case 'commerce.checkout.create':
      return handleCheckoutCreate(message);
    case 'commerce.checkout.complete':
      return handleCheckoutComplete(message);
    case 'commerce.order.status':
      return handleOrderStatus(message);
    default:
      return {
        messageId: message.id,
        status: 'error',
        error: { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${message.type}` },
      };
  }
}

async function handleDiscovery(message: A2AMessage): Promise<A2AResponse> {
  // Return UCP discovery info
  return {
    messageId: message.id,
    status: 'success',
    payload: {
      protocol: 'ucp',
      version: '1.0',
      capabilities: ['checkout', 'orders', 'fulfillment'],
      // ... discovery data
    },
  };
}
// ... other handlers
```

### 3. Create A2A Endpoint (src/routes/a2a.routes.ts)

```typescript
import { Router, Request, Response } from 'express';
import { handleA2AMessage } from '../a2a/handler.js';

const router = Router();

/**
 * A2A Message Endpoint
 * POST /a2a/messages
 */
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const message = req.body;
    const response = await handleA2AMessage(message);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

export default router;
```

---

## File Structure

```
src/
├── mcp/
│   ├── index.ts           # MCP entry point
│   ├── server.ts          # MCP server
│   └── tools/
│       ├── products.ts    # Product tools
│       ├── cart.ts        # Cart tools
│       ├── checkout.ts    # Checkout tools
│       └── orders.ts      # Order tools
├── a2a/
│   ├── types.ts           # A2A types
│   ├── handler.ts         # Message handler
│   └── registry.ts        # Agent registry
└── routes/
    └── a2a.routes.ts      # A2A endpoints
```

---

## Acceptance Criteria

### Phase 13A (MCP)
- [ ] MCP server starts and connects via stdio
- [ ] All 7 tools implemented and working
- [ ] browse_products returns product list
- [ ] add_to_cart adds items successfully
- [ ] create_checkout creates checkout
- [ ] complete_purchase creates order
- [ ] Can test with Claude Desktop MCP

### Phase 13B (A2A)
- [ ] A2A endpoint accepts messages
- [ ] Discovery message returns UCP info
- [ ] Checkout messages create/complete checkouts
- [ ] Agent registration works
- [ ] Message signing (optional)

---

## Testing with Claude Desktop

Add to Claude Desktop MCP config (`~/.config/claude/mcp.json`):

```json
{
  "mcpServers": {
    "ucp-commerce": {
      "command": "node",
      "args": ["/path/to/wix-ucp-tpa/dist/mcp/index.js"],
      "env": {
        "BASE_URL": "https://wix-ucp-tpa.onrender.com"
      }
    }
  }
}
```

Then ask Claude: "Browse products from the Pop Stop store"

---

## Security Considerations

- MCP runs locally, no auth needed
- A2A should verify message signatures
- Rate limit A2A endpoints
- Validate agent IDs against registry
- Log all inter-agent messages
