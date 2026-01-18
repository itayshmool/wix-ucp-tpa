# Phase 13: Protocol Bindings ✅ COMPLETE

## Overview

Implemented MCP (Model Context Protocol) and A2A (Agent-to-Agent) bindings to expose UCP operations as tools for AI frameworks and enable multi-agent coordination.

## MCP (Model Context Protocol)

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mcp/tools` | List all available tools |
| GET | `/mcp/tools/:name` | Get specific tool definition |
| GET | `/mcp/openapi` | OpenAPI schema for tools |
| POST | `/mcp/call` | Execute a single tool |
| POST | `/mcp/batch` | Execute multiple tools |
| POST | `/mcp/validate` | Validate tool arguments |

### Available Tools (19)

**Discovery:**
- `ucp_discover` - Get merchant profile and capabilities

**Products:**
- `ucp_search_products` - Search product catalog
- `ucp_get_product` - Get product details

**Cart:**
- `ucp_create_cart` - Create cart with items
- `ucp_get_cart` - Get cart contents
- `ucp_add_to_cart` - Add item to cart
- `ucp_update_cart_item` - Update item quantity
- `ucp_clear_cart` - Clear cart

**Checkout:**
- `ucp_create_checkout` - Create checkout session
- `ucp_get_checkout` - Get checkout status
- `ucp_apply_coupon` - Apply discount code
- `ucp_remove_coupon` - Remove discount

**Payment:**
- `ucp_list_payment_handlers` - List payment methods
- `ucp_mint_instrument` - Create payment instrument
- `ucp_complete_checkout` - Complete and create order

**Orders:**
- `ucp_list_orders` - List orders
- `ucp_get_order` - Get order details
- `ucp_get_order_fulfillments` - Get shipping status

**Webhooks:**
- `ucp_register_webhook` - Subscribe to events

### Example: Tool Call

```bash
POST /mcp/call
{
  "tool": "ucp_search_products",
  "arguments": { "query": "energy drink", "limit": 5 },
  "requestId": "req-123"
}
```

Response:
```json
{
  "success": true,
  "requestId": "req-123",
  "result": {
    "products": [...],
    "total": 5
  }
}
```

## A2A (Agent-to-Agent)

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/a2a/agent` | Get self agent card |
| GET | `/a2a/agents` | List all known agents |
| GET | `/a2a/agents/:id` | Get specific agent |
| POST | `/a2a/agents` | Register external agent |
| DELETE | `/a2a/agents/:id` | Unregister agent |
| POST | `/a2a/resolve` | Find agents by capability |
| POST | `/a2a/handoff` | Create transaction handoff |
| GET | `/a2a/handoff/:id` | Get handoff details |
| GET | `/a2a/handoffs` | List handoffs |
| POST | `/a2a/handoff/:id/accept` | Accept/reject handoff |
| POST | `/a2a/handoff/:id/complete` | Complete handoff |
| GET | `/a2a/stats` | A2A statistics |

### Agent Card

```json
{
  "id": "ucp-wix-agent",
  "name": "Pop Stop Drink UCP Agent",
  "version": "1.0.0",
  "capabilities": ["catalog_search", "cart_management", "checkout", ...],
  "endpoints": {
    "base": "https://wix-ucp-tpa.onrender.com",
    "mcp": "https://wix-ucp-tpa.onrender.com/mcp",
    "a2a": "https://wix-ucp-tpa.onrender.com/a2a"
  },
  "trust": { "level": "verified" }
}
```

### Transaction Handoff

Enables one agent to delegate a transaction to another:

```bash
POST /a2a/handoff
{
  "targetAgentId": "payment-agent",
  "type": "checkout",
  "context": { "checkoutId": "checkout-123" },
  "intent": "Complete the payment",
  "permissions": ["read", "execute"],
  "ttlSeconds": 3600
}
```

Handoff Flow:
1. Source agent creates handoff → status: `pending`
2. Target agent accepts → status: `accepted`
3. Target agent completes → status: `completed`

## Discovery Integration

UCP discovery now includes bindings:

```json
{
  "protocol": "ucp",
  "bindings": {
    "mcp": {
      "tools": "https://wix-ucp-tpa.onrender.com/mcp/tools",
      "call": "https://wix-ucp-tpa.onrender.com/mcp/call",
      "openapi": "https://wix-ucp-tpa.onrender.com/mcp/openapi"
    },
    "a2a": {
      "agent": "https://wix-ucp-tpa.onrender.com/a2a/agent",
      "agents": "https://wix-ucp-tpa.onrender.com/a2a/agents",
      "handoff": "https://wix-ucp-tpa.onrender.com/a2a/handoff",
      "resolve": "https://wix-ucp-tpa.onrender.com/a2a/resolve"
    }
  }
}
```

## Files

- `src/services/mcp/mcp.types.ts` - MCP type definitions
- `src/services/mcp/mcp.service.ts` - MCP tool execution
- `src/routes/mcp.routes.ts` - MCP API endpoints
- `src/services/a2a/a2a.types.ts` - A2A type definitions
- `src/services/a2a/a2a.service.ts` - A2A handoff management
- `src/routes/a2a.routes.ts` - A2A API endpoints
- `tests/ucp-phase13-bindings.test.ts` - 31 tests

## Tests

31 comprehensive tests covering:
- MCP tool discovery (list, get, openapi)
- MCP tool execution (validation, errors)
- MCP batch execution
- A2A agent discovery
- A2A agent registration
- A2A handoff creation
- A2A handoff acceptance/rejection
- A2A handoff completion
- Discovery integration
