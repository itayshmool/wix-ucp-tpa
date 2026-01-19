#!/bin/bash

# ============================================================================
# Check Payment Status - Run this after completing payment on Wix
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BASE_URL="https://wix-ucp-tpa.onrender.com"
INSTANCE_ID="${INSTANCE_ID:-}"

# Check for checkout ID
if [ -f ".last_checkout_id" ]; then
  CHECKOUT_ID=$(cat .last_checkout_id)
else
  echo -e "${RED}❌ No checkout ID found. Run TEST_BUYER_FLOW.sh first.${NC}"
  exit 1
fi

if [ -z "$INSTANCE_ID" ]; then
  echo -e "${RED}❌ Error: INSTANCE_ID not set${NC}"
  echo "Please set: export INSTANCE_ID='your-instance-id'"
  exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         CHECKING PAYMENT STATUS                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔍 Checkout ID: $CHECKOUT_ID${NC}"
echo ""

# Check status in a loop
MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo -e "${YELLOW}⏳ Attempt $ATTEMPT/$MAX_ATTEMPTS - Checking status...${NC}"
  
  STATUS_RESPONSE=$(curl -s "$BASE_URL/api/$INSTANCE_ID/checkout/$CHECKOUT_ID/status")
  
  if echo "$STATUS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status')
    PAYMENT_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.paymentStatus')
    IS_COMPLETED=$(echo "$STATUS_RESPONSE" | jq -r '.data.isCompleted')
    IS_PAID=$(echo "$STATUS_RESPONSE" | jq -r '.data.isPaid')
    
    echo ""
    echo -e "${BLUE}Current Status:${NC}"
    echo -e "  Checkout Status: $STATUS"
    echo -e "  Payment Status: $PAYMENT_STATUS"
    echo -e "  Is Completed: $IS_COMPLETED"
    echo -e "  Is Paid: $IS_PAID"
    echo ""
    
    if [ "$IS_PAID" = "true" ] && [ "$IS_COMPLETED" = "true" ]; then
      echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
      echo -e "${GREEN}║         🎉 PAYMENT COMPLETED SUCCESSFULLY! 🎉                 ║${NC}"
      echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
      echo ""
      
      echo -e "${GREEN}✅ Payment Status: PAID${NC}"
      echo -e "${GREEN}✅ Checkout Status: COMPLETED${NC}"
      echo ""
      
      echo -e "${YELLOW}📦 Checking for created order...${NC}"
      ORDERS_RESPONSE=$(curl -s "$BASE_URL/api/$INSTANCE_ID/orders?limit=1")
      
      if echo "$ORDERS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        ORDER_ID=$(echo "$ORDERS_RESPONSE" | jq -r '.data.orders[0].id')
        ORDER_NUMBER=$(echo "$ORDERS_RESPONSE" | jq -r '.data.orders[0].number')
        ORDER_TOTAL=$(echo "$ORDERS_RESPONSE" | jq -r '.data.orders[0].priceSummary.total.formattedAmount')
        
        echo -e "${GREEN}✅ Order Created!${NC}"
        echo -e "${GREEN}   Order ID: $ORDER_ID${NC}"
        echo -e "${GREEN}   Order #: $ORDER_NUMBER${NC}"
        echo -e "${GREEN}   Total: $ORDER_TOTAL${NC}"
        echo ""
      fi
      
      echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
      echo -e "${BLUE}BUYER FLOW TEST: SUCCESS ✅${NC}"
      echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
      echo ""
      
      echo "What happened:"
      echo "  1. ✅ Products browsed"
      echo "  2. ✅ Checkout created"
      echo "  3. ✅ Payment completed on Wix"
      echo "  4. ✅ Order created"
      echo "  5. ✅ Webhook received (check logs)"
      echo ""
      
      echo -e "${YELLOW}💭 LLM to Buyer: \"Your order #$ORDER_NUMBER is confirmed! Total: $ORDER_TOTAL\"${NC}"
      echo ""
      
      exit 0
    elif [ "$STATUS" = "ABANDONED" ]; then
      echo -e "${RED}❌ Checkout was abandoned${NC}"
      exit 1
    else
      echo -e "${YELLOW}⏳ Payment still pending...${NC}"
      echo ""
      
      if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo -e "${YELLOW}Waiting 5 seconds before next check...${NC}"
        sleep 5
      fi
    fi
  else
    echo -e "${RED}❌ Failed to check status${NC}"
    echo "$STATUS_RESPONSE" | jq
    exit 1
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo -e "${YELLOW}⏰ Status check timed out after $MAX_ATTEMPTS attempts${NC}"
echo -e "${YELLOW}The payment might still be processing.${NC}"
echo ""
echo "To check manually:"
echo "  curl -s \"$BASE_URL/api/$INSTANCE_ID/checkout/$CHECKOUT_ID/status\" | jq"
echo ""
