# Agent-to-Agent (A2A) Protocol
## Multi-Agent Commerce Coordination

---

## The Challenge

```
   Shopping Agent          Payment Agent         Fulfillment Agent
        │                       │                       │
        │  "I need help         │                       │
        │   with payment"       │                       │
        │         ?─────────────?                       │
        │                       │                       │
        │  How do agents discover each other?           │
        │  How do they share transaction context?       │
        │  How do they coordinate securely?             │
```

**Multi-agent commerce requires standardized coordination.**

---

## The Solution: A2A Protocol

```
   Shopping Agent              UCP Server             Payment Agent
        │                          │                       │
        │  1. Register             │                       │
        │ ──────────────────────>  │  <───────────────────│
        │                          │    2. Register        │
        │                          │                       │
        │  3. Resolve("payment")   │                       │
        │ ──────────────────────>  │                       │
        │  <── [Payment Agent] ──  │                       │
        │                          │                       │
        │  4. Create Handoff ─────────────────────────────>│
        │  <───────────────── 5. Accept ──────────────────│
        │  <───────────────── 6. Complete ────────────────│
```

---

## Agent Card

Every agent has a discoverable identity:

```json
{
  "id": "ucp-wix-agent",
  "name": "Pop Stop Drink UCP Agent",
  "version": "1.0.0",
  "capabilities": [
    "catalog_search", "cart_management",
    "checkout", "payment_handlers"
  ],
  "endpoints": {
    "base": "https://wix-ucp-tpa.onrender.com",
    "mcp": ".../mcp",
    "a2a": ".../a2a"
  },
  "trust": { "level": "verified" }
}
```

---

## Agent Discovery

**List all known agents:**
```bash
GET /a2a/agents
```

**Find agents by capability:**
```bash
POST /a2a/resolve
{ "capability": "payment_processing" }
```

**Response:**
```json
{
  "agents": [
    { "id": "payment-agent", "name": "Payment Processor", ... }
  ]
}
```

---

## Agent Registration

**Register an external agent:**
```bash
POST /a2a/agents
{
  "id": "my-custom-agent",
  "name": "Custom Shopping Agent",
  "version": "1.0.0",
  "capabilities": ["checkout", "support"],
  "endpoints": { "base": "https://my-agent.com" },
  "trust": { "level": "sandbox" }
}
```

**Response:** `201 Created`

---

## Transaction Handoff

Delegate a transaction to another agent:

```bash
POST /a2a/handoff
{
  "targetAgentId": "payment-agent",
  "type": "checkout",
  "context": {
    "checkoutId": "checkout-123",
    "cartId": "cart-456"
  },
  "intent": "Complete the payment process",
  "permissions": ["read", "execute"],
  "ttlSeconds": 3600
}
```

---

## Handoff Response

```json
{
  "success": true,
  "handoff": {
    "id": "handoff_abc123",
    "status": "pending",
    "sourceAgent": { "id": "shopping-agent", "name": "..." },
    "targetAgent": { "id": "payment-agent", "name": "..." },
    "context": { "checkoutId": "checkout-123" },
    "intent": "Complete the payment process",
    "permissions": ["read", "execute"],
    "expiresAt": "2026-01-19T00:00:00Z"
  }
}
```

---

## Handoff Flow

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   PENDING ──────> ACCEPTED ──────> COMPLETED         │
│      │               │                               │
│      │               └──────> FAILED                 │
│      │                                               │
│      └──────────> REJECTED                           │
│      │                                               │
│      └──────────> EXPIRED (after TTL)                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Accept a Handoff

Target agent accepts the delegation:

```bash
POST /a2a/handoff/handoff_abc123/accept
X-Agent-Id: payment-agent

{ "accept": true }
```

**Response:**
```json
{
  "success": true,
  "handoff": { "status": "accepted", ... }
}
```

---

## Complete a Handoff

After completing the work:

```bash
POST /a2a/handoff/handoff_abc123/complete
X-Agent-Id: payment-agent

{
  "status": "completed",
  "result": { "orderId": "order-789", "transactionId": "txn-456" }
}
```

**Response:**
```json
{
  "success": true,
  "handoff": { "status": "completed", ... }
}
```

---

## Security: Permissions

| Permission | Allows |
|------------|--------|
| `read` | View checkout/order data |
| `write` | Modify checkout data |
| `execute` | Complete transactions |
| `delegate` | Pass to another agent |

```json
{ "permissions": ["read", "execute"] }
```

**Principle of least privilege - grant only what's needed.**

---

## Security: Trust Levels

| Level | Description |
|-------|-------------|
| `sandbox` | Testing only, no real transactions |
| `verified` | Identity confirmed |
| `trusted` | Full production access |

```bash
POST /a2a/resolve
{ "capability": "checkout", "minTrustLevel": "verified" }
```

---

## Security: Time-Limited

```
   Handoff Created                              Expires
        │                                          │
        │  ←────── TTL (1-24 hours) ──────→        │
        │                                          │
        ▼                                          ▼
   ┌─────────┐                               ┌─────────┐
   │ PENDING │                               │ EXPIRED │
   │ Active  │                               │ Invalid │
   └─────────┘                               └─────────┘
```

**Handoffs auto-expire if not processed.**

---

## API Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/a2a/agent` | Self agent card |
| GET | `/a2a/agents` | List all agents |
| POST | `/a2a/agents` | Register agent |
| POST | `/a2a/resolve` | Find by capability |
| POST | `/a2a/handoff` | Create handoff |
| GET | `/a2a/handoff/:id` | Get handoff |
| POST | `/a2a/handoff/:id/accept` | Accept/reject |
| POST | `/a2a/handoff/:id/complete` | Complete |

---

## Use Case: Multi-Agent Checkout

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Shopping   │     │   Payment   │     │ Fulfillment │
│    Agent    │     │    Agent    │     │    Agent    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Create cart    │                   │
       │ 2. Create checkout│                   │
       │                   │                   │
       │ ── Handoff ────>  │                   │
       │                   │ 3. Process payment│
       │ <─ Complete ────  │                   │
       │                   │                   │
       │ ─────────── Handoff ────────────────> │
       │                   │                   │ 4. Ship
       │ <────────── Complete ──────────────── │
       │                   │                   │
```

---

## Live Demo

**Get agent card:**
```bash
curl https://wix-ucp-tpa.onrender.com/a2a/agent
```

**Create a handoff:**
```bash
curl -X POST https://wix-ucp-tpa.onrender.com/a2a/handoff \
  -H "Content-Type: application/json" \
  -d '{
    "targetAgentId": "test-agent",
    "type": "checkout",
    "context": {"checkoutId": "test-123"},
    "intent": "Test handoff"
  }'
```

---

## Integration with MCP

A2A works alongside MCP tools:

```json
{
  "bindings": {
    "mcp": {
      "tools": "/mcp/tools",
      "call": "/mcp/call"
    },
    "a2a": {
      "agent": "/a2a/agent",
      "handoff": "/a2a/handoff"
    }
  }
}
```

**MCP:** Execute UCP operations
**A2A:** Coordinate between agents

---

## Summary

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  🤖 + 🤖 = 🤝 Agent-to-Agent Coordination          │
│                                                    │
│  ✅ Agent discovery by capability                  │
│  ✅ Secure transaction handoffs                    │
│  ✅ Permission-based delegation                    │
│  ✅ Time-limited with auto-expiry                  │
│  ✅ Trust levels for production safety             │
│  ✅ Complete audit trail                           │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Multi-agent commerce, made simple.**
