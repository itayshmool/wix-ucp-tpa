# Authentication Patterns Guide

**Last Updated**: 2026-01-16  
**Priority**: READ THIS before implementing any auth-related features

---

## 🎯 The Core Truth

**There are THREE different authentication patterns in this app, each for different users:**

1. **Merchant OAuth** - For merchant dashboard (management)
2. **Merchant API Keys** - For merchant API access (single-tenant)
3. **Public Endpoints** - For buyers and LLM agents (commerce)

**CRITICAL**: Buyers and LLM agents do NOT authenticate. They use public endpoints that use merchant credentials server-side.

---

## 🔐 Pattern 1: Merchant OAuth (Dashboard)

### When to Use
- Merchant dashboard UI
- Multi-tenant apps (multiple merchants)
- When you need per-merchant authorization
- Admin/management functions

### Environment Variables
```bash
WIX_APP_ID=your-app-id
WIX_APP_SECRET=your-app-secret
WIX_WEBHOOK_PUBLIC_KEY=your-public-key
BASE_URL=https://your-app.com
```

### How It Works
```
1. Merchant clicks "Install App" on Wix
2. Redirected to /auth/install
3. Wix authorization page
4. Redirected to /auth/callback
5. App exchanges code for access token
6. Token stored in instanceStore
7. Used for API calls: Authorization: Bearer {accessToken}
```

### Code Example
```typescript
// OAuth client
const client = new WixApiClient(instance.accessToken);

// Used in merchant-only routes
router.get('/api/:instanceId/admin/settings', async (req, res) => {
  const instance = instanceStore.get(req.params.instanceId);
  if (!instance.accessToken) {
    throw new AppError('OAuth required', 401);
  }
  
  const client = new WixApiClient(instance.accessToken);
  // ... merchant operations
});
```

### Pros & Cons
✅ Multi-tenant support  
✅ Per-merchant permissions  
✅ Wix-standard approach  
❌ Requires OAuth redirect URL setup  
❌ Complex setup  
❌ Not suitable for public endpoints  

---

## 🔑 Pattern 2: Merchant API Keys (Single-Tenant)

### When to Use
- Single merchant/site
- Server-side operations
- **Public buyer endpoints** (server uses merchant's keys)
- **Public LLM endpoints** (server uses merchant's keys)
- Simpler alternative to OAuth

### Environment Variables
```bash
WIX_API_KEY=your-api-key
WIX_ACCOUNT_ID=your-account-id
WIX_SITE_ID=your-site-id
```

### How It Works
```
1. Merchant gets API keys from Wix Developer Console
2. Merchant configures keys in app (Render env vars)
3. App uses keys for ALL buyer/LLM requests
4. Keys NEVER leave the server
5. Buyers/LLMs make unauthenticated requests
6. Server uses merchant's keys on their behalf
```

### Code Example
```typescript
// API Key client (server-side only)
const client = new WixApiClient({
  apiKey: process.env.WIX_API_KEY!,
  accountId: process.env.WIX_ACCOUNT_ID!,
  siteId: process.env.WIX_SITE_ID!,
});

// Used in public buyer routes
router.get('/storefront/products', async (req, res) => {
  // No auth from buyer!
  // Server uses merchant's keys
  const products = await client.get('/stores/v1/products');
  res.json({ products });
});

// Used in public UCP routes
router.get('/ucp/v1/products', async (req, res) => {
  // No auth from LLM!
  // Server uses merchant's keys
  const products = await client.get('/stores/v1/products');
  res.json({ products: formatForUCP(products) });
});
```

### Pros & Cons
✅ Simple setup  
✅ Works immediately  
✅ Perfect for public endpoints  
✅ No OAuth redirect issues  
❌ Single-tenant only  
❌ Keys must be kept secret  
❌ Less granular permissions  

---

## 🌍 Pattern 3: Public Endpoints (No Auth)

### When to Use
- **Buyer shopping** (browse, cart, checkout)
- **LLM agent shopping** (UCP protocol)
- Product browsing
- Order status checking
- Any public commerce operation

### Environment Variables
Uses Pattern 2 credentials (API Keys) server-side:
```bash
WIX_API_KEY=merchant-key
WIX_ACCOUNT_ID=merchant-account
WIX_SITE_ID=merchant-site
```

### How It Works
```
┌─────────────────────────────────────────┐
│ MERCHANT (One-Time Setup)              │
│ Configures API keys in app             │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ SERVER (Uses Merchant's Keys)          │
│ Exposes public endpoints                │
│ /storefront/* for buyers                │
│ /ucp/v1/* for LLM agents                │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ BUYERS/LLMs (No Auth Needed)           │
│ Make unauthenticated requests          │
│ Server handles Wix API calls           │
└─────────────────────────────────────────┘
```

### Code Example

**Buyer in Browser:**
```javascript
// No API keys, no OAuth tokens!
fetch('/storefront/products')
  .then(r => r.json())
  .then(products => {
    // Display products
  });

fetch('/storefront/checkout/quick', {
  method: 'POST',
  body: JSON.stringify({
    items: [{ productId: '123', quantity: 1 }]
  })
})
  .then(r => r.json())
  .then(data => {
    // Redirect to Wix checkout
    window.location.href = data.checkoutUrl;
  });
```

**LLM Agent:**
```python
# No authentication needed
import requests

# Discover capabilities
ucp = requests.get('https://app.com/.well-known/ucp').json()

# Browse products
products = requests.get('https://app.com/ucp/v1/products').json()

# Create checkout
checkout = requests.post('https://app.com/ucp/v1/checkout-sessions', json={
  'line_items': [{'product_id': '123', 'quantity': 1}]
}).json()

# Give buyer the checkout URL
print(f"Pay here: {checkout['checkout_url']}")
```

### Pros & Cons
✅ No buyer authentication needed  
✅ Works like any e-commerce site  
✅ Perfect for LLM agents  
✅ Simple buyer experience  
✅ Merchant credentials protected server-side  
❌ Requires API Key setup (Pattern 2)  
❌ No per-buyer customization  

---

## 🏗️ Complete Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ MERCHANT (Store Owner)                                      │
├─────────────────────────────────────────────────────────────┤
│ One-Time Setup:                                             │
│ • Option A: OAuth (WIX_APP_ID, WIX_APP_SECRET)              │
│ • Option B: API Keys (WIX_API_KEY, ACCOUNT_ID, SITE_ID)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ OUR APP SERVER                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ WixApiClient (Flexible Auth)                       │    │
│  │ • Supports OAuth tokens (Pattern 1)                │    │
│  │ • Supports API Keys (Pattern 2)                    │    │
│  │ • Used by all endpoints                            │    │
│  └────────────────────────────────────────────────────┘    │
│            ↑              ↑              ↑                  │
│            │              │              │                  │
│  ┌─────────┴──────┐  ┌───┴──────┐  ┌───┴──────────┐       │
│  │ Merchant API   │  │ Buyer    │  │ UCP Protocol │       │
│  │ /api/*/...     │  │ Storefront│  │ /ucp/v1/...  │       │
│  │ (Pattern 1)    │  │ /storefront│  │ (Pattern 3)  │       │
│  │ OAuth Required │  │ (Pattern 3)│  │ No Auth      │       │
│  └────────────────┘  │ No Auth  │  └──────────────┘       │
│                      └──────────┘                          │
└─────────────────────────────────────────────────────────────┘
        ↓                     ↓                   ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│  Dashboard   │    │   Buyers     │    │  LLM Agents      │
│  (Merchant)  │    │  (Humans)    │    │  (Gemini, etc)   │
│              │    │              │    │                  │
│ Pattern 1    │    │ Pattern 3    │    │ Pattern 3        │
│ OAuth        │    │ Public       │    │ Public           │
└──────────────┘    └──────────────┘    └──────────────────┘
```

---

## 📋 Decision Matrix

| Use Case | Pattern | Why |
|----------|---------|-----|
| Merchant dashboard | Pattern 1 (OAuth) | Multi-tenant, admin functions |
| Merchant API (single-site) | Pattern 2 (API Keys) | Simpler than OAuth |
| Buyer browsing products | Pattern 3 (Public) | No buyer auth needed |
| Buyer creating checkout | Pattern 3 (Public) | Standard e-commerce flow |
| LLM browsing products | Pattern 3 (Public) | No agent auth needed |
| LLM creating checkout | Pattern 3 (Public) | UCP protocol standard |
| Store settings/config | Pattern 1 or 2 | Admin access required |
| Analytics/reports | Pattern 1 or 2 | Merchant-only data |

---

## ⚠️ CRITICAL MISCONCEPTIONS TO AVOID

### ❌ WRONG: "Buyers need API keys or OAuth"
✅ RIGHT: "Buyers use public endpoints. Server uses merchant's credentials."

### ❌ WRONG: "LLM agents need special authentication"
✅ RIGHT: "LLM agents use same public endpoints as buyers."

### ❌ WRONG: "Each buyer/LLM needs their own Wix credentials"
✅ RIGHT: "All buyers/LLMs share merchant's access via server."

### ❌ WRONG: "API Keys are exposed to buyers/LLMs"
✅ RIGHT: "Keys stay server-side. Buyers/LLMs never see them."

### ❌ WRONG: "OAuth is required for all Wix integrations"
✅ RIGHT: "API Keys work for single-tenant, public endpoints."

---

## 🎯 Implementation Guide

### For Merchant Dashboard
```typescript
// Use Pattern 1 (OAuth)
const instance = instanceStore.get(instanceId);
const client = new WixApiClient({ accessToken: instance.accessToken });
```

### For Buyer/LLM Public Endpoints
```typescript
// Use Pattern 2 (API Keys) server-side
const client = new WixApiClient({
  apiKey: process.env.WIX_API_KEY,
  accountId: process.env.WIX_ACCOUNT_ID,
  siteId: process.env.WIX_SITE_ID,
});

// Expose as Pattern 3 (Public) to buyers
router.get('/storefront/products', async (req, res) => {
  // No authentication from request
  const products = await client.get('/stores/v1/products');
  res.json({ products });
});
```

---

## 🔗 Related Documentation

- [CRITICAL-ARCHITECTURE.md](./CRITICAL-ARCHITECTURE.md) - Overall architecture
- [Phase 3 README](./phase-3/README.md) - Buyer checkout flow
- [Phase 4-6 README](./phase-4-6/README.md) - UCP protocol
- [wix-integration-learnings.md](./wix-integration-learnings.md) - Wix-specific patterns

---

**Remember**: Most e-commerce operations are public! Only admin/management needs authentication.
