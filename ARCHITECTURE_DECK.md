# PopStop UCP Architecture
### AI-Powered Commerce for LLM Agents

---

# 🎯 What We Built

AI assistants can **shop from a real store**.

```
  "Show me drinks"  →  🤖  →  📦 Real products
  "Add to cart"     →  🤖  →  🛒 Real cart  
  "Checkout"        →  🤖  →  💳 Real payment
```

---

# 🏗️ System Layers

```
┌────────────────────────────────────┐
│  Layer 6: Testing (Vitest)         │
├────────────────────────────────────┤
│  Layer 5: Infrastructure (Render)  │
├────────────────────────────────────┤
│  Layer 4: LLM Chat UI              │
├────────────────────────────────────┤
│  Layer 3: UCP API                  │
├────────────────────────────────────┤
│  Layer 2: Wix SDK Client           │
├────────────────────────────────────┤
│  Layer 1: Wix eCommerce            │
└────────────────────────────────────┘
```

---

# Layer 1: Wix eCommerce

**The real store with real products.**

| Component | Purpose |
|-----------|---------|
| Wix Stores | Product catalog |
| Wix Cart | Shopping cart |
| Wix Checkout | Payment processing |
| Wix Payments | Stripe integration |

**Store**: popstopdrink.com

---

# Layer 2: Wix SDK Client

**Server-side connection to Wix.**

```typescript
const client = createClient({
  modules: { cart, checkout, products },
  auth: OAuthStrategy({
    clientId: HEADLESS_CLIENT_ID
  })
});
```

✅ No user login required  
✅ Secure server-side calls  
✅ Auto session management

---

# Layer 3: UCP API

**Universal Commerce Protocol** - REST API for LLMs.

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/ucp/products` | List products |
| POST | `/ucp/cart` | Add to cart |
| DELETE | `/ucp/cart` | Clear cart |
| POST | `/ucp/checkout` | Create checkout |
| GET | `/ucp/checkout/:id/status` | Check payment |

---

# Layer 3: Products Response

```json
{
  "products": [{
    "id": "abc-123",
    "name": "Cone Crusher",
    "price": {
      "amount": 4.00,
      "formatted": "$4.00"
    },
    "images": [{ "url": "https://..." }],
    "inStock": true
  }]
}
```

---

# Layer 3: Checkout Response

```json
{
  "id": "checkout-xyz",
  "checkoutUrl": "https://popstopdrink.com/checkout?...",
  "totals": {
    "total": { 
      "amount": 8.00, 
      "formatted": "$8.00" 
    },
    "itemCount": 2
  }
}
```

---

# Layer 4: LLM Test Chat

**Chat interface making real API calls.**

```
┌─────────────────────────────────┐
│ 👤 "Show me drinks"             │
│                                 │
│ 🤖 [Product] [Product] [Product]│
│    $4.00     $4.00     $4.00   │
│                                 │
│ 👤 "Add Cone Crusher"           │
│                                 │
│ 🤖 ✅ Added! Cart: $4.00        │
└─────────────────────────────────┘
```

---

# Layer 4: Intent Detection

**Pattern matching on user messages.**

| Intent | Trigger Words |
|--------|---------------|
| BROWSE | show, list, products |
| ADD_TO_CART | add, want, buy |
| CHECKOUT | checkout, pay |
| VIEW_CART | cart, basket |
| CLEAR_CART | clear, empty |

---

# Layer 5: Infrastructure

**Hosted on Render.com**

| Service | Type |
|---------|------|
| wix-ucp-tpa | Node.js web service |
| redis-cache | Session storage |

**Deploy**: Push to main → Auto deploy

---

# Layer 6: Testing

**Vitest for TypeScript testing.**

| Test File | Tests |
|-----------|-------|
| intent-detection.test.ts | 36 |
| ucp-endpoints.test.ts | 9 |
| **Total** | **45** |

```bash
npm test  # Run all tests
```

---

# 🔄 Purchase Flow

```
1. BROWSE    → GET /ucp/products
                 ↓
2. ADD       → POST /ucp/cart
                 ↓
3. CHECKOUT  → POST /ucp/checkout
                 ↓
4. PAY       → User pays on Wix
                 ↓
5. CONFIRM   → Click "I Paid" 🎉
```

---

# 📁 Key Files

```
src/
├── routes/
│   ├── ucp.routes.ts      ← UCP API
│   └── test-llm.routes.ts ← Chat UI
├── wix/
│   └── sdk-client.ts      ← Wix SDK
└── index.ts               ← Entry
```

---

# 🔗 Live URLs

| Resource | URL |
|----------|-----|
| LLM Chat | wix-ucp-tpa.onrender.com/test/llm |
| API | wix-ucp-tpa.onrender.com/ucp/products |
| Store | popstopdrink.com |

---

# 🎯 Key Decisions

| Decision | Why |
|----------|-----|
| Headless OAuth | No accounts needed |
| Wix SDK | Reliable API calls |
| UCP Protocol | Universal for LLMs |
| Manual Payment | Wix API limitation |

---

# 🚀 Future

1. **Webhooks** - Auto payment detection
2. **Multi-Store** - Multiple sites
3. **Order History** - Past purchases
4. **Inventory** - Stock alerts

---

# 📊 Stats

| Metric | Value |
|--------|-------|
| API Endpoints | 7 |
| Tests | 45 |
| Response Time | <500ms |

---

# 🙏 Thank You

```
   🤖 + 🛒 = 🎉
```

**PopStop UCP** - Making AI Commerce Real
