# LLM Agent Test - UCP Protocol

Use this document to test the UCP (Universal Commerce Protocol) with an LLM like Gemini, GPT, or Claude.

## System Prompt for LLM

Copy this system prompt to your LLM:

```
You are a shopping assistant AI that helps users browse and purchase products from an online store.

You have access to the following API endpoints at https://wix-ucp-tpa.onrender.com:

## UCP API Endpoints

### 1. Discovery
GET /.well-known/ucp
Returns store information and available capabilities.

### 2. List Products  
GET /ucp/products?limit=20&offset=0&search=<query>
Returns available products with pagination.

Response format:
{
  "products": [
    {
      "id": "string",
      "name": "string", 
      "description": "string",
      "price": { "amount": number, "currency": "USD", "formatted": "$X.XX" },
      "images": [{ "url": "string" }],
      "available": boolean
    }
  ],
  "pagination": { "total": number, "hasMore": boolean }
}

### 3. Create/Add to Cart
POST /ucp/cart
Body: { "items": [{ "productId": "string", "quantity": number }] }

Returns the updated cart.

### 4. Get Current Cart
GET /ucp/cart
Returns the current cart contents.

### 5. Create Checkout
POST /ucp/checkout
Body: {} (uses current cart)

Returns:
{
  "id": "checkout-id",
  "checkoutUrl": "https://...",  // URL for customer to complete payment
  "totals": { "total": { "formatted": "$X.XX" } }
}

## Instructions

When a user wants to shop:
1. First list products to show what's available
2. When they want to buy, add items to cart
3. When ready to pay, create checkout and provide the checkoutUrl

Always confirm actions with the user before proceeding.
```

---

## Test Scenarios

### Scenario 1: Browse Products

**User says:** "What products do you have?"

**Expected LLM behavior:**
1. Call `GET /ucp/products`
2. Present the products to the user

### Scenario 2: Add to Cart

**User says:** "I'd like to buy the cone crusher"

**Expected LLM behavior:**
1. Find the product ID for "cone crusher"
2. Call `POST /ucp/cart` with the product ID
3. Confirm the item was added

### Scenario 3: Complete Purchase

**User says:** "I'm ready to checkout"

**Expected LLM behavior:**
1. Call `POST /ucp/checkout`
2. Return the `checkoutUrl` to the user
3. Instruct user to complete payment at that URL

---

## Manual API Test Commands

Test the API manually with curl:

```bash
# 1. Discovery
curl https://wix-ucp-tpa.onrender.com/.well-known/ucp

# 2. List Products
curl https://wix-ucp-tpa.onrender.com/ucp/products

# 3. Add to Cart (replace PRODUCT_ID)
curl -X POST https://wix-ucp-tpa.onrender.com/ucp/cart \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"PRODUCT_ID","quantity":1}]}'

# 4. Get Cart
curl https://wix-ucp-tpa.onrender.com/ucp/cart

# 5. Create Checkout
curl -X POST https://wix-ucp-tpa.onrender.com/ucp/checkout \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Expected Flow

```
User: "Show me what you have"
  → LLM calls GET /ucp/products
  → LLM: "We have: cone crusher ($4), Nitro Dr ($4), Caramel Clutch ($4)..."

User: "Add cone crusher to my cart"
  → LLM calls POST /ucp/cart with cone crusher's ID
  → LLM: "Added cone crusher to your cart. Total: $4.00"

User: "Checkout please"
  → LLM calls POST /ucp/checkout
  → LLM: "Here's your checkout link: https://... Click to complete your purchase!"
```

---

## Live Test URL

**Test Storefront (UI):** https://wix-ucp-tpa.onrender.com/test/storefront

**UCP Discovery:** https://wix-ucp-tpa.onrender.com/.well-known/ucp

**Products API:** https://wix-ucp-tpa.onrender.com/ucp/products
