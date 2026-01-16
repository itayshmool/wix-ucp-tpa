#!/bin/bash

# ============================================================================
# Wix UCP TPA - Complete Buyer Flow Test
# ============================================================================
# This script simulates the complete buyer journey:
# 1. Browse products (what LLM shows buyer)
# 2. Create quick checkout (LLM generates payment link)
# 3. Buyer completes payment on Wix
# 4. Order confirmed via webhook
# ============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="https://wix-ucp-tpa.onrender.com"
INSTANCE_ID="${INSTANCE_ID:-}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         WIX UCP TPA - BUYER FLOW TEST                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if instance ID is set
if [ -z "$INSTANCE_ID" ]; then
  echo -e "${RED}❌ Error: INSTANCE_ID not set${NC}"
  echo ""
  echo "Please set your instance ID:"
  echo "  export INSTANCE_ID='your-instance-id-here'"
  echo ""
  echo "To get your instance ID:"
  echo "  1. Go to: https://wix-ucp-tpa.onrender.com/dashboard"
  echo "  2. Look for 'Instance ID' in the dashboard"
  echo "  3. Or extract from URL parameter"
  exit 1
fi

echo -e "${GREEN}✅ Instance ID: $INSTANCE_ID${NC}"
echo ""

# ============================================================================
# STEP 1: Browse Products (What LLM Shows Buyer)
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 1: Browse Products (LLM discovers what's available)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}🔍 Fetching available products...${NC}"
PRODUCTS_RESPONSE=$(curl -s "$BASE_URL/api/$INSTANCE_ID/products?limit=5")

if echo "$PRODUCTS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Products fetched successfully${NC}"
  echo ""
  
  # Display products
  echo -e "${BLUE}Available Products:${NC}"
  echo "$PRODUCTS_RESPONSE" | jq -r '.data.products[] | "  - \(.name) (\(.id)) - \(.price.formatted)"'
  echo ""
  
  # Get first product for testing
  PRODUCT_ID=$(echo "$PRODUCTS_RESPONSE" | jq -r '.data.products[0].id')
  PRODUCT_NAME=$(echo "$PRODUCTS_RESPONSE" | jq -r '.data.products[0].name')
  PRODUCT_PRICE=$(echo "$PRODUCTS_RESPONSE" | jq -r '.data.products[0].price.formatted')
  
  echo -e "${GREEN}✅ Selected Product: $PRODUCT_NAME${NC}"
  echo -e "${GREEN}   ID: $PRODUCT_ID${NC}"
  echo -e "${GREEN}   Price: $PRODUCT_PRICE${NC}"
  echo ""
else
  echo -e "${RED}❌ Failed to fetch products${NC}"
  echo "$PRODUCTS_RESPONSE" | jq
  exit 1
fi

echo -e "${YELLOW}💭 LLM to Buyer: \"I found this product: $PRODUCT_NAME for $PRODUCT_PRICE\"${NC}"
echo -e "${YELLOW}🗣️  Buyer to LLM: \"I'll take it!\"${NC}"
echo ""

# ============================================================================
# STEP 2: Create Quick Checkout (LLM Generates Payment Link)
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 2: Create Quick Checkout (LLM generates payment link)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}🛒 Creating quick checkout...${NC}"

# Generate unique email for this test
TEST_EMAIL="test-$(date +%s)@example.com"

CHECKOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/$INSTANCE_ID/checkout/quick" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "catalogReference": {
          "catalogItemId": "'"$PRODUCT_ID"'",
          "appId": "215238eb-22a5-4c36-9e7b-e7c08025e04e"
        },
        "quantity": 1
      }
    ],
    "buyerInfo": {
      "email": "'"$TEST_EMAIL"'",
      "firstName": "Test",
      "lastName": "Buyer"
    },
    "shippingAddress": {
      "addressLine1": "123 Main St",
      "city": "San Francisco",
      "subdivision": "CA",
      "country": "US",
      "postalCode": "94102"
    },
    "currency": "USD"
  }')

if echo "$CHECKOUT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Quick checkout created successfully${NC}"
  echo ""
  
  CART_ID=$(echo "$CHECKOUT_RESPONSE" | jq -r '.data.cartId')
  CHECKOUT_ID=$(echo "$CHECKOUT_RESPONSE" | jq -r '.data.checkoutId')
  CHECKOUT_URL=$(echo "$CHECKOUT_RESPONSE" | jq -r '.data.checkoutUrl')
  TOTAL=$(echo "$CHECKOUT_RESPONSE" | jq -r '.data.priceSummary.total.formattedAmount')
  
  echo -e "${GREEN}✅ Cart ID: $CART_ID${NC}"
  echo -e "${GREEN}✅ Checkout ID: $CHECKOUT_ID${NC}"
  echo -e "${GREEN}✅ Total: $TOTAL${NC}"
  echo ""
else
  echo -e "${RED}❌ Failed to create checkout${NC}"
  echo "$CHECKOUT_RESPONSE" | jq
  exit 1
fi

echo -e "${YELLOW}💭 LLM to Buyer: \"Your total is $TOTAL. Click here to pay: $CHECKOUT_URL\"${NC}"
echo ""

# ============================================================================
# STEP 3: Display Checkout URL (Buyer Clicks This)
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 3: Buyer Completes Payment on Wix${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}🔗 CHECKOUT URL:${NC}"
echo -e "${GREEN}$CHECKOUT_URL${NC}"
echo ""

echo -e "${YELLOW}📝 NEXT STEPS (MANUAL):${NC}"
echo ""
echo "  1. Copy the URL above"
echo "  2. Open it in your browser"
echo "  3. You'll see the Wix checkout page with:"
echo "     - Product: $PRODUCT_NAME"
echo "     - Total: $TOTAL"
echo "     - Pre-filled buyer info"
echo "  4. Complete the test payment:"
echo "     - If in test mode: Use Wix test card"
echo "     - If in production: Use real payment"
echo "  5. After payment, Wix will:"
echo "     - Create the order"
echo "     - Send webhook to our app"
echo "     - Redirect you to success page"
echo ""

# ============================================================================
# STEP 4: Poll Checkout Status (While Waiting for Payment)
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 4: Poll Checkout Status (Waiting for payment...)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}⏳ Checking initial status...${NC}"
STATUS_RESPONSE=$(curl -s "$BASE_URL/api/$INSTANCE_ID/checkout/$CHECKOUT_ID/status")

if echo "$STATUS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status')
  PAYMENT_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.paymentStatus')
  IS_COMPLETED=$(echo "$STATUS_RESPONSE" | jq -r '.data.isCompleted')
  IS_PAID=$(echo "$STATUS_RESPONSE" | jq -r '.data.isPaid')
  
  echo -e "${GREEN}✅ Checkout Status: $STATUS${NC}"
  echo -e "${GREEN}✅ Payment Status: $PAYMENT_STATUS${NC}"
  echo -e "${GREEN}✅ Is Completed: $IS_COMPLETED${NC}"
  echo -e "${GREEN}✅ Is Paid: $IS_PAID${NC}"
  echo ""
  
  if [ "$IS_PAID" = "true" ]; then
    echo -e "${GREEN}🎉 Payment completed!${NC}"
  else
    echo -e "${YELLOW}⏳ Payment pending - complete the checkout in your browser${NC}"
  fi
else
  echo -e "${RED}❌ Failed to check status${NC}"
  echo "$STATUS_RESPONSE" | jq
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}✅ Step 1: Products browsed${NC}"
echo -e "${GREEN}✅ Step 2: Checkout created${NC}"
echo -e "${YELLOW}⏳ Step 3: Awaiting payment (manual)${NC}"
echo -e "${YELLOW}⏳ Step 4: Awaiting order webhook${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}WHAT HAPPENS NEXT (AFTER YOU COMPLETE PAYMENT)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo "1. You complete payment on Wix"
echo "2. Wix creates the order"
echo "3. Wix sends webhook: wix.ecom.v1.order_created"
echo "4. Our app receives the webhook (check server logs)"
echo "5. Wix redirects you to success page"
echo "6. LLM can confirm: \"Your order is confirmed!\""
echo ""

echo -e "${YELLOW}📊 To monitor the webhook:${NC}"
echo ""
echo "  Option 1: Check Render logs"
echo "    https://dashboard.render.com"
echo ""
echo "  Option 2: Poll checkout status (run this after payment):"
echo "    curl -s \"$BASE_URL/api/$INSTANCE_ID/checkout/$CHECKOUT_ID/status\" | jq"
echo ""
echo "  Option 3: Check orders API (after webhook received):"
echo "    curl -s \"$BASE_URL/api/$INSTANCE_ID/orders?limit=1\" | jq"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}BUYER FLOW TEST READY!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}🔗 Open this URL to complete the test:${NC}"
echo -e "${GREEN}$CHECKOUT_URL${NC}"
echo ""

# Save checkout info for later verification
echo "$CHECKOUT_ID" > .last_checkout_id
echo -e "${YELLOW}💾 Checkout ID saved to .last_checkout_id for later verification${NC}"
echo ""
