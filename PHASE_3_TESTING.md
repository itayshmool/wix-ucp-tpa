# Phase 3 Testing Guide

**Testing Cart & Checkout Endpoints for LLM Agent Integration**

---

## 🎯 What We're Testing

Phase 3 enables LLM agents to complete purchases by:
1. Creating carts with products
2. Generating Wix hosted checkout URLs
3. Redirecting buyers to complete payment

This guide shows how to test these endpoints.

---

## 🔑 Prerequisites

### 1. Get Your Instance ID

Your instance ID is from the Wix dashboard URL or instance parameter:

```bash
# From dashboard URL:
# https://wix-ucp-tpa.onrender.com/dashboard?instance=ABC123.payload...
# Extract the payload after decoding (see Phase 1.3 docs)

# OR use the instance ID you've been using for Phase 2 testing
INSTANCE_ID="your-instance-id-here"
```

### 2. Get a Product ID

```bash
BASE_URL="https://wix-ucp-tpa.onrender.com"

# List products to get a product ID
curl -X GET "$BASE_URL/api/$INSTANCE_ID/products?limit=5" | jq '.data.products[0]'

# Save the product ID for testing
PRODUCT_ID="the-product-id-from-response"
```

---

## 🛒 Test 1: Cart Management

### Create Empty Cart

```bash
curl -X POST "$BASE_URL/api/$INSTANCE_ID/cart" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USD"
  }' | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "cart_abc123",
    "lineItems": [],
    "currency": "USD",
    "subtotal": { "amount": "0", "currency": "USD" }
  }
}
```

### Create Cart with Items

```bash
curl -X POST "$BASE_URL/api/$INSTANCE_ID/cart" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "catalogReference": {
          "catalogItemId": "'$PRODUCT_ID'",
          "appId": "215238eb-22a5-4c36-9e7b-e7c08025e04e"
        },
        "quantity": 2
      }
    ],
    "currency": "USD"
  }' | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "cart_xyz789",
    "lineItems": [
      {
        "id": "line_item_1",
        "productName": "Product Name",
        "quantity": 2,
        "price": { "amount": "29.99", "currency": "USD" }
      }
    ],
    "subtotal": { "amount": "59.98", "currency": "USD" }
  }
}
```

### Get Cart

```bash
CART_ID="cart_id_from_previous_response"

curl -X GET "$BASE_URL/api/$INSTANCE_ID/cart/$CART_ID" | jq
```

### Add Items to Existing Cart

```bash
curl -X POST "$BASE_URL/api/$INSTANCE_ID/cart/$CART_ID/items" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "catalogReference": {
          "catalogItemId": "'$PRODUCT_ID'",
          "appId": "215238eb-22a5-4c36-9e7b-e7c08025e04e"
        },
        "quantity": 1
      }
    ]
  }' | jq
```

### Update Item Quantity

```bash
LINE_ITEM_ID="line_item_id_from_cart"

curl -X PATCH "$BASE_URL/api/$INSTANCE_ID/cart/$CART_ID/items/$LINE_ITEM_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3
  }' | jq
```

### Remove Item from Cart

```bash
curl -X DELETE "$BASE_URL/api/$INSTANCE_ID/cart/$CART_ID/items/$LINE_ITEM_ID" | jq
```

### Delete Cart

```bash
curl -X DELETE "$BASE_URL/api/$INSTANCE_ID/cart/$CART_ID" | jq
```

---

## 💳 Test 2: Checkout Flow

### Method A: Create Checkout from Cart

**Step 1: Create cart with items (see above)**

**Step 2: Create checkout from cart**
```bash
CART_ID="your_cart_id"

curl -X POST "$BASE_URL/api/$INSTANCE_ID/checkout/from-cart" \
  -H "Content-Type: application/json" \
  -d '{
    "cartId": "'$CART_ID'",
    "buyerInfo": {
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "Buyer"
    }
  }' | jq
```

**Step 3: Generate checkout URL**
```bash
CHECKOUT_ID="checkout_id_from_response"

curl -X POST "$BASE_URL/api/$INSTANCE_ID/checkout/$CHECKOUT_ID/url" \
  -H "Content-Type: application/json" \
  -d '{
    "successUrl": "https://yourapp.com/success",
    "cancelUrl": "https://yourapp.com/cancel"
  }' | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "checkoutId": "checkout_abc123",
    "checkoutUrl": "https://www.wix.com/_api/checkout/v2/checkout_abc123"
  }
}
```

**Step 4: Open checkout URL in browser**
- Copy the `checkoutUrl` from the response
- Open it in a browser
- You'll see the Wix checkout page
- Complete the test purchase (use Wix test payment if available)

---

## 🚀 Test 3: Quick Checkout (ONE-CALL - Recommended for LLM Agents)

This is THE endpoint LLM agents should use - it does everything in one call:

```bash
curl -X POST "$BASE_URL/api/$INSTANCE_ID/checkout/quick" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "catalogReference": {
          "catalogItemId": "'$PRODUCT_ID'",
          "appId": "215238eb-22a5-4c36-9e7b-e7c08025e04e"
        },
        "quantity": 1
      }
    ],
    "buyerInfo": {
      "email": "buyer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890"
    },
    "shippingAddress": {
      "addressLine1": "123 Main St",
      "city": "San Francisco",
      "subdivision": "CA",
      "country": "US",
      "postalCode": "94102"
    },
    "successUrl": "https://yourapp.com/success?orderId={orderId}",
    "cancelUrl": "https://yourapp.com/cancel",
    "currency": "USD"
  }' | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "cartId": "cart_xyz789",
    "checkoutId": "checkout_abc123",
    "checkoutUrl": "https://www.wix.com/_api/checkout/v2/checkout_abc123",
    "priceSummary": {
      "subtotal": { "amount": "29.99", "currency": "USD" },
      "total": { "amount": "32.99", "currency": "USD" }
    }
  },
  "message": "Quick checkout created successfully. Redirect buyer to checkoutUrl."
}
```

**What Happens Next:**
1. LLM agent receives the `checkoutUrl`
2. LLM tells buyer: "Click here to complete your purchase: [link]"
3. Buyer clicks link → Redirected to Wix
4. Buyer enters payment info and completes purchase
5. Wix processes payment
6. Wix sends order webhook to your app (Phase 2)
7. Wix redirects buyer to `successUrl`
8. LLM can poll checkout status to confirm

---

## 📊 Test 4: Checkout Status Polling

After generating a checkout URL, you can poll the status:

```bash
CHECKOUT_ID="your_checkout_id"

curl -X GET "$BASE_URL/api/$INSTANCE_ID/checkout/$CHECKOUT_ID/status" | jq
```

**Response while pending:**
```json
{
  "success": true,
  "data": {
    "checkoutId": "checkout_abc123",
    "status": "CREATED",
    "paymentStatus": "PENDING",
    "isCompleted": false,
    "isPaid": false
  }
}
```

**Response after payment:**
```json
{
  "success": true,
  "data": {
    "checkoutId": "checkout_abc123",
    "status": "COMPLETED",
    "paymentStatus": "PAID",
    "isCompleted": true,
    "isPaid": true
  }
}
```

---

## 🧪 Complete Test Script

Save this as `test-phase3.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="https://wix-ucp-tpa.onrender.com"
INSTANCE_ID="your-instance-id"

echo "🔍 Step 1: Getting product ID..."
PRODUCT_ID=$(curl -s "$BASE_URL/api/$INSTANCE_ID/products?limit=1" | jq -r '.data.products[0].id')
echo "✅ Product ID: $PRODUCT_ID"
echo ""

echo "🚀 Step 2: Creating quick checkout..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/$INSTANCE_ID/checkout/quick" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "catalogReference": {
          "catalogItemId": "'$PRODUCT_ID'",
          "appId": "215238eb-22a5-4c36-9e7b-e7c08025e04e"
        },
        "quantity": 1
      }
    ],
    "buyerInfo": {
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "Buyer"
    },
    "currency": "USD"
  }')

echo "$RESPONSE" | jq
echo ""

CHECKOUT_ID=$(echo "$RESPONSE" | jq -r '.data.checkoutId')
CHECKOUT_URL=$(echo "$RESPONSE" | jq -r '.data.checkoutUrl')

echo "✅ Checkout ID: $CHECKOUT_ID"
echo "✅ Checkout URL: $CHECKOUT_URL"
echo ""

echo "🌐 Step 3: Open this URL in your browser to complete the purchase:"
echo "$CHECKOUT_URL"
echo ""

echo "📊 Step 4: Checking status..."
curl -s "$BASE_URL/api/$INSTANCE_ID/checkout/$CHECKOUT_ID/status" | jq
echo ""

echo "✅ Test complete!"
echo ""
echo "Next steps:"
echo "1. Open the checkout URL in a browser"
echo "2. Complete the test purchase"
echo "3. Check the status endpoint again to see COMPLETED"
echo "4. Check webhook logs for order_created event"
```

Make it executable:
```bash
chmod +x test-phase3.sh
```

Run it:
```bash
./test-phase3.sh
```

---

## ✅ Success Criteria

### Phase 3.1 (Cart)
- ✅ Can create empty cart
- ✅ Can create cart with items
- ✅ Can add items to cart
- ✅ Can update item quantities
- ✅ Can remove items from cart
- ✅ Can apply coupon codes
- ✅ Cart calculates totals correctly

### Phase 3.2 (Checkout)
- ✅ Can create checkout from cart
- ✅ Can generate checkout URL
- ✅ Checkout URL opens Wix hosted checkout page
- ✅ Can pre-fill buyer info
- ✅ Can pre-fill shipping address
- ✅ Quick checkout works in one call
- ✅ Can poll checkout status
- ✅ Payment completes on Wix
- ✅ Order webhook is received (Phase 2)

---

## 🐛 Troubleshooting

### Error: "Access token not available"

**Cause**: OAuth not completed for this instance

**Solution**: Either:
1. Complete OAuth flow (if available for your app type)
2. Use API Key authentication (see wix-ucp repo)
3. For testing: Use instance ID from authenticated session

### Error: "Product not found"

**Cause**: Invalid product ID or product doesn't exist

**Solution**: 
1. List products first to get valid product IDs
2. Ensure product is active and in stock

### Checkout URL doesn't open

**Cause**: Checkout expired or already used

**Solution**: Generate a new checkout URL (they're one-time use)

### Payment fails on Wix

**Cause**: Test mode or invalid payment info

**Solution**: Use Wix test payment credentials if in development mode

---

## 📝 Notes for LLM Integration

### Best Practices

1. **Use Quick Checkout**: Single API call, simplest flow
2. **Pre-fill buyer info**: Better UX, fewer errors
3. **Provide success/cancel URLs**: Handle both outcomes
4. **Poll status**: Confirm payment completion
5. **Handle webhooks**: Listen for order_created event

### LLM Agent Flow

```
User: "I want to buy that blue shirt"
  ↓
LLM: Identifies product, calls /checkout/quick
  ↓
LLM: "Here's your checkout link: [URL]"
  ↓
User: Clicks link, completes payment
  ↓
Wix: Sends webhook to app
  ↓
LLM: "Your order #12345 is confirmed!"
```

### Error Handling

- 400: Invalid request (check item structure)
- 401: Not authenticated (OAuth issue)
- 404: Product/cart/checkout not found
- 500: Server error (check logs)

---

## 🎉 Next Steps

After testing Phase 3:
1. ✅ Cart management works
2. ✅ Checkout URL generation works
3. ✅ Payment completes on Wix
4. ✅ Webhooks are received

**Now ready for Phase 4-6**: Wrap everything in UCP protocol for LLM agents!

---

**Last Updated**: 2026-01-16  
**Phase**: 3.1-3.2 Complete  
**Status**: Production Ready ✅
