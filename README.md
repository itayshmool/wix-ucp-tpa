# Wix UCP TPA

A Wix Third-Party Application implementing the **Universal Commerce Protocol (UCP)** for AI-powered commerce.

> **Enable LLM agents like Gemini, ChatGPT, and Alexa to complete purchases on your Wix store**

---

## 🎯 What This Is

This project connects Wix eCommerce to the [UCP Protocol](https://ucpprotocol.io), allowing AI assistants to:

- Browse products with semantic search
- Manage shopping carts
- Complete checkouts
- Track orders and fulfillment
- Apply discounts and coupons
- Handle payments (sandbox and production)

---

## ✅ Implementation Status

**All 14 Phases Complete** | 176 Tests Passing

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation (OAuth, Webhooks) | ✅ |
| 2 | Wix eCommerce (Products, Orders) | ✅ |
| 3 | Checkout Flow | ✅ |
| 4 | UCP Discovery & Profile | ✅ |
| 5 | UCP Capabilities | ✅ |
| 6 | Production Deployment | ✅ |
| 7 | UCP Orders Extension | ✅ |
| 8 | Schema Validation (Zod) | ✅ |
| 9 | Fulfillment & Webhooks | ✅ |
| 10 | Discounts & Coupons | ✅ |
| 11 | Payment Handlers | ✅ |
| 12 | Server-Side Checkout | ✅ |
| 13 | Protocol Bindings (MCP + A2A) | ✅ |
| 14 | Identity & Consent (GDPR) | ✅ |

---

## 🚀 Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your Wix credentials

# Run
npm run dev

# Test
npm test
```

---

## 📡 UCP Endpoints

### Discovery
```
GET  /ucp                          # Protocol discovery
```

### Catalog
```
GET  /ucp/products                 # Search products
GET  /ucp/products/:id             # Product details
```

### Cart
```
POST /ucp/cart                     # Create cart
GET  /ucp/cart/:id                 # Get cart
PUT  /ucp/cart/items/:itemId       # Update item
DELETE /ucp/cart/items/:itemId     # Remove item
```

### Checkout
```
POST /ucp/checkout                 # Create checkout
GET  /ucp/checkout/:id             # Get checkout
POST /ucp/checkout/:id/coupons     # Apply coupon
DELETE /ucp/checkout/:id/coupons   # Remove coupon
GET  /ucp/checkout/:id/discounts   # Get discounts
POST /ucp/checkout/:id/complete    # Complete (server-side)
```

### Orders
```
GET  /ucp/orders                   # List orders
GET  /ucp/orders/:id               # Get order
GET  /ucp/orders/:id/fulfillments  # Get fulfillments
GET  /ucp/orders/:id/events        # Fulfillment events
```

### Payments
```
GET  /ucp/payment-handlers         # List handlers
GET  /ucp/payment-handlers/:id     # Handler details
POST /ucp/checkout/:id/mint        # Mint instrument
GET  /ucp/instruments/:id          # Get instrument
POST /ucp/instruments/:id/validate # Validate
DELETE /ucp/instruments/:id        # Cancel
```

### Webhooks
```
POST /ucp/webhooks                 # Register
GET  /ucp/webhooks                 # List
GET  /ucp/webhooks/:id             # Get
DELETE /ucp/webhooks/:id           # Unregister
```

### Identity & Consent
```
POST /ucp/identity/link            # Link identity
GET  /ucp/identity/:platform/:id   # Get identity
DELETE /ucp/identity/:platform/:id # Delete identity
POST /ucp/consent                  # Grant consent
GET  /ucp/consent/:email           # Get consent
DELETE /ucp/consent/:email/:type   # Revoke consent
GET  /ucp/gdpr/export/:email       # Export data
POST /ucp/gdpr/delete              # Delete data
```

---

## 🔌 Protocol Bindings

### MCP (Model Context Protocol)
```
GET  /mcp/tools                    # List tools
POST /mcp/call                     # Execute tool
```

Exposes all UCP operations as MCP tools for AI frameworks.

### A2A (Agent-to-Agent)
```
GET  /a2a/agent                    # Agent card
POST /a2a/handoff                  # Create handoff
POST /a2a/handoff/:id/accept       # Accept
POST /a2a/handoff/:id/complete     # Complete
DELETE /a2a/handoff/:id            # Cancel
GET  /a2a/handoffs                 # List handoffs
GET  /a2a/stats                    # Statistics
```

Enables multi-agent transaction coordination.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**Test Coverage**: 176 tests across 8 test files

| Test File | Coverage |
|-----------|----------|
| `ucp-endpoints.test.ts` | Core UCP |
| `ucp-phase7-10.test.ts` | Orders, Validation, Fulfillment, Discounts |
| `ucp-phase11-payment.test.ts` | Payment handlers |
| `ucp-phase12-complete.test.ts` | Server-side checkout |
| `ucp-phase13-bindings.test.ts` | MCP + A2A |
| `ucp-phase14-identity.test.ts` | Identity & GDPR |
| `intent-detection.test.ts` | LLM intent parsing |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LLM Platform                         │
│              (Gemini, ChatGPT, Alexa)                   │
└────────────────────────┬────────────────────────────────┘
                         │ UCP Protocol
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Wix UCP TPA                           │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  UCP Routes │  │ MCP Binding  │  │  A2A Binding  │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │          │
│  ┌──────▼────────────────▼───────────────────▼───────┐ │
│  │                   Services                         │ │
│  │  Products │ Cart │ Checkout │ Orders │ Payment    │ │
│  │  Fulfillment │ Discount │ Identity │ Consent      │ │
│  └──────────────────────┬────────────────────────────┘ │
└─────────────────────────┼───────────────────────────────┘
                          │ Wix SDK
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Wix Platform                         │
│           (eCommerce, Payments, CRM)                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# Wix App (from Wix Developer Console)
WIX_APP_ID=your-app-id
WIX_APP_SECRET=your-app-secret
WIX_WEBHOOK_PUBLIC_KEY=your-webhook-key
BASE_URL=https://your-domain.com
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [QUICKSTART.md](./QUICKSTART.md) | Get started in 5 minutes |
| [docs/README.md](./docs/README.md) | Documentation index |
| [docs/decks/](./docs/decks/) | Presentation decks |
| [docs/guides/](./docs/guides/) | Implementation guides |
| [.cursor/rules/](./cursor/rules/) | Development rules |

---

## 🚢 Deployment

Deployed on **Render.com** with `render.yaml`.

```bash
# Build
npm run build

# Start production
npm start
```

Live URL: `https://wix-ucp-tpa.onrender.com`

---

## 🤝 UCP Protocol Compliance

This implementation follows the [UCP Specification](https://ucpprotocol.io):

| Capability | Implemented |
|------------|:-----------:|
| Discovery (`/ucp`) | ✅ |
| Catalog Search | ✅ |
| Product Details | ✅ |
| Cart Management | ✅ |
| Checkout Creation | ✅ |
| Server-Side Checkout | ✅ |
| Orders & Fulfillment | ✅ |
| Discounts & Coupons | ✅ |
| Payment Handlers | ✅ |
| Webhooks | ✅ |
| Identity Linking | ✅ |
| Consent Management | ✅ |
| GDPR Compliance | ✅ |
| MCP Binding | ✅ |
| A2A Binding | ✅ |

---

## 📄 License

MIT

---

*Built for AI-first commerce* 🤖🛒
