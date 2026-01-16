# Dashboard Testing UI Guide

**No more curl commands!** Test all Phase 2 APIs directly in your browser through the interactive dashboard.

---

## 🎯 Quick Start

### 1. Open the Dashboard

Visit your Wix dashboard and open the Store Agent app, or use the direct URL with your instance parameter:

```
https://wix-ucp-tpa.onrender.com/dashboard?instance=YOUR_INSTANCE_PARAM
```

### 2. Check OAuth Status

Look for the status card at the top:
- ✅ **OAuth Status: Connected** (green) = Ready to test
- ⚠️ **OAuth Status: Not Configured** (yellow) = Complete OAuth first

If not connected, click **"Complete OAuth Setup"** button.

### 3. Select a Tab

The dashboard has 4 tabs:
- **📊 Overview** - Instance info and status
- **📦 Products API** - Test product endpoints
- **📋 Orders API** - Test order endpoints
- **📊 Inventory API** - Test inventory endpoints

---

## 📦 Testing Products API

Click the **"Products API"** tab.

### Test 1: List Products

1. Set **Limit** (default: 5)
2. Optionally add a **Search** term
3. Click **"🔍 List Products"**

**Result:** Shows all products with names, prices, inventory status

### Test 2: Get Single Product

1. Enter a **Product ID** (get one from List Products result)
2. Click **"🔍 Get Product"**

**Result:** Shows detailed product info including variants, media, options

### Test 3: List Collections

1. Click **"🔍 List Collections"**

**Result:** Shows all product collections/categories

---

## 📋 Testing Orders API

Click the **"Orders API"** tab.

### Test 1: List Orders

1. Set **Limit** (default: 10)
2. Optionally filter by **Status** (All, Approved, Fulfilled, Canceled)
3. Click **"🔍 List Orders"**

**Result:** Shows orders with buyer info, line items, pricing

### Test 2: Get Single Order

1. Enter an **Order ID** (get one from List Orders result)
2. Click **"🔍 Get Order"**

**Result:** Shows complete order details

### Test 3: Search Orders

1. Enter **Email or Order Number**
2. Click **"🔍 Search Orders"**

**Result:** Shows matching orders

---

## 📊 Testing Inventory API

Click the **"Inventory API"** tab.

### Test 1: List Inventory

1. Set **Limit** (default: 10)
2. Optionally check **"In Stock Only"**
3. Click **"🔍 List Inventory"**

**Result:** Shows inventory items with SKU, quantities, tracking status

### Test 2: Low Stock Alert

1. Set **Threshold** (default: 10)
2. Click **"⚠️ Check Low Stock"**

**Result:** Shows products with quantities below threshold

### Test 3: Get Product Inventory

1. Enter a **Product ID**
2. Click **"🔍 Get Inventory"**

**Result:** Shows inventory for specific product

### Test 4: Export Inventory

1. Click **"📤 Export Inventory"**

**Result:** Shows all inventory in SKU/quantity format for external systems

---

## 📋 Understanding Results

### Success Response (Green Text)
```json
{
  "success": true,
  "data": {
    "products": [...],
    "totalCount": 10,
    "hasMore": false
  },
  "instanceId": "921c6868-..."
}
```

✅ **"success": true** means the API worked correctly

### Empty Results
```json
{
  "success": true,
  "data": {
    "products": [],
    "totalCount": 0,
    "hasMore": false
  }
}
```

✅ This is **normal** if you don't have products/orders in your Wix store yet

### Error Response (Red Text)
```json
{
  "success": false,
  "error": "Access token not available. Please complete OAuth flow."
}
```

❌ Complete the OAuth flow to fix this

---

## 🎯 Testing Tips

### 1. Start with List Endpoints
Always test "List" endpoints first to get IDs for testing "Get" endpoints.

**Example Flow:**
1. List Products → Get a `productId`
2. Use that ID to test "Get Single Product"
3. Use that ID to test "Get Product Inventory"

### 2. Test with Empty Store
It's **OK** to test with an empty store! You'll get:
```json
{
  "products": [],
  "orders": [],
  "items": []
}
```

This confirms the APIs are working, just no data yet.

### 3. Add Test Data in Wix

To see real results:
1. Go to your Wix site dashboard
2. Add products: **Products → Add Product**
3. Place a test order: Visit your live site and checkout
4. Return to dashboard and test again

### 4. Clear Results

Click the **"Clear"** button in the results section to hide results before testing another endpoint.

---

## 🐛 Troubleshooting

### Tabs Are Disabled

**Problem:** Products/Orders/Inventory tabs are grayed out

**Solution:** Complete the OAuth flow:
1. Click **"Complete OAuth Setup"** in the warning box
2. Authorize the app
3. Return to dashboard
4. Tabs should now be enabled

### "Access token not available" Error

**Problem:** API returns 401 error

**Solution:**
1. Check OAuth status card shows "Connected"
2. If not, complete OAuth flow
3. Refresh the dashboard

### No Results But No Error

**Problem:** APIs return empty arrays `[]`

**Solution:** This is normal! Your Wix store is empty. Add products/orders to see data.

### Invalid Product/Order ID Error

**Problem:** "Product not found" or "Order not found"

**Solution:**
1. Make sure you're using a valid ID
2. List products/orders first to get real IDs
3. Copy the ID exactly (including dashes and underscores)

---

## ✅ Success Checklist

You're successfully testing when:

- [x] Dashboard loads with OAuth status showing "Connected"
- [x] All tabs (Products, Orders, Inventory) are enabled
- [x] List Products returns `"success": true`
- [x] Results display in green text (success) or show empty arrays
- [x] No 401 (unauthorized) errors
- [x] You can test different endpoints by clicking buttons

---

## 🎉 What You Can Test

### Products API (5 tests)
✅ List all products with pagination  
✅ Search products by keyword  
✅ Get single product details  
✅ List collections  
✅ Get products in a collection

### Orders API (3 tests)
✅ List orders with filters  
✅ Get single order details  
✅ Search orders by email/number

### Inventory API (4 tests)
✅ List all inventory items  
✅ Get low stock alerts  
✅ Get product-specific inventory  
✅ Export inventory for external systems

**Total: 12 interactive API tests in your browser!** 🚀

---

## 💡 Pro Tips

1. **Keep the dashboard open** in one tab while managing your Wix store in another
2. **Test after making changes** in Wix to see updates in real-time
3. **Use the search feature** to quickly find specific products or orders
4. **Check low stock regularly** to prevent running out of inventory
5. **Export inventory** to sync with external systems

---

## 📸 Screenshot Guide

### Overview Tab
Shows instance info, OAuth status, and API availability

### Products Tab
Interactive forms to test all product endpoints

### Orders Tab
Forms to list, filter, and search orders

### Inventory Tab
Test inventory tracking and low stock alerts

### Results Section
Shows formatted JSON responses with color coding (green = success, red = error)

---

**Ready to test?** Open your dashboard and start clicking! 🎯

No more terminal commands needed. Everything you need is in the browser.
