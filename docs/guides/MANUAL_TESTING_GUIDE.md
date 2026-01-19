# Manual Testing Guide - Phase 2

This guide walks you through manually testing all Phase 2 features.

---

## 🔧 Prerequisites

### 1. Get Your Instance ID

You already have this from Phase 1.3. It's the `instanceId` from the dashboard:

**From Wix Dashboard URL:**
```
https://wix-ucp-tpa.onrender.com/dashboard?instance=XXXXXX.YYYYYY
```

The decoded payload contains:
```json
{
  "instanceId": "921c6868-d476-43b5-9604-01a473a0ff7a",
  ...
}
```

**Save this for testing:**
```bash
export INSTANCE_ID="921c6868-d476-43b5-9604-01a473a0ff7a"
```

### 2. Complete OAuth Flow (REQUIRED for Phase 2)

Phase 2 APIs require OAuth tokens. Here's how to get them:

**Step 1: Initiate OAuth**
```bash
# Open in browser:
open https://wix-ucp-tpa.onrender.com/auth/install
```

**Step 2: Authorize the app**
- Click "Authorize" on the Wix OAuth page
- You'll be redirected back to the callback URL
- The app will store your tokens

**Step 3: Verify OAuth Status**

Visit your dashboard:
```bash
open "https://wix-ucp-tpa.onrender.com/dashboard?instance=YOUR_INSTANCE_PARAM"
```

Look for:
- ✅ **OAuth Status: Connected** (green)
- "Test Connection" button should be enabled

---

## 🧪 Testing Phase 2.1: Products API

### Test 1: List Products

```bash
curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/products?limit=5" \
  -H "Content-Type: application/json" | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod_xxx",
        "name": "Product Name",
        "price": {
          "amount": 29.99,
          "currency": "USD",
          "formatted": "$29.99"
        },
        "inventory": {
          "trackInventory": true,
          "inStock": true,
          "quantity": 100
        }
      }
    ],
    "totalCount": 10,
    "hasMore": true
  },
  "instanceId": "921c6868-..."
}
```

### Test 2: Search Products

```bash
curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/products?search=shirt&limit=10" \
  -H "Content-Type: application/json" | jq .
```

### Test 3: Get Single Product

**First, get a product ID from the list above, then:**

```bash
PRODUCT_ID="your_product_id_here"

curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/products/${PRODUCT_ID}" \
  -H "Content-Type: application/json" | jq .
```

### Test 4: List Collections

```bash
curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/collections" \
  -H "Content-Type: application/json" | jq .
```

### Test 5: Get Products in Collection

**Get a collection ID from above, then:**

```bash
COLLECTION_ID="your_collection_id_here"

curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/collections/${COLLECTION_ID}/products" \
  -H "Content-Type: application/json" | jq .
```

---

## 🧪 Testing Phase 2.2: Orders API

### Test 1: List Orders

```bash
curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/orders?limit=10" \
  -H "Content-Type: application/json" | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_xxx",
        "number": "1001",
        "status": "APPROVED",
        "paymentStatus": "PAID",
        "buyer": {
          "email": "customer@example.com",
          "firstName": "John"
        },
        "pricing": {
          "total": {
            "amount": 75.99,
            "currency": "USD"
          }
        }
      }
    ],
    "totalCount": 5,
    "hasMore": false
  }
}
```

### Test 2: Filter Orders by Status

```bash
# Get only approved orders
curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/orders?status=APPROVED,FULFILLED" \
  -H "Content-Type: application/json" | jq .
```

### Test 3: Search Orders by Email

```bash
curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/orders?search=customer@example.com" \
  -H "Content-Type: application/json" | jq .
```

### Test 4: Get Single Order

**Get an order ID from the list, then:**

```bash
ORDER_ID="your_order_id_here"

curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/orders/${ORDER_ID}" \
  -H "Content-Type: application/json" | jq .
```

### Test 5: Create Fulfillment

**⚠️ This will actually fulfill an order! Use with caution.**

```bash
ORDER_ID="your_order_id_here"
LINE_ITEM_ID="line_item_id_from_order"

curl -X POST "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/orders/${ORDER_ID}/fulfill" \
  -H "Content-Type: application/json" \
  -d '{
    "lineItems": [
      {
        "lineItemId": "'${LINE_ITEM_ID}'",
        "quantity": 1
      }
    ],
    "trackingInfo": {
      "trackingNumber": "1Z999AA10123456784",
      "carrier": "UPS",
      "trackingUrl": "https://www.ups.com/track?tracknum=1Z999AA10123456784"
    }
  }' | jq .
```

### Test 6: Cancel Order

**⚠️ This will actually cancel an order! Use with caution.**

```bash
ORDER_ID="your_order_id_here"

curl -X POST "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/orders/${ORDER_ID}/cancel" \
  -H "Content-Type: application/json" | jq .
```

---

## 🧪 Testing Phase 2.3: Inventory API

### Test 1: List All Inventory

```bash
curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/inventory?limit=10" \
  -H "Content-Type: application/json" | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "inv_xxx",
        "productId": "prod_xxx",
        "sku": "SKU-123",
        "trackInventory": true,
        "inStock": true,
        "quantity": 50
      }
    ],
    "totalCount": 25,
    "hasMore": true
  }
}
```

### Test 2: Get Product Inventory

```bash
PRODUCT_ID="your_product_id_here"

curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/inventory/products/${PRODUCT_ID}" \
  -H "Content-Type: application/json" | jq .
```

### Test 3: Get Low Stock Items

```bash
# Get items with less than 10 units
curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/inventory/low-stock?threshold=10" \
  -H "Content-Type: application/json" | jq .
```

### Test 4: Update Inventory (Set Absolute Quantity)

**⚠️ This will change inventory! Use with caution.**

```bash
PRODUCT_ID="your_product_id_here"

curl -X PATCH "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/inventory" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'${PRODUCT_ID}'",
    "setQuantity": 100
  }' | jq .
```

### Test 5: Increment/Decrement Inventory

```bash
# Add 10 units
curl -X PATCH "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/inventory" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'${PRODUCT_ID}'",
    "incrementBy": 10
  }' | jq .

# Remove 5 units
curl -X PATCH "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/inventory" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'${PRODUCT_ID}'",
    "incrementBy": -5
  }' | jq .
```

### Test 6: Bulk Update Inventory

```bash
PRODUCT_ID_1="product_1"
PRODUCT_ID_2="product_2"

curl -X POST "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/inventory/bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "'${PRODUCT_ID_1}'",
        "setQuantity": 50
      },
      {
        "productId": "'${PRODUCT_ID_2}'",
        "incrementBy": -3
      }
    ]
  }' | jq .
```

### Test 7: Export Inventory

```bash
curl -X GET "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/inventory/export" \
  -H "Content-Type: application/json" | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "sku": "SKU-123",
      "quantity": 50
    },
    {
      "sku": "SKU-456",
      "quantity": 100
    }
  ],
  "itemCount": 2
}
```

### Test 8: Sync from External System

```bash
curl -X POST "https://wix-ucp-tpa.onrender.com/api/${INSTANCE_ID}/inventory/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "sku": "SKU-123",
        "quantity": 75
      },
      {
        "sku": "SKU-456",
        "quantity": 120
      }
    ]
  }' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "updated": 2,
    "failed": 0,
    "notFound": 0
  },
  "message": "Sync completed: 2 updated, 0 failed, 0 not found"
}
```

---

## 🎯 Testing Webhooks

Webhooks are automatically processed when events occur in Wix. To test:

### 1. Check Webhook Logs

```bash
# Check Render logs for webhook processing
# Go to: https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg
# Click "Logs" tab
# Filter for "webhook"
```

### 2. Trigger Webhook Events

**Product Webhooks:**
1. Go to your Wix site
2. Edit a product (change name, price, etc.)
3. Check logs for `Product updated webhook received`

**Order Webhooks:**
1. Place an order on your Wix site
2. Check logs for `Order created webhook received`
3. Mark order as paid → Check for `Order paid webhook received`

**Inventory Webhooks:**
1. Update inventory in Wix
2. Check logs for `Inventory quantity updated webhook received`

---

## 🐛 Troubleshooting

### Error: "Access token not available"

**Problem:** OAuth not completed  
**Solution:**
1. Visit `/auth/install` to start OAuth flow
2. Authorize the app in Wix
3. Check dashboard shows "OAuth Status: Connected"

### Error: "Instance not found"

**Problem:** Invalid instance ID  
**Solution:**
1. Get correct instance ID from dashboard URL
2. Ensure using the full UUID format

### Error: 404 Not Found

**Problem:** Deployment not complete or wrong URL  
**Solution:**
1. Check deployment status: `curl https://wix-ucp-tpa.onrender.com/ | jq .version`
2. Should show version `0.2.3`
3. Wait for deployment to complete (2-3 minutes)

### Empty Results

**Problem:** No products/orders/inventory in Wix store  
**Solution:**
1. Add test products in Wix dashboard
2. Place test orders
3. Ensure products have inventory tracking enabled

---

## 📋 Quick Test Script

Save this as `test-phase2.sh`:

```bash
#!/bin/bash

# Set your instance ID
INSTANCE_ID="921c6868-d476-43b5-9604-01a473a0ff7a"
BASE_URL="https://wix-ucp-tpa.onrender.com"

echo "🧪 Testing Phase 2 APIs..."
echo ""

# Test Products
echo "📦 Testing Products API..."
curl -s "${BASE_URL}/api/${INSTANCE_ID}/products?limit=3" | jq '.success, .data.products | length'
echo ""

# Test Orders
echo "📋 Testing Orders API..."
curl -s "${BASE_URL}/api/${INSTANCE_ID}/orders?limit=3" | jq '.success, .data.orders | length'
echo ""

# Test Inventory
echo "📊 Testing Inventory API..."
curl -s "${BASE_URL}/api/${INSTANCE_ID}/inventory?limit=3" | jq '.success, .data.items | length'
echo ""

# Test Low Stock
echo "⚠️ Testing Low Stock..."
curl -s "${BASE_URL}/api/${INSTANCE_ID}/inventory/low-stock?threshold=10" | jq '.success, .data | length'
echo ""

echo "✅ Testing complete!"
```

**Run it:**
```bash
chmod +x test-phase2.sh
./test-phase2.sh
```

---

## ✅ Testing Checklist

- [ ] OAuth flow completed successfully
- [ ] Dashboard shows "OAuth Status: Connected"
- [ ] Products API returns product list
- [ ] Collections API returns collections
- [ ] Orders API returns order list
- [ ] Order filtering works (by status, search)
- [ ] Inventory API returns inventory items
- [ ] Low stock detection works
- [ ] Inventory export works
- [ ] All endpoints return `success: true`
- [ ] Webhook logs show events being processed

---

## 🎉 Success Criteria

You've successfully tested Phase 2 when:

1. ✅ All API endpoints return `200` status
2. ✅ Products, orders, and inventory data loads correctly
3. ✅ OAuth is working (dashboard shows "Connected")
4. ✅ Webhooks appear in logs when events occur in Wix
5. ✅ No 401 (unauthorized) or 404 (not found) errors

---

**Need Help?**

Check the logs in Render dashboard for detailed error messages:
- https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg/logs
