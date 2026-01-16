# 🎯 PROOF OF CONCEPT (POC) DEFINITION

**Project**: Wix UCP TPA  
**Phase**: POC - Single Store Validation  
**Created**: 2026-01-16  
**Status**: In Progress  

---

## 📋 POC OVERVIEW

### What This POC Proves
```
✅ LLM Agent can discover a Wix store via UCP protocol
✅ LLM can browse products in standardized UCP format
✅ LLM can create and manage shopping cart
✅ LLM can initiate checkout → Wix Hosted Checkout
✅ Buyer completes payment on Wix
✅ Order is created and trackable
✅ Complete buyer journey works end-to-end
```

### What This POC Does NOT Include
```
❌ Multi-merchant support (future phase)
❌ Merchant onboarding portal (future phase)
❌ "Login with Wix" SSO (not supported by Wix)
❌ Wix App Market distribution (architecture limitation)
❌ Production security hardening (future phase)
❌ Billing/monetization (future phase)
❌ Multiple LLM provider support (Gemini only for POC)
```

---

## 🏗️ POC ARCHITECTURE

### High-Level Flow
```
┌──────────────────┐     ┌──────────────────┐
│  BUYER TEST UI   │     │   LLM AGENT      │
│  /test/storefront│     │   (Gemini)       │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         │    UCP Protocol        │
         └───────────┬────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│         WIX-UCP-TPA SERVER                      │
│         (Node.js + Express + Redis)             │
│                                                 │
│  ┌───────────────────────────────────────────┐│
│  │  BUYER TEST UI ROUTES                     ││
│  │  GET /test/storefront  → Product catalog  ││
│  │  Cart management via JavaScript           ││
│  │  Checkout redirect to Wix                 ││
│  └───────────────────────────────────────────┘│
│                      │                         │
│  ┌───────────────────┼───────────────────────┐│
│  │  UCP LAYER (Universal Commerce Protocol)  ││
│  │  GET  /.well-known/ucp    → Discovery     ││
│  │  GET  /ucp/products       → Browse        ││
│  │  POST /ucp/cart           → Create cart   ││
│  │  PUT  /ucp/cart/:id       → Update cart   ││
│  │  POST /ucp/checkout       → Get URL       ││
│  │  GET  /ucp/orders/:id     → Order status  ││
│  └───────────────────┼───────────────────────┘│
│                      │                         │
│  ┌───────────────────┼───────────────────────┐│
│  │  WIX API LAYER (Existing from Phase 2-3)  ││
│  │  ProductsService  CartService             ││
│  │  CheckoutService  OrdersService           ││
│  └───────────────────┼───────────────────────┘│
│                      │                         │
│  ┌───────────────────┼───────────────────────┐│
│  │  AUTHENTICATION (Single Store)            ││
│  │  Option A: Headless OAuth Client          ││
│  │  Option B: API Keys (WIX_API_KEY, etc.)   ││
│  └───────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
                     │
                     │ Wix REST APIs
                     ▼
          ┌─────────────────────┐
          │  YOUR WIX STORE     │
          │  (Single tenant)    │
          └─────────────────────┘
```

### Technology Stack
```
Backend:
  • Node.js 20+
  • TypeScript 5+
  • Express.js
  • Redis (credentials storage)

Frontend (Test UI):
  • Server-side rendered HTML
  • Tailwind CSS (via CDN)
  • Vanilla JavaScript
  • No build step required

Authentication:
  • Wix Headless OAuth Client (preferred)
  • OR Wix API Keys (fallback)

Deployment:
  • Render.com (existing)
  • Redis (Render add-on or existing)
```

---

## 📁 POC FILE STRUCTURE

```
src/
├── config/
│   └── env.ts                    # Environment config (update for POC)
├── wix/
│   ├── client.ts                 # WixApiClient (existing)
│   ├── client-factory.ts         # Client factory (simplify for POC)
│   └── types.ts                  # Wix types (existing)
├── services/
│   ├── products/                 # Existing ✅
│   ├── cart/                     # Existing ✅
│   ├── checkout/                 # Existing ✅
│   ├── orders/                   # Existing ✅
│   └── ucp/                      # NEW - UCP Layer
│       ├── ucp.types.ts          # UCP protocol types
│       ├── ucp.translator.ts     # Wix ↔ UCP conversion
│       └── ucp.service.ts        # UCP business logic
├── routes/
│   ├── ucp.routes.ts             # NEW - UCP API endpoints
│   └── test-ui.routes.ts         # NEW - Test UI pages
├── views/                        # NEW - HTML templates
│   ├── storefront.html           # Product catalog page
│   ├── cart.html                 # Cart page (or component)
│   └── order-complete.html       # Order confirmation
└── index.ts                      # Main app (update routes)
```

---

## 🔧 IMPLEMENTATION STEPS

### STEP 1: Authentication Setup
**Goal**: Get working API access to your Wix store

**Option A - Headless OAuth (Preferred)**:
```
□ Complete Wix Headless Client wizard
□ Get Client ID and Client Secret
□ Configure redirect URL: https://wix-ucp-tpa.onrender.com/auth/headless/callback
□ Implement OAuth flow to get access token
□ Store access token (Redis or env var for POC)
```

**Option B - API Keys (Faster fallback)**:
```
□ Go to Wix Dashboard → Settings → API Keys
□ Generate API Key with permissions:
  - Wix Stores: Read Products
  - Wix Stores: Manage Cart
  - Wix Stores: Manage Checkout
  - Wix Stores: Read Orders
□ Get Account ID and Site ID
□ Configure in Render:
  - WIX_API_KEY=<your-api-key>
  - WIX_ACCOUNT_ID=<your-account-id>
  - WIX_SITE_ID=<your-site-id>
```

### STEP 2: Simplify Codebase
**Goal**: Remove failed multi-tenant code, focus on single store

```
□ Update src/wix/client-factory.ts:
  - Remove instanceParam fallback
  - Use single store credentials

□ Update src/config/env.ts:
  - Add WIX_API_KEY, WIX_ACCOUNT_ID, WIX_SITE_ID (if using API Keys)
  - OR add HEADLESS_CLIENT_ID, HEADLESS_CLIENT_SECRET (if using OAuth)

□ Create src/wix/poc-client.ts:
  - Single function to get authenticated WixApiClient
  - No multi-tenant logic

□ Test: Verify can list products from your store
```

### STEP 3: Build UCP Layer
**Goal**: Implement Universal Commerce Protocol endpoints

```
□ Create src/services/ucp/ucp.types.ts:
  - UCPStore interface
  - UCPProduct interface
  - UCPCart interface
  - UCPCheckout interface
  - UCPOrder interface

□ Create src/services/ucp/ucp.translator.ts:
  - wixProductToUCP(wixProduct) → UCPProduct
  - wixCartToUCP(wixCart) → UCPCart
  - ucpCartItemToWix(ucpItem) → WixLineItem
  - etc.

□ Create src/routes/ucp.routes.ts:
  - GET /.well-known/ucp         → Store discovery
  - GET /ucp/products            → List products
  - GET /ucp/products/:id        → Get product
  - GET /ucp/products/search     → Search products
  - POST /ucp/cart               → Create cart
  - GET /ucp/cart/:id            → Get cart
  - PUT /ucp/cart/:id/items      → Add/update items
  - DELETE /ucp/cart/:id/items/:itemId → Remove item
  - POST /ucp/checkout           → Create checkout
  - GET /ucp/orders/:id          → Get order status
```

### STEP 4: Build Buyer Test UI
**Goal**: Web interface to manually test the buyer flow

```
□ Create src/routes/test-ui.routes.ts:
  - GET /test/storefront         → Product catalog page
  - GET /test/cart               → Cart page
  - GET /test/order-complete     → Order confirmation

□ Create src/views/storefront.html:
  - Product grid with images, names, prices
  - "Add to Cart" buttons
  - Search/filter input
  - Cart icon with item count
  - Responsive design (Tailwind)

□ Create cart functionality:
  - Show items in cart
  - Update quantities (+/-)
  - Remove items
  - Show subtotal/total
  - "Proceed to Checkout" button

□ Checkout flow:
  - Call /ucp/checkout to get Wix URL
  - Redirect user to Wix Hosted Checkout
  - Handle return URL (order-complete page)
```

### STEP 5: Integration Testing
**Goal**: Validate complete end-to-end flow

```
□ Manual Test Flow:
  1. Open /test/storefront
  2. Browse products
  3. Add items to cart
  4. View cart, adjust quantities
  5. Click "Proceed to Checkout"
  6. Complete payment on Wix (test mode)
  7. Verify redirect to order-complete page
  8. Verify order in Wix Dashboard

□ API Test Flow (curl/Postman):
  1. GET /.well-known/ucp → Verify store info
  2. GET /ucp/products → Verify products list
  3. POST /ucp/cart → Create cart
  4. PUT /ucp/cart/:id/items → Add items
  5. POST /ucp/checkout → Get checkout URL
  6. Open URL → Complete payment
  7. GET /ucp/orders/:id → Verify order status
```

### STEP 6: LLM Integration (Optional for POC)
**Goal**: Demonstrate LLM can use UCP

```
□ Create test script: scripts/test-llm-flow.ts
  - Simulates LLM calling UCP endpoints
  - Logs each step

□ (Optional) Integrate with Gemini API:
  - Create src/llm/gemini-client.ts
  - Create agent prompt template
  - Test conversation flow
```

---

## ✅ POC SUCCESS CRITERIA

| # | Milestone | How to Verify | Status |
|---|-----------|---------------|--------|
| M1 | API Authentication works | Can list products via API | ⬜ |
| M2 | UCP Discovery works | `GET /.well-known/ucp` returns store info | ⬜ |
| M3 | Product browsing works | Test UI shows products from Wix store | ⬜ |
| M4 | Cart creation works | Can add items, see in cart | ⬜ |
| M5 | Cart management works | Can update quantities, remove items | ⬜ |
| M6 | Checkout URL works | Click checkout → Wix payment page | ⬜ |
| M7 | Payment works | Complete test payment successfully | ⬜ |
| M8 | Order confirmation works | Order appears in Wix Dashboard | ⬜ |
| M9 | Order status API works | `GET /ucp/orders/:id` returns order | ⬜ |
| M10 | Full flow works | Complete buyer journey end-to-end | ⬜ |

---

## 📊 UCP PROTOCOL SPECIFICATION (POC Version)

### Discovery Endpoint
```
GET /.well-known/ucp

Response:
{
  "protocol": "ucp",
  "version": "1.0.0-poc",
  "store": {
    "id": "your-store-id",
    "name": "Your Store Name",
    "description": "Store description",
    "url": "https://your-store.wixsite.com/shop",
    "currency": "USD",
    "categories": ["electronics", "accessories"]
  },
  "capabilities": ["browse", "search", "cart", "checkout"],
  "endpoints": {
    "products": "/ucp/products",
    "cart": "/ucp/cart",
    "checkout": "/ucp/checkout",
    "orders": "/ucp/orders"
  }
}
```

### Products Endpoint
```
GET /ucp/products?limit=20&offset=0&category=electronics&search=laptop

Response:
{
  "products": [
    {
      "id": "prod-123",
      "name": "Dell XPS 15",
      "description": "Powerful laptop...",
      "price": {
        "amount": 1299.00,
        "currency": "USD",
        "formatted": "$1,299.00"
      },
      "images": [
        { "url": "https://...", "alt": "Dell XPS 15" }
      ],
      "available": true,
      "stock": 5,
      "category": "electronics",
      "variants": []
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Cart Endpoints
```
POST /ucp/cart
Body: {
  "items": [
    { "productId": "prod-123", "quantity": 1 }
  ]
}

Response:
{
  "cartId": "cart-456",
  "items": [...],
  "totals": {
    "subtotal": { "amount": 1299.00, "currency": "USD" },
    "tax": { "amount": 0, "currency": "USD" },
    "total": { "amount": 1299.00, "currency": "USD" }
  }
}
```

### Checkout Endpoint
```
POST /ucp/checkout
Body: {
  "cartId": "cart-456",
  "successUrl": "https://wix-ucp-tpa.onrender.com/test/order-complete",
  "cancelUrl": "https://wix-ucp-tpa.onrender.com/test/storefront"
}

Response:
{
  "checkoutId": "checkout-789",
  "checkoutUrl": "https://your-store.wixsite.com/shop/checkout/...",
  "expiresAt": "2026-01-16T15:00:00Z"
}
```

---

## 🎨 TEST UI SPECIFICATIONS

### Storefront Page (`/test/storefront`)
```
Features:
- Header with logo, search bar, cart icon
- Product grid (responsive: 1-4 columns)
- Each product card shows:
  - Image
  - Name
  - Price
  - "Add to Cart" button
- Cart sidebar/modal:
  - List of items
  - Quantity controls
  - Remove button
  - Subtotal
  - "Checkout" button
- Footer with POC disclaimer

Tech:
- Server-rendered HTML
- Tailwind CSS via CDN
- Vanilla JS for interactivity
- Fetch API for UCP calls
- LocalStorage for cart state (optional)
```

### Visual Style
```
- Clean, modern design
- Primary color: Blue (#3B82F6)
- Background: Light gray (#F3F4F6)
- Cards: White with shadow
- Mobile-first responsive
- Loading states
- Error handling UI
```

---

## 🚀 DEPLOYMENT

### Environment Variables (POC)
```bash
# Required
NODE_ENV=production
PORT=10000
LOG_LEVEL=info
BASE_URL=https://wix-ucp-tpa.onrender.com

# Wix Authentication (choose one approach)
# Option A: API Keys
WIX_API_KEY=your-api-key
WIX_ACCOUNT_ID=your-account-id
WIX_SITE_ID=your-site-id

# Option B: Headless OAuth
HEADLESS_CLIENT_ID=your-client-id
HEADLESS_CLIENT_SECRET=your-client-secret
HEADLESS_ACCESS_TOKEN=your-access-token

# Redis (optional for POC, can use in-memory)
REDIS_URL=your-redis-url

# Existing (keep)
WIX_APP_ID=existing-value
WIX_APP_SECRET=existing-value
WIX_WEBHOOK_PUBLIC_KEY=existing-value
```

### Deployment Steps
```bash
# 1. Build
npm run build

# 2. Commit
git add -A
git commit -m "feat: POC implementation - UCP layer + Test UI"

# 3. Push (auto-deploys to Render)
git push origin main

# 4. Monitor deployment
# Check Render dashboard for build logs

# 5. Test
# Open https://wix-ucp-tpa.onrender.com/test/storefront
```

---

## 📅 TIMELINE

```
┌─────────────────────────────────────────────────────────────┐
│ Day 1: Authentication + Cleanup                             │
│   □ Complete Headless OAuth OR configure API Keys           │
│   □ Simplify codebase (remove multi-tenant code)            │
│   □ Test: Can list products                                 │
├─────────────────────────────────────────────────────────────┤
│ Day 2: UCP Layer                                            │
│   □ Create UCP types                                        │
│   □ Implement translator (Wix ↔ UCP)                        │
│   □ Implement UCP endpoints                                 │
│   □ Test: All UCP endpoints work                            │
├─────────────────────────────────────────────────────────────┤
│ Day 3: Test UI                                              │
│   □ Build storefront page                                   │
│   □ Build cart functionality                                │
│   □ Build checkout flow                                     │
│   □ Test: Manual buyer flow works                           │
├─────────────────────────────────────────────────────────────┤
│ Day 4: Integration & Testing                                │
│   □ End-to-end testing                                      │
│   □ Fix bugs                                                │
│   □ Complete test payment                                   │
│   □ Verify order in Wix Dashboard                           │
├─────────────────────────────────────────────────────────────┤
│ Day 5: Documentation & Demo                                 │
│   □ Document UCP API                                        │
│   □ Create demo video                                       │
│   □ (Optional) LLM integration test                         │
│   □ POC Complete! 🎉                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔮 POST-POC: Multi-Tenant Options

After POC validation, choose scaling approach:

### Option A: Self-Service API Keys
```
- Merchants sign up on your portal
- They generate Wix API Keys
- They enter keys in your dashboard
- You store (encrypted) and use their keys
- Multi-tenant via your own registration
```

### Option B: Wix App Market (If feasible)
```
- Investigate if any Wix App type supports server-side OAuth
- May require Wix Partner program
- Contact Wix developer support
```

### Option C: Hybrid Approach
```
- Keep Dashboard Extension for marketplace presence
- Merchants manually configure API Keys after install
- Less seamless but works
```

---

## 📝 NOTES & DECISIONS

### Why Single-Tenant for POC?
- Wix Headless OAuth is site-scoped (not account-scoped)
- Dashboard Extension apps don't support OAuth redirect URLs
- No "Login with Wix" SSO for external apps
- POC validates core flow; multi-tenant is separate problem

### Why Test UI Before LLM?
- Faster iteration (no LLM API costs)
- Visual debugging
- Demonstrates to stakeholders
- Foundation for LLM integration

### Key Risk: Wix API Rate Limits
- Monitor API usage during testing
- Implement caching if needed
- Check Wix rate limit documentation

---

## ✅ POC DEFINITION COMPLETE

This document defines the full scope of the Proof of Concept phase.
Update the Status checkboxes as milestones are completed.

**Next Action**: Complete Step 1 (Authentication Setup)
