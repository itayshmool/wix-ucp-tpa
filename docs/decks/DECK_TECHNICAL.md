# 🛠️ Wix UCP Integration
## Technical Architecture & Implementation

*Bridging AI Agents to Wix Commerce via UCP*

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 20+ |
| **Language** | TypeScript 5+ |
| **Framework** | Express.js |
| **Wix SDK** | `@wix/sdk`, `@wix/ecom`, `@wix/stores` |
| **Hosting** | Render.com |
| **Protocol** | UCP (Universal Commerce Protocol) |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Agent Layer                          │
│              (Gemini, GPT, Claude, etc.)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                       UCP Protocol
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   UCP API Gateway                           │
│                 (wix-ucp-tpa on Render)                     │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Discovery  │  │  Catalog    │  │  Cart       │         │
│  │  Endpoint   │  │  Service    │  │  Service    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Checkout   │  │  Translator │  │  SDK Client │         │
│  │  Service    │  │  (Wix↔UCP)  │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            │
                       Wix SDK
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Wix Platform                             │
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────────────┐         │
│   │ Stores   │  │ eCommerce│  │ Hosted Checkout  │         │
│   │ API      │  │ API      │  │ (PCI DSS L1)     │         │
│   └──────────┘  └──────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## UCP Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/.well-known/ucp` | GET | Store discovery |
| `/ucp/products` | GET | List products |
| `/ucp/products/:id` | GET | Product details |
| `/ucp/cart` | POST | Add to cart |
| `/ucp/cart` | GET | Get current cart |
| `/ucp/cart/:itemId` | PUT | Update quantity |
| `/ucp/cart/:itemId` | DELETE | Remove item |
| `/ucp/checkout` | POST | Create checkout → URL |

---

## UCP Discovery Response

```json
{
  "protocol": "ucp",
  "version": "1.0",
  "merchant": {
    "id": "5713796246",
    "name": "Pop Stop Drink",
    "domain": "popstopdrink.com",
    "currency": "USD",
    "verified": true
  },
  "capabilities": [
    "catalog_search",
    "product_details", 
    "cart_management",
    "checkout"
  ],
  "endpoints": {
    "catalog": "/ucp/products",
    "cart": "/ucp/cart",
    "checkout": "/ucp/checkout"
  },
  "payment_handlers": ["com.wix.checkout.v1"],
  "supported_countries": ["US"],
  "trust_signals": {
    "ssl": true,
    "shipping_policy_url": "..."
  }
}
```

---

## Authentication Flow

### Headless OAuth Strategy

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Our App   │     │  Wix SDK    │     │ Wix APIs    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │ createClient({    │                   │
      │   auth: OAuth({   │                   │
      │     clientId      │                   │
      │   })              │                   │
      │ })                │                   │
      │──────────────────>│                   │
      │                   │ Visitor Token     │
      │                   │──────────────────>│
      │                   │<──────────────────│
      │<──────────────────│                   │
      │                   │                   │
      │ client.products   │                   │
      │   .queryProducts()│                   │
      │──────────────────>│                   │
      │                   │ Authenticated     │
      │                   │ API Call          │
      │                   │──────────────────>│
      │                   │<──────────────────│
      │<──────────────────│                   │
```

---

## Data Translation Layer

```typescript
// Wix Product → UCP Product
function wixProductToUCP(wixProduct): UCPProduct {
  return {
    id: wixProduct._id,
    name: wixProduct.name,
    price: {
      amount: wixProduct.priceData?.price,
      currency: wixProduct.priceData?.currency,
      formatted: wixProduct.priceData?.formatted?.price
    },
    images: wixProduct.media?.items?.map(i => ({
      url: i.image?.url
    })),
    available: wixProduct.stock?.inStock
  };
}
```

---

## Cart → Checkout Flow

```typescript
// 1. Add to cart (uses currentCart API)
POST /ucp/cart
{ items: [{ productId: "abc", quantity: 1 }] }

// 2. Create checkout
POST /ucp/checkout
{}

// 3. Response includes Wix checkout URL
{
  "id": "chk_xyz",
  "checkoutUrl": "https://popstopdrink.com/checkout?...",
  "totals": { "total": { "amount": 4.00 } }
}

// 4. Buyer redirects to Wix Hosted Checkout
// 5. Payment processed by Wix (PCI compliant)
// 6. Order created in merchant's Wix dashboard
```

---

## Key Design Decisions

| Decision | Reasoning |
|----------|-----------|
| **Wix SDK over REST** | SDK handles session tokens, cart state automatically |
| **Hosted Checkout** | Zero PCI liability, trusted by buyers |
| **Headless OAuth** | Enables visitor sessions without user login |
| **UCP Standard** | Future-proof, Google-backed protocol |
| **Single-store POC** | Simplify first, scale later |

---

## Security Model

```
┌─────────────────────────────────────────┐
│            Sensitive Data               │
│                                         │
│   Card Numbers    ──X──>  Our Server    │
│   CVV             ──X──>  Our Server    │
│   Bank Details    ──X──>  Our Server    │
│                                         │
│              NEVER TOUCHES US           │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Wix Hosted Checkout             │
│                                         │
│   • PCI DSS Level 1 Certified           │
│   • SSL/TLS Encryption                  │
│   • Tokenization                        │
│   • 3D Secure Support                   │
│   • Fraud Detection                     │
└─────────────────────────────────────────┘
```

---

## Project Structure

```
wix-ucp-tpa/
├── src/
│   ├── config/env.ts           # Environment config
│   ├── wix/
│   │   └── sdk-client.ts       # Wix SDK initialization
│   ├── services/ucp/
│   │   ├── ucp.types.ts        # UCP interfaces
│   │   └── ucp.translator.ts   # Wix ↔ UCP conversion
│   ├── routes/
│   │   ├── ucp.routes.ts       # UCP API endpoints
│   │   └── test-ui.routes.ts   # Test storefront
│   └── index.ts                # Express app
├── package.json
└── tsconfig.json
```

---

## Environment Variables

```bash
# Wix Headless
HEADLESS_CLIENT_ID=ae2cf608-...

# App Config
BASE_URL=https://wix-ucp-tpa.onrender.com
PORT=3000
NODE_ENV=production

# Optional (for multi-tenant future)
REDIS_URL=redis://...
WIX_APP_ID=...
WIX_APP_SECRET=...
```

---

## Deployment Pipeline

```
GitHub (main)
     │
     │ push
     ▼
┌─────────────┐
│   Render    │
│             │
│ • npm i     │
│ • npm build │
│ • npm start │
└─────────────┘
     │
     │ Auto-deploy
     ▼
https://wix-ucp-tpa.onrender.com
```

---

## Testing Approach

| Test Type | Method |
|-----------|--------|
| **Unit** | Jest (planned) |
| **Integration** | Test UI (`/test/storefront`) |
| **E2E** | Manual + LLM simulation |
| **API** | curl / Postman |

---

## Google Merchant Integration

```
GET /ucp/feed/google-merchant.tsv

→ Auto-generated TSV feed
→ Google fetches daily
→ Products stay in sync
```

---

## Future Architecture (Multi-Tenant)

```
                    ┌─────────────┐
                    │ App Market  │
                    │ (Wix)       │
                    └─────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Store A  │    │ Store B  │    │ Store C  │
    │ OAuth    │    │ OAuth    │    │ OAuth    │
    └──────────┘    └──────────┘    └──────────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                          ▼
                 ┌────────────────┐
                 │  UCP Gateway   │
                 │  (Multi-tenant)│
                 │                │
                 │ /api/:instance │
                 └────────────────┘
```

---

## Links

| Resource | URL |
|----------|-----|
| **Live App** | https://wix-ucp-tpa.onrender.com |
| **Test UI** | https://wix-ucp-tpa.onrender.com/test/storefront |
| **UCP Discovery** | https://wix-ucp-tpa.onrender.com/.well-known/ucp |
| **Product Feed** | https://wix-ucp-tpa.onrender.com/ucp/feed/google-merchant.tsv |
| **GitHub** | github.com/itayshmool/wix-ucp-tpa |
| **UCP Spec** | https://ucp.dev |
