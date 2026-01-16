#!/bin/bash

# Wix UCP TPA - Cursor Rules Setup Script
# Run this script to create all cursor rules files

echo "Creating Cursor Rules directory structure..."

mkdir -p .cursor/rules

#######################################
# Phase 1.1 - Project Setup
#######################################
cat > .cursor/rules/phase-1.1-project-setup.md << 'EOF'
# Phase 1.1: Project Setup & Configuration

## Context
Building a Wix Third-Party Application (TPA) that will connect to Wix merchant stores. This is a self-hosted Node.js application using Express and TypeScript.

## Goal
Set up the foundational project structure, configuration, and environment handling.

## Tech Stack
- Runtime: Node.js 20+
- Language: TypeScript 5+
- Framework: Express.js
- HTTP Client: axios
- Environment: dotenv
- Validation: zod

## Tasks

### 1. Initialize Project
Create a new Node.js project with TypeScript support:
- Initialize npm project
- Install dependencies: express, axios, dotenv, zod, uuid
- Install dev dependencies: typescript, ts-node, nodemon, @types/express, @types/node
- Configure tsconfig.json for ES2022, strict mode, ESM modules

### 2. Project Structure
Create the following directory structure:
```
src/
├── config/
│   └── env.ts
├── wix/
│   ├── auth.ts
│   ├── client.ts
│   ├── webhooks.ts
│   └── types.ts
├── middleware/
│   ├── error-handler.ts
│   └── validate-webhook.ts
├── routes/
│   ├── auth.routes.ts
│   ├── webhook.routes.ts
│   └── dashboard.routes.ts
├── store/
│   └── instances.ts
├── utils/
│   └── logger.ts
└── index.ts
```

### 3. Environment Configuration (src/config/env.ts)
Create a validated configuration module using Zod:

Required environment variables:
- `PORT` - Server port (default: 3000)
- `WIX_APP_ID` - From Wix app dashboard
- `WIX_APP_SECRET` - From Wix app dashboard (keep secure!)
- `WIX_WEBHOOK_PUBLIC_KEY` - For webhook signature verification
- `BASE_URL` - Your app's public URL (e.g., https://your-app.com)
- `NODE_ENV` - development | production

Export a typed config object that validates on startup and throws if invalid.

### 4. Logger Utility (src/utils/logger.ts)
Create a simple logger that:
- Outputs JSON in production
- Outputs formatted text in development
- Includes timestamp, level, message, and optional metadata
- Levels: debug, info, warn, error

### 5. Main Entry Point (src/index.ts)
Create Express application that:
- Loads and validates environment config
- Sets up JSON body parser (with raw body preservation for webhooks)
- Mounts route modules
- Includes error handling middleware
- Starts server and logs startup info

### 6. Instance Store (src/store/instances.ts)
Create an in-memory store for app instances (will be replaced with DB later):
- Map of instanceId → { accessToken, refreshToken, installedAt, siteId }
- Methods: save, get, delete, getAll
- Add TODO comments for database migration

## File Templates

### package.json scripts
```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### .env.example
```
PORT=3000
NODE_ENV=development
WIX_APP_ID=your-app-id
WIX_APP_SECRET=your-app-secret
WIX_WEBHOOK_PUBLIC_KEY=your-webhook-public-key
BASE_URL=https://your-ngrok-url.ngrok.io
```

## Acceptance Criteria
- [ ] Server starts without errors
- [ ] Environment validation fails gracefully with clear error messages
- [ ] Logger outputs correctly in both environments
- [ ] TypeScript compiles with no errors
- [ ] All imports use ES module syntax
EOF

echo "Created phase-1.1-project-setup.md"

#######################################
# Phase 1.2 - OAuth Authentication
#######################################
cat > .cursor/rules/phase-1.2-oauth.md << 'EOF'
# Phase 1.2: OAuth Authentication

## Context
Wix uses OAuth 2.0 for app authentication. When a merchant installs our app, we need to exchange credentials for access tokens to call Wix APIs on their behalf.

## Reference Documentation
- Auth endpoint: `https://www.wixapis.com/oauth2/token`
- Token valid for: 4 hours
- We use the simpler "OAuth" flow (not legacy "Custom Authentication")

## Goal
Implement complete OAuth flow for app installation and token management.

## OAuth Flow Overview
1. Merchant clicks "Install" in Wix App Market
2. Wix redirects to our App URL with `token` query param
3. We redirect merchant to Wix consent screen
4. After consent, Wix redirects to our Redirect URL with `code` and `instanceId`
5. We exchange credentials for access token
6. We store tokens and instanceId for future API calls

## Tasks

### 1. Wix Types (src/wix/types.ts)
Define TypeScript interfaces:

- WixTokenRequest: grant_type, client_id, client_secret, instance_id
- WixTokenResponse: access_token, token_type, expires_in
- AppInstance: instanceId, accessToken, tokenExpiresAt, installedAt, siteId
- WixWebhookPayload: instanceId, eventType, data

### 2. Auth Module (src/wix/auth.ts)
Create authentication functions:

#### `getAccessToken(instanceId: string): Promise<string>`
- Check if we have a valid (non-expired) token in store
- If expired or missing, call `createAccessToken()`
- Return the access token
- Add 5-minute buffer before expiry for safety

#### `createAccessToken(instanceId: string): Promise<WixTokenResponse>`
- POST to `https://www.wixapis.com/oauth2/token`
- Body: `{ grant_type: 'client_credentials', client_id, client_secret, instance_id }`
- Headers: `Content-Type: application/json`
- Store the new token with expiry time
- Return token response

#### `handleInstallation(instanceId: string): Promise<void>`
- Create initial access token
- Store in instance store
- Log successful installation

### 3. Auth Routes (src/routes/auth.routes.ts)
Create Express router with these endpoints:

#### `GET /auth/install`
Called when merchant starts installation:
- Extract `token` from query params
- Redirect to: `https://www.wix.com/installer/install?token={token}&appId={APP_ID}&redirectUrl={BASE_URL}/auth/callback`

#### `GET /auth/callback`
Called after merchant consents:
- Extract `code` and `instanceId` from query params
- Call `handleInstallation(instanceId)`
- Redirect to Wix dashboard or show success page
- Handle errors gracefully

#### `GET /auth/status/:instanceId`
Health check for a specific installation:
- Return whether we have valid tokens for this instance
- Useful for debugging

### 4. Wix API Client (src/wix/client.ts)
Create a reusable API client class WixClient:
- Constructor takes instanceId
- Method: request<T>(method, endpoint, data?) 
- Automatically fetches/refreshes access token
- Sets Authorization header: `Bearer {token}`
- Base URL: `https://www.wixapis.com`
- Handles rate limiting (429) with retry
- Logs request/response for debugging
- Throws typed errors

### 5. Error Handling
Create custom error classes:
- WixAuthError: message, code
- WixAPIError: message, statusCode, details

## Testing the Flow

### Manual Test Steps:
1. Start local server with ngrok: `ngrok http 3000`
2. Update BASE_URL in .env with ngrok URL
3. In Wix app dashboard, set:
   - App URL: `{BASE_URL}/auth/install`
   - Redirect URL: `{BASE_URL}/auth/callback`
4. Click "Test App" in Wix dashboard
5. Complete installation flow
6. Check logs for successful token creation
7. Verify instance stored correctly

## Acceptance Criteria
- [ ] Installation flow completes without errors
- [ ] Access token is retrieved and stored
- [ ] Token refresh works when token expires
- [ ] WixClient can make authenticated requests
- [ ] Errors are handled gracefully with clear messages
- [ ] All sensitive data (secrets, tokens) are never logged
EOF

echo "Created phase-1.2-oauth.md"

#######################################
# Phase 1.3 - Webhooks & Dashboard
#######################################
cat > .cursor/rules/phase-1.3-webhooks-dashboard.md << 'EOF'
# Phase 1.3: Webhooks & Dashboard

## Context
Wix sends webhooks to notify our app of events (orders, inventory changes, etc.). We also need a dashboard page where merchants can configure our app.

## Goal
Set up webhook infrastructure and basic dashboard page.

---

## Part A: Webhooks

### Webhook Security
Wix signs all webhooks using JWT. We MUST verify signatures before processing.
The webhook arrives as a JWT in the request body. Verify using Wix's public key.

### 1. Webhook Validation Middleware (src/middleware/validate-webhook.ts)
- Get the raw body (JWT string)
- Verify JWT using WIX_WEBHOOK_PUBLIC_KEY
- Decode payload and attach to req.webhookPayload
- Call next() or return 401

Install dependency: jsonwebtoken, @types/jsonwebtoken
The public key format from Wix is PEM. Store in env as single line, replace `\n` literals.

### 2. Webhook Types (add to src/wix/types.ts)
WebhookEvent interface:
- instanceId, eventType, slug, entityId
- data, createdEvent, updatedEvent, deletedEvent

Event types we care about:
- wix.instance.app_installed
- wix.instance.app_removed
- (More added in Phase 2)

### 3. Webhook Handlers (src/wix/webhooks.ts)
Create a webhook dispatcher with handlers Record<string, WebhookHandler>:
- handleAppInstalled: Log installation, initialize instance data
- handleAppRemoved: Clean up instance data, remove tokens

Export processWebhook function that routes to appropriate handler.

### 4. Webhook Routes (src/routes/webhook.routes.ts)
POST /webhooks endpoint:
- Use express.text({ type: '*/*' }) to receive raw JWT
- Apply validateWixWebhook middleware
- Call processWebhook
- Always return 200 quickly (process async if needed)

**Important**: Always return 200 to prevent retries for app errors.

---

## Part B: Dashboard Page

### Overview
The dashboard is an iframe embedded in Wix's dashboard. Wix passes context via query params.

### 1. Dashboard Route (src/routes/dashboard.routes.ts)

#### `GET /dashboard`
Query params from Wix:
- `instance` - Signed JWT containing instanceId and permissions
- `locale` - User's language (e.g., 'en')

Steps:
1. Decode the instance JWT (no verification needed for reading)
2. Extract instanceId, permissions
3. Get instance data from our store
4. Render dashboard HTML or redirect to React app

### 2. Instance Decoder (add to src/wix/auth.ts)
DecodedInstance interface:
- instanceId, appDefId, signDate, uid, permissions, siteOwnerId, siteMemberId, expirationDate

Function decodeInstance(instance: string): DecodedInstance
- Base64 decode the instance param
- It's a signed JWT - decode without verification for reading

### 3. Simple Dashboard HTML
For POC, create a simple HTML page with:
- Title: "Store Agent - Dashboard"
- Status display (connected/error)
- Instance info display
- Quick action buttons: Test Connection, View Products
- Results display area

### 4. Dashboard API Endpoints
- GET /api/status/:instanceId - Returns connection status
- GET /api/products/:instanceId - Returns list of products (Phase 2)

---

## Wix App Dashboard Configuration

In your Wix app dashboard, configure:

1. **Extensions → Dashboard Page**
   - Name: "Store Agent"
   - Page URL: `{BASE_URL}/dashboard`

2. **Webhooks**
   - Add webhook endpoint: `{BASE_URL}/webhooks`
   - Subscribe to events: App Instance Installed, App Instance Removed

3. **Permissions**
   - For Phase 1, request: `Manage Stores` (read)

---

## Acceptance Criteria
- [ ] Webhooks are received and validated correctly
- [ ] Invalid webhook signatures are rejected with 401
- [ ] App installed/removed webhooks update instance store
- [ ] Dashboard loads in Wix iframe
- [ ] Dashboard shows connection status
- [ ] Instance context is correctly decoded from query param
EOF

echo "Created phase-1.3-webhooks-dashboard.md"

#######################################
# Phase 2.1 - Products Service
#######################################
cat > .cursor/rules/phase-2.1-products.md << 'EOF'
# Phase 2.1: Products & Catalog Service

## Context
Access and manage the merchant's product catalog. Wix is migrating from Catalog V1 to V3 (Q4 2025), so we'll implement support for both with version detection.

## Reference Documentation
- Catalog V3: https://dev.wix.com/docs/rest/business-solutions/stores/catalog-v3
- Catalog V1: https://dev.wix.com/docs/rest/business-solutions/stores/catalog-v1

## Goal
Create a products service that abstracts catalog operations and handles API versioning.

---

## Tasks

### 1. Product Types (src/services/types/product.types.ts)

Unified Product interface (abstracts V1/V3 differences):
- id, name, slug, description, sku
- price: { amount, currency, formatted }
- compareAtPrice: { amount, currency }
- media: ProductMedia[]
- inventory: { trackInventory, inStock, quantity }
- productType: 'physical' | 'digital'
- visible, variants, options, collections
- createdAt, updatedAt

ProductMedia: id, url, type, altText, width, height
ProductVariant: id, sku, price, compareAtPrice, weight, inventory, choices
ProductOption: name, values[]
ProductQuery: limit, offset, collectionId, includeHidden, search
ProductListResult: products[], totalCount, hasMore

### 2. Catalog Version Detection (src/services/products/version.ts)
- Cache version per instance
- GET /stores/v1/catalog/version
- Return 'V1' or 'V3'

### 3. Products Service (src/services/products/products.service.ts)
ProductsService class with methods:
- getVersion(): Promise<CatalogVersion>
- listProducts(query?): Promise<ProductListResult>
- getProduct(productId): Promise<Product>
- searchProducts(searchTerm, limit?): Promise<Product[]>
- getProductsByCollection(collectionId): Promise<Product[]>
- updateProductPrice(productId, price): Promise<Product>
- updateProductInventory(productId, quantity): Promise<void>
- normalizeProduct(raw, version): Product (private helper)

### 4. API Endpoints by Version

Catalog V3:
- List: POST /stores/v3/products/query
- Get: GET /stores/v3/products/{productId}
- Update: PATCH /stores/v3/products/{productId}

Catalog V1:
- List: POST /stores/v1/products/query
- Get: GET /stores/v1/products/{productId}
- Update: PATCH /stores/v1/products/{productId}

### 5. Collections Service (src/services/products/collections.service.ts)
Collection interface: id, name, slug, description, media, productCount, visible

CollectionsService class:
- listCollections(): Promise<Collection[]>
- getCollection(collectionId): Promise<Collection>
- getCollectionProducts(collectionId): Promise<Product[]>

### 6. Product Webhooks (update src/wix/webhooks.ts)
Add handlers:
- wix.stores.v1.product_created
- wix.stores.v1.product_updated
- wix.stores.v1.product_deleted

### 7. Dashboard API Endpoints
- GET /api/:instanceId/products
- GET /api/:instanceId/products/:productId

---

## Permissions Required
- WIX_STORES.READ_PRODUCTS
- WIX_STORES.WRITE_PRODUCTS
- WIX_STORES.READ_COLLECTIONS

---

## Acceptance Criteria
- [ ] Catalog version is detected correctly
- [ ] Products can be listed with pagination
- [ ] Single product can be retrieved by ID
- [ ] Product search works
- [ ] Products by collection works
- [ ] Both V1 and V3 APIs return unified Product type
- [ ] Product webhooks are processed
- [ ] Dashboard can display product list
EOF

echo "Created phase-2.1-products.md"

#######################################
# Phase 2.2 - Orders Service
#######################################
cat > .cursor/rules/phase-2.2-orders.md << 'EOF'
# Phase 2.2: Orders Service

## Context
Access and manage orders placed on the merchant's store.

## Reference Documentation
- Orders API: https://dev.wix.com/docs/rest/business-solutions/e-commerce/orders
- Order Fulfillments: https://dev.wix.com/docs/rest/business-solutions/e-commerce/orders/order-fulfillments

## Goal
Create an orders service for reading, managing, and fulfilling orders.

---

## Tasks

### 1. Order Types (src/services/types/order.types.ts)

OrderStatus: INITIALIZED, APPROVED, CANCELED, FULFILLED, PARTIALLY_FULFILLED
PaymentStatus: NOT_PAID, PENDING, PAID, PARTIALLY_REFUNDED, FULLY_REFUNDED
FulfillmentStatus: NOT_FULFILLED, PARTIALLY_FULFILLED, FULFILLED

Order interface:
- id, number, status, paymentStatus, fulfillmentStatus
- buyer: { contactId, email, phone, firstName, lastName }
- lineItems: OrderLineItem[]
- shippingInfo: { address, deliveryOption, estimatedDelivery }
- billingInfo: { address }
- pricing: { subtotal, shipping, tax, discount, total }
- fulfillments: Fulfillment[]
- channelInfo: { type, externalOrderId }
- createdAt, updatedAt

OrderLineItem: id, productId, name, quantity, sku, price, totalPrice, weight, media, options
Address: street, city, state, postalCode, country
Money: amount, currency, formatted
Fulfillment: id, lineItems, trackingInfo, createdAt

OrderQuery: limit, offset, status[], paymentStatus[], dateRange, search
OrderListResult: orders[], totalCount, hasMore

### 2. Orders Service (src/services/orders/orders.service.ts)

OrdersService class:
- listOrders(query?): Promise<OrderListResult>
- getOrder(orderId): Promise<Order>
- searchOrders(searchTerm): Promise<Order[]>
- getOrdersByCustomer(email): Promise<Order[]>
- approveOrder(orderId): Promise<Order>
- cancelOrder(orderId): Promise<Order>
- createFulfillment(orderId, lineItems, trackingInfo?): Promise<Fulfillment>
- updateFulfillmentTracking(orderId, fulfillmentId, trackingInfo): Promise<Fulfillment>
- normalizeOrder(raw): Order (private helper)

### 3. API Endpoints
- POST /ecom/v1/orders/query
- GET /ecom/v1/orders/{orderId}
- POST /ecom/v1/orders/{orderId}/cancel
- POST /ecom/v1/fulfillments

### 4. Order Webhooks (update src/wix/webhooks.ts)
Add handlers:
- wix.ecom.v1.order_created
- wix.ecom.v1.order_updated
- wix.ecom.v1.order_paid
- wix.ecom.v1.order_fulfilled
- wix.ecom.v1.order_canceled

### 5. Dashboard API Endpoints
- GET /api/:instanceId/orders
- GET /api/:instanceId/orders/:orderId
- POST /api/:instanceId/orders/:orderId/fulfill

---

## Permissions Required
- WIX_STORES.READ_ORDERS
- WIX_STORES.WRITE_ORDERS
- WIX_ECOM.READ_ORDERS
- WIX_ECOM.MANAGE_ORDERS

---

## Acceptance Criteria
- [ ] Orders can be listed with pagination
- [ ] Orders can be filtered by status and date
- [ ] Single order retrieval works
- [ ] Order search by number/email works
- [ ] Fulfillment creation works with tracking
- [ ] Order webhooks are processed correctly
- [ ] Dashboard displays order list and details
EOF

echo "Created phase-2.2-orders.md"

#######################################
# Phase 2.3 - Inventory Service
#######################################
cat > .cursor/rules/phase-2.3-inventory.md << 'EOF'
# Phase 2.3: Inventory Service

## Context
Manage product inventory levels. Critical for preventing overselling.

## Reference Documentation
- Inventory API: https://dev.wix.com/docs/rest/business-solutions/stores/inventory

## Goal
Create an inventory service for reading and updating stock levels.

---

## Tasks

### 1. Inventory Types (src/services/types/inventory.types.ts)

InventoryItem: id, productId, variantId, sku, trackInventory, inStock, quantity, preorderEnabled, preorderLimit, lastUpdated

InventoryUpdate: productId, variantId, setQuantity?, incrementBy?, trackInventory?

BulkInventoryUpdate: items[]

InventoryQuery: productIds[], variantIds[], inStock?, trackingEnabled?, limit, offset

InventoryListResult: items[], totalCount, hasMore

LowStockItem extends InventoryItem: productName, threshold

### 2. Inventory Service (src/services/inventory/inventory.service.ts)

InventoryService class:
- getProductInventory(productId): Promise<InventoryItem[]>
- getVariantInventory(variantId): Promise<InventoryItem>
- listInventory(query?): Promise<InventoryListResult>
- updateInventory(update): Promise<InventoryItem>
- bulkUpdateInventory(updates): Promise<InventoryItem[]>
- decrementInventory(productId, quantity, variantId?): Promise<InventoryItem>
- incrementInventory(productId, quantity, variantId?): Promise<InventoryItem>
- getLowStockItems(threshold): Promise<LowStockItem[]>
- setTrackingEnabled(productId, enabled, variantId?): Promise<InventoryItem>

### 3. API Endpoints
- POST /stores/v2/inventoryItems/query
- GET /stores/v2/inventoryItems/{inventoryItemId}
- POST /stores/v2/inventoryItems/{inventoryItemId}/updateQuantity
- POST /stores/v2/inventoryItems/bulkUpdate

### 4. Inventory Webhooks
- wix.stores.v2.inventory_item_updated
- wix.stores.v2.inventory_item_quantity_updated

Handle low stock alerts when quantity drops below threshold.

### 5. Inventory Sync Utility (src/services/inventory/sync.ts)
For syncing with external systems:

ExternalInventory: sku, quantity

InventorySyncService class:
- syncFromExternal(externalItems): Promise<{ updated, failed, notFound }>
- exportInventory(): Promise<ExternalInventory[]>

### 6. Dashboard API Endpoints
- GET /api/:instanceId/inventory
- PATCH /api/:instanceId/inventory
- GET /api/:instanceId/inventory/low-stock

---

## Permissions Required
- WIX_STORES.READ_INVENTORY
- WIX_STORES.WRITE_INVENTORY

---

## Acceptance Criteria
- [ ] Inventory can be queried by product/variant
- [ ] Inventory quantity can be set absolutely
- [ ] Inventory can be incremented/decremented
- [ ] Bulk updates work correctly
- [ ] Low stock detection works
- [ ] Inventory webhooks are processed
- [ ] Dashboard shows inventory status
EOF

echo "Created phase-2.3-inventory.md"

#######################################
# Phase 3.1 - Cart API
#######################################
cat > .cursor/rules/phase-3.1-cart.md << 'EOF'
# Phase 3.1: Cart Management

## Context
Before checkout, customers have a cart. External apps can create and manage carts programmatically.

## Reference Documentation
- Cart API: https://dev.wix.com/docs/rest/business-solutions/e-commerce/cart

## Goal
Create carts programmatically from external applications.

---

## Tasks

### 1. Cart Types (src/services/types/cart.types.ts)

Cart: id, lineItems[], buyerInfo, currency, subtotal, appliedDiscounts[], buyerNote, createdAt, updatedAt

CartLineItem: id, productId, quantity, catalogReference, productName, price, lineItemPrice, media, sku, weight

AppliedDiscount: discountType, lineItemIds, coupon, discountAmount

AddToCartItem: catalogReference (catalogItemId, appId, options), quantity

CartOptions: currency, buyerNote, couponCode

Money: amount (string), currency, formattedAmount

WIX_STORES_APP_ID constant: '215238eb-22a5-4c36-9e7b-e7c08025e04e'

### 2. Cart Service (src/services/cart/cart.service.ts)

CartService class:
- createCart(options?): Promise<Cart>
- getCart(cartId): Promise<Cart>
- addToCart(cartId, items): Promise<Cart>
- updateLineItemQuantity(cartId, lineItemId, quantity): Promise<Cart>
- removeLineItem(cartId, lineItemId): Promise<Cart>
- applyCoupon(cartId, couponCode): Promise<Cart>
- removeCoupon(cartId, couponId): Promise<Cart>
- deleteCart(cartId): Promise<void>
- createCartWithItems(items, options?): Promise<Cart>
- buildCatalogReference(productId, variantId?, options?): CatalogReference

### 3. API Endpoints
- POST /ecom/v1/carts
- GET /ecom/v1/carts/{cartId}
- POST /ecom/v1/carts/{cartId}/add-to-cart
- POST /ecom/v1/carts/{cartId}/update-line-items-quantity
- POST /ecom/v1/carts/{cartId}/remove-line-items
- POST /ecom/v1/carts/{cartId}/add-coupon
- DELETE /ecom/v1/carts/{cartId}

### 4. External API Routes
- POST /external/cart - Create cart with items
- POST /external/cart/:cartId/items - Add items
- DELETE /external/cart/:cartId/items/:lineItemId - Remove item

All external routes require instanceId in body for validation.

---

## Permissions Required
- WIX_ECOM.READ_CARTS
- WIX_ECOM.MANAGE_CARTS

---

## Acceptance Criteria
- [ ] Cart can be created programmatically
- [ ] Items can be added with product ID and variant
- [ ] Item quantity can be updated
- [ ] Items can be removed
- [ ] Coupon codes can be applied
- [ ] Cart total is calculated correctly
- [ ] External API endpoints work
- [ ] Cart ID is returned for checkout flow
EOF

echo "Created phase-3.1-cart.md"

#######################################
# Phase 3.2 - Hosted Checkout
#######################################
cat > .cursor/rules/phase-3.2-checkout.md << 'EOF'
# Phase 3.2: Hosted Checkout & Redirect

## Context
Convert a cart to checkout and redirect the customer to Wix's hosted checkout page.

## Reference Documentation
- Checkout API: https://dev.wix.com/docs/rest/business-solutions/e-commerce/checkout

## Goal
Enable external applications to create checkouts and redirect customers.

---

## Complete Flow
```
1. External App creates Cart (Phase 3.1)
2. External App calls "Create Checkout from Cart" 
3. External App calls "Get Checkout URL"
4. External App redirects customer to Wix Checkout URL
5. Customer completes payment on Wix
6. Wix redirects to success/thank you page
7. Webhook notifies your app of order creation
```

---

## Tasks

### 1. Checkout Types (src/services/types/checkout.types.ts)

CheckoutStatus: CREATED, COMPLETED, ABANDONED

Checkout: id, cartId, lineItems[], billingInfo, shippingInfo, buyerInfo, priceSummary, appliedDiscounts, paymentStatus, status, currency, checkoutUrl, createdAt, updatedAt

CheckoutLineItem: id, productId, quantity, name, sku, price, totalPrice, media, options[]

BuyerInfo: contactId, visitorId, email, firstName, lastName, phone

BillingInfo: address, contactDetails

ShippingInfo: address, contactDetails, shippingOption

CreateCheckoutOptions: channelType, buyerInfo, shippingAddress, billingAddress

CheckoutUrlOptions: successUrl, cancelUrl, thankYouPageUrl

### 2. Checkout Service (src/services/checkout/checkout.service.ts)

CheckoutService class:
- createCheckoutFromCart(cartId, options?): Promise<Checkout>
- createCheckout(lineItems, options?): Promise<Checkout>
- getCheckout(checkoutId): Promise<Checkout>
- getCheckoutUrl(checkoutId, options?): Promise<string> **KEY METHOD**
- updateBuyerInfo(checkoutId, buyerInfo): Promise<Checkout>
- updateShippingAddress(checkoutId, address, contactDetails?): Promise<Checkout>
- getCheckoutUrlFromCart(cartId, options?): Promise<{ checkoutId, checkoutUrl }>

### 3. API Endpoints
- POST /ecom/v1/checkouts/from-cart
- POST /ecom/v1/checkouts
- GET /ecom/v1/checkouts/{checkoutId}
- POST /ecom/v1/checkouts/{checkoutId}/get-checkout-url **CRITICAL**

### 4. External API Endpoints
- POST /external/checkout - Create checkout and get redirect URL
- POST /external/checkout/direct - One-shot checkout without cart
- GET /external/checkout/:checkoutId/status - Check completion

### 5. Success Page
GET /checkout/success
- Receives orderId, checkoutId from Wix
- Display thank you message
- Post message to parent window if iframe/popup

---

## Permissions Required
- WIX_ECOM.READ_CHECKOUTS
- WIX_ECOM.MANAGE_CHECKOUTS

---

## Acceptance Criteria
- [ ] Checkout can be created from cart
- [ ] Checkout URL is retrieved correctly
- [ ] Customer redirected to Wix hosted checkout
- [ ] Buyer info can be pre-filled
- [ ] Shipping address can be pre-filled
- [ ] Success/Thank you redirect works
- [ ] Order webhook received after payment
- [ ] Checkout status can be queried
EOF

echo "Created phase-3.2-checkout.md"

#######################################
# Phase 3.3 - Order Completion
#######################################
cat > .cursor/rules/phase-3.3-order-completion.md << 'EOF'
# Phase 3.3: Order Completion & Webhook Handling

## Context
After payment on Wix hosted checkout, Wix creates an order and sends webhooks.

## Goal
Handle order creation webhooks and manage post-checkout flow.

---

## Tasks

### 1. Webhook Events to Handle
- wix.ecom.v1.order_created
- wix.ecom.v1.order_paid
- wix.ecom.v1.order_approved
- wix.ecom.v1.order_updated
- wix.ecom.v1.order_canceled
- wix.ecom.v1.order_fulfilled

### 2. Order Webhook Handlers (update src/wix/webhooks.ts)

handleOrderCreated: Log order, track external orders, emit event
handleOrderPaid: Log payment, auto-approve if configured, emit event
handleOrderApproved: Trigger fulfillment workflow, emit event

### 3. Order Event Emitter (src/events/order-events.ts)

OrderEventEmitter class extending EventEmitter:
- emitOrderCreated(payload)
- emitOrderPaid(payload)
- emitOrderReadyToFulfill(payload)

Register listeners for downstream processing.

### 4. External Order Tracking (src/services/tracking/external-orders.ts)

ExternalOrderRecord: instanceId, cartId, checkoutId, orderId, orderNumber, externalReference, createdAt, status

Functions:
- trackExternalCheckout(instanceId, cartId, checkoutId, externalReference)
- trackExternalOrder(instanceId, order)
- getExternalOrderByReference(externalReference)

### 5. External API Endpoints

GET /external/order/status - Query by orderId, checkoutId, or externalRef
GET /external/orders - List orders for an instance
POST /external/webhooks - Register webhook for order events

### 6. External Webhook Dispatch

ExternalWebhook: id, instanceId, url, events[], secret, active

Store registrations per instance.
When Wix events received, dispatch to registered webhooks with HMAC signature.

---

## Acceptance Criteria
- [ ] Order created webhook is received and processed
- [ ] Order paid webhook triggers appropriate actions
- [ ] External order tracking works
- [ ] Order status can be queried by external reference
- [ ] External webhook dispatch works
- [ ] End-to-end flow completes successfully
- [ ] Logs provide clear audit trail
EOF

echo "Created phase-3.3-order-completion.md"

#######################################
# Phase 4.1 - UCP Profile & Discovery
#######################################
cat > .cursor/rules/phase-4.1-ucp-profile.md << 'EOF'
# Phase 4.1: UCP Business Profile & Discovery

## Context
Google's Universal Commerce Protocol (UCP) is an open standard for agentic commerce (announced January 11, 2026). Our Wix TPA will expose a UCP Business Profile making Wix stores discoverable by AI agents.

## Reference Documentation
- UCP Specification: https://ucp.dev/specification/overview
- UCP GitHub: https://github.com/Universal-Commerce-Protocol/ucp
- Google UCP Guide: https://developers.google.com/merchant/ucp

## Goal
Make the Wix TPA a UCP-compliant Business that AI agents can discover.

---

## UCP Core Concepts

### Actors
- Platform: AI agent orchestrating shopping (Google AI Mode, Gemini)
- Business: Merchant selling goods (our TPA represents Wix merchants)
- Credential Provider: Manages payment instruments
- PSP: Processes payments

### Key Structures
- Profile: JSON at `/.well-known/ucp` declaring capabilities
- Service: API surface with transport bindings
- Capability: Core feature (Checkout, Order)
- Extension: Augments capability (Discounts, Fulfillment)
- Payment Handler: Spec for processing payments

### Naming Convention
Reverse-domain format: dev.ucp.shopping.checkout, dev.ucp.shopping.order

---

## Tasks

### 1. UCP Core Types (src/ucp/types/core.types.ts)

UCPVersion: '2026-01-11'

UCPCapability: name, version, spec, schema, extends?, config?

UCPService: version, spec, rest?, mcp?, a2a?, embedded?
- rest: { schema, endpoint }
- mcp: { schema, endpoint }
- a2a: { endpoint }

UCPPaymentHandler: id, name, version, spec, config_schema, instrument_schemas[], config

UCPSigningKey: kid, kty, crv, x, y, use, alg

UCPBusinessProfile: ucp { version, services, capabilities }, payment { handlers }, signing_keys[]

UCPPlatformProfile: ucp { version, capabilities }, payment { handlers }, signing_keys[]

UCPResponse<T>: ucp { version, capabilities[] }, ...T

UCPErrorResponse: status ('requires_escalation'), messages[]

UCPMoney: amount (number, minor units), currency

UCPAddress: street_address, extended_address, address_locality, address_region, postal_code, address_country, first_name, last_name

### 2. Profile Builder (src/ucp/profile/profile.builder.ts)

UCPProfileBuilder class:
- buildProfile(instanceId): Promise<UCPBusinessProfile>
- buildServices(): Record<string, UCPService>
- buildCapabilities(): UCPCapability[]
- buildPaymentConfig(instanceId): Promise<{ handlers }>
- getSigningKeys(): UCPSigningKey[]

Services: dev.ucp.shopping with REST binding to /ucp/v1

Capabilities:
- dev.ucp.shopping.checkout
- dev.ucp.shopping.order
- dev.ucp.shopping.fulfillment (extends checkout)
- dev.ucp.shopping.discount (extends checkout)

Payment Handler: Wix hosted checkout (REDIRECT type)

### 3. Profile Endpoint (src/ucp/routes/well-known.routes.ts)

GET /.well-known/ucp
- Resolve instance ID from request
- Build profile
- Set Cache-Control: public, max-age=3600
- Return JSON

### 4. UCP Request Middleware (src/ucp/middleware/ucp-request.ts)

Parse UCP-Agent header (RFC 8941): profile="https://..."

Fetch platform profile (with caching)

Capability Negotiation:
1. Compute intersection of platform & business capabilities
2. Prune orphaned extensions (no parent in intersection)
3. Repeat until stable

Attach to request: platformProfile, negotiatedCapabilities, ucpVersion

### 5. Response Helpers (src/ucp/utils/response.ts)

ucpResponse<T>(req, data): Wrap with UCP envelope
ucpError(code, message, severity?): Create error response

---

## Directory Structure
```
src/ucp/
├── types/
│   ├── core.types.ts
│   ├── checkout.types.ts
│   ├── order.types.ts
│   └── product.types.ts
├── profile/
│   └── profile.builder.ts
├── middleware/
│   ├── ucp-request.ts
│   └── ucp-auth.ts
├── services/
│   ├── checkout.service.ts
│   ├── order.service.ts
│   └── product.service.ts
├── routes/
│   ├── well-known.routes.ts
│   ├── checkout.routes.ts
│   ├── order.routes.ts
│   └── product.routes.ts
└── utils/
    ├── response.ts
    └── negotiation.ts
```

---

## Acceptance Criteria
- [ ] Business Profile served at /.well-known/ucp
- [ ] Profile includes UCP version 2026-01-11
- [ ] Shopping service declared with REST transport
- [ ] All capabilities declared with proper names/versions
- [ ] Extensions reference parent capability
- [ ] Payment handlers include Wix hosted checkout
- [ ] UCP-Agent header parsed correctly
- [ ] Platform profiles fetched and cached
- [ ] Capability negotiation produces correct intersection
- [ ] Orphaned extensions pruned
- [ ] Responses include UCP envelope
- [ ] Errors follow UCP format
EOF

echo "Created phase-4.1-ucp-profile.md"

#######################################
# Phase 4.2 - UCP Checkout Capability
#######################################
cat > .cursor/rules/phase-4.2-ucp-checkout.md << 'EOF'
# Phase 4.2: UCP Checkout Capability

## Context
The Checkout capability is the core of UCP shopping. We bridge UCP's checkout model to Wix Cart/Checkout APIs.

## Reference Documentation
- Checkout Spec: https://ucp.dev/specification/checkout
- Checkout REST: https://ucp.dev/specification/checkout-rest

## Goal
Implement UCP Checkout capability backed by Wix APIs.

---

## UCP Checkout Flow
```
AI Agent (Platform)              Our TPA (Business)                 Wix APIs
       |-- Create Checkout Session ---->|-- Create Cart ------------->|
       |<-- Session (incomplete) -------|<-- Cart ID -----------------|
       |-- Update Session (add items) ->|-- Add to Cart ------------->|
       |<-- Updated Session ------------|                             |
       |-- Complete Session ----------->|-- Create Wix Checkout ----->|
       |                                |<-- Checkout URL ------------|
       |<-- { continue_url } -----------|                             |
```

Key: Complete returns `requires_escalation` with `continue_url` for redirect.

---

## Tasks

### 1. Checkout Types (src/ucp/types/checkout.types.ts)

CheckoutStatus: 'incomplete' | 'requires_escalation' | 'complete'

UCPLineItem: id, product_id, product_name, quantity, unit_price, total_price, image_url?, sku?, variant_id?, options[]

UCPBuyerInfo: email?, first_name?, last_name?, phone?

UCPShippingInfo: address, shipping_option?

UCPTotals: subtotal, shipping?, tax?, discount?, total

UCPPaymentData: id?, handler_id, type?, brand?, last_digits?, billing_address?, credential { type, token }

UCPCheckoutSession: id, status, line_items[], buyer_info?, shipping_info?, totals, currency, created_at, updated_at, payment { handlers[] }, discounts[]?, fulfillment?

UCPDiscount: id, code?, name, type, value, applied_amount

UCPFulfillment: type, options[]?, selected_option_id?

CreateCheckoutRequest: line_items[]?, buyer_info?, currency?

UpdateCheckoutRequest: line_items[]?, buyer_info?, shipping_info?, discount_codes[]?

CompleteCheckoutRequest: payment_data?, risk_signals?

CompleteCheckoutResponse: status, order_id?, continue_url?, messages[]?

### 2. UCP Checkout Service (src/ucp/services/checkout.service.ts)

UCPCheckoutService class:
- createSession(request): Promise<UCPCheckoutSession>
  → Creates Wix Cart
- getSession(sessionId): Promise<UCPCheckoutSession>
  → Gets Wix Cart
- updateSession(sessionId, request): Promise<UCPCheckoutSession>
  → Updates Wix Cart (add/remove items, apply discounts)
- completeSession(sessionId, request): Promise<CompleteCheckoutResponse>
  → Creates Wix Checkout, returns continue_url
- deleteSession(sessionId): Promise<void>
  → Deletes Wix Cart
- cartToUCPSession(cart, buyerInfo?, shippingInfo?): UCPCheckoutSession
- toUCPMoney(money): UCPMoney (convert to minor units)
- getPaymentConfig(): { handlers[] }

### 3. Data Mapping

Wix Cart → UCP Session:
- cart.id → session.id
- cart.lineItems → session.line_items
- cart.subtotal → session.totals.subtotal
- cart.currency → session.currency
- cart.appliedDiscounts → session.discounts

Money: Wix decimals → UCP minor units (multiply by 100)
Dates: RFC 3339 format (.toISOString())

### 4. Checkout Routes (src/ucp/routes/checkout.routes.ts)

POST /ucp/v1/checkout-sessions → createSession (201)
GET /ucp/v1/checkout-sessions/:id → getSession (200)
PATCH /ucp/v1/checkout-sessions/:id → updateSession (200)
POST /ucp/v1/checkout-sessions/:id/complete → completeSession (200)
DELETE /ucp/v1/checkout-sessions/:id → deleteSession (204)

All routes apply UCP request middleware and return UCP envelope.

### 5. Extensions

Discounts (dev.ucp.shopping.discount):
- Accept discount_codes in update
- Apply via Wix coupon API
- Include in response

Fulfillment (dev.ucp.shopping.fulfillment):
- Include fulfillment type
- List shipping options

### 6. Completion Callback

GET /ucp/checkout/success
- Display success, post message to parent window

---

## Error Codes
- session_not_found
- invalid_product
- out_of_stock
- invalid_discount
- checkout_failed

---

## Acceptance Criteria
- [ ] Create session returns valid UCP format
- [ ] Session ID = Wix Cart ID
- [ ] Line items can be added/updated/removed
- [ ] Discount codes work (extension)
- [ ] Complete returns continue_url
- [ ] Money in minor units
- [ ] Dates in RFC 3339
- [ ] Responses include UCP envelope
- [ ] Errors follow UCP format
EOF

echo "Created phase-4.2-ucp-checkout.md"

#######################################
# Phase 5 - UCP Skills & Capabilities
#######################################
cat > .cursor/rules/phase-5-ucp-capabilities.md << 'EOF'
# Phase 5: UCP Skills & Capabilities

## Context
AI agents need product discovery and order tracking beyond checkout.

## Reference Documentation
- Order Capability: https://ucp.dev/specification/order

## Goal
Implement product discovery and Order capability.

---

## Part A: Product Discovery

### 1. Product Types (src/ucp/types/product.types.ts)

UCPProduct: id, name, description?, slug, price, compare_at_price?, images[], in_stock, quantity_available?, variants[]?, options[]?, categories[]?, tags[]?, url?

UCPProductVariant: id, sku?, price, in_stock, options

UCPProductOption: name, values[]

UCPProductQuery: q?, category?, min_price?, max_price?, in_stock?, limit?, offset?, sort?

UCPProductListResult: products[], total_count, has_more

UCPCategory: id, name, slug, description?, image_url?, product_count

### 2. Product Service (src/ucp/services/product.service.ts)

UCPProductService class:
- queryProducts(query): Promise<UCPProductListResult>
- getProduct(productId): Promise<UCPProduct>
- getProductsByIds(ids): Promise<UCPProduct[]>
- getCategories(): Promise<UCPCategory[]>
- wixProductToUCP(product): UCPProduct
- sortProducts(products, sort): UCPProduct[]

### 3. Product Routes (src/ucp/routes/product.routes.ts)

GET /ucp/v1/products - Search/list with query params
GET /ucp/v1/products/:id - Get single product
GET /ucp/v1/categories - List categories

---

## Part B: Order Capability

### 1. Order Types (src/ucp/types/order.types.ts)

UCPOrderStatus: pending, confirmed, processing, shipped, delivered, cancelled, returned

UCPOrderEventType: order.created, order.confirmed, order.shipped, order.delivered, order.cancelled, order.returned

UCPShipment: id, carrier, tracking_number, tracking_url?, status, shipped_at?, delivered_at?, items[]

UCPOrder: id, checkout_session_id, order_number, status, line_items[], buyer_info, shipping_address, billing_address?, totals, currency, shipments[], created_at, updated_at

UCPOrderEvent: event_type, event_id, timestamp, order, shipment?

UCPOrderWebhookConfig: webhook_url, events[]?, secret?

### 2. Order Service (src/ucp/services/order.service.ts)

UCPOrderService class:
- getOrder(orderId): Promise<UCPOrder>
- listOrders(filters?): Promise<{ orders, has_more }>
- sendOrderEvent(webhookUrl, event, secret?): Promise<void>
- wixOrderToUCP(order): UCPOrder
- wixStatusToUCP(status, fulfillment): UCPOrderStatus

### 3. Order Routes (src/ucp/routes/order.routes.ts)

GET /ucp/v1/orders - List with filters
GET /ucp/v1/orders/:id - Get single order

### 4. Webhook Bridge (src/ucp/webhooks/order-bridge.ts)

Map Wix events to UCP events:
- wix.ecom.v1.order_created → order.created
- wix.ecom.v1.order_approved → order.confirmed
- wix.ecom.v1.order_fulfilled → order.shipped
- wix.ecom.v1.order_canceled → order.cancelled

Send to registered platform webhooks with HMAC signature.

---

## Endpoints Summary

Products:
- GET /ucp/v1/products
- GET /ucp/v1/products/:id
- GET /ucp/v1/categories

Orders:
- GET /ucp/v1/orders
- GET /ucp/v1/orders/:id

---

## Acceptance Criteria

### Products
- [ ] Search by keyword
- [ ] Filter by category, price, stock
- [ ] Sort (price, name, newest)
- [ ] Pagination works
- [ ] Variants and options included
- [ ] Categories list collections

### Orders
- [ ] List with filters
- [ ] Single order retrieval
- [ ] Shipment info included
- [ ] Status mapping correct
- [ ] Wix webhooks → UCP events
- [ ] Platform webhooks receive events
EOF

echo "Created phase-5-ucp-capabilities.md"

#######################################
# Phase 6 - Production Readiness
#######################################
cat > .cursor/rules/phase-6-production.md << 'EOF'
# Phase 6: Production Readiness

## Context
Prepare for production with security, monitoring, and scalability.

## Reference Documentation
- UCP Security: https://ucp.dev/specification/overview#security-authentication

## Goal
Production-grade deployment.

---

## Part A: Security

### 1. Request Authentication (src/ucp/middleware/ucp-auth.ts)

API Key: `Authorization: ApiKey {key}`
- Store keys with platformId, permissions[], expiresAt
- Validate and check expiry

JWT Bearer: `Authorization: Bearer {token}`
- Verify signature, issuer, expiration
- Extract platform identity

Permissions:
- checkout:read, checkout:write
- products:read
- orders:read, orders:webhooks

### 2. Webhook Signatures

Outgoing: HMAC-SHA256, header X-UCP-Signature: sha256={hex}
Incoming: Verify with timing-safe comparison

### 3. Response Signing (Optional)

EC P-256 keys, publish in profile's signing_keys
JWS signatures on critical responses

### 4. Input Validation

JSON schema validation
Sanitize strings, validate formats
Reject oversized payloads

---

## Part B: Rate Limiting

### Limits
- Profile discovery: 100/min
- Product search: 60/min
- Checkout operations: 30/min
- Order queries: 30/min

### Implementation
- Sliding window algorithm
- Key by IP + API key
- 429 with Retry-After header
- X-RateLimit-* headers

### Request Limits
- Max body: 1MB
- Max line items: 100
- Max discount codes: 10

---

## Part C: Monitoring

### 1. Structured Logging

JSON format, include: timestamp, level, message, requestId, instanceId, platformId

Levels: ERROR, WARN, INFO, DEBUG

Key events: profile requests, checkout lifecycle, payment attempts, webhook deliveries, auth failures

### 2. Metrics (Prometheus)

Request: count, latency (p50/p95/p99), error rate
Business: checkouts created/completed, abandonment, AOV
External: Wix API latency/errors, webhook success rate

Endpoint: GET /metrics

### 3. Health Checks

GET /health/live - Process running
GET /health/ready - All dependencies OK
GET /health/status - Detailed component status

### 4. Distributed Tracing

X-Request-ID header propagation through all calls

---

## Part D: Scalability

### Stateless Design

All state in Redis/DB
Profile cache in Redis
Session tracking in Redis

### Caching

Platform profiles: 1 hour
Products: 5 minutes
Business profiles: 1 hour

### Graceful Shutdown

Stop new requests
Complete in-flight (30s)
Close connections
Flush metrics

---

## Part E: Database

### Models

AppInstance: instanceId, accessToken (encrypted), tokenExpiresAt, siteId, installedAt, settings

WebhookRegistration: id, instanceId, platformId, webhookUrl, events[], secret (encrypted), createdAt

APIKey: key (hashed), platformId, instanceId, permissions[], createdAt, expiresAt, lastUsedAt

### Encryption

Encrypt sensitive fields at rest
Envelope encryption with secrets manager

---

## Part F: Optional MCP Transport

### MCP Tools

create_checkout, get_checkout, update_checkout, complete_checkout
search_products, get_product, get_order

### Endpoint

POST /ucp/mcp - JSON-RPC 2.0
Update profile with MCP binding

---

## Environment Variables

```
# Security
UCP_AUTH_ENABLED=true
UCP_JWT_SECRET=xxx

# Rate Limiting
UCP_RATE_LIMIT_ENABLED=true

# Cache
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgres://localhost/wix_ucp

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
```

---

## Acceptance Criteria

### Security
- [ ] API key auth works
- [ ] JWT auth works
- [ ] 401 for invalid credentials
- [ ] Webhook signatures correct
- [ ] Input validation rejects bad data

### Rate Limiting
- [ ] Limits enforced
- [ ] 429 returned when exceeded
- [ ] Headers present

### Monitoring
- [ ] Structured logs
- [ ] Metrics endpoint works
- [ ] Health checks work
- [ ] Request IDs propagated

### Scalability
- [ ] Stateless verified
- [ ] Caching works
- [ ] Graceful shutdown works
EOF

echo "Created phase-6-production.md"

#######################################
# Master Index
#######################################
cat > .cursor/rules/00-master-index.md << 'EOF'
# Wix Store Agent - Complete Development Guide

## Overview

A Wix TPA that:
1. Integrates with Wix merchant stores (Phases 1-3)
2. Enables external checkout (Phase 3)
3. Exposes UCP interface for AI agents (Phases 4-6)

## Tech Stack
- Node.js 20+ / TypeScript 5+
- Express.js
- PostgreSQL + Redis

---

## Phase Summary

| Phase | Name | Description |
|-------|------|-------------|
| 1.1 | Project Setup | Config, structure |
| 1.2 | OAuth | Wix authentication |
| 1.3 | Webhooks & Dashboard | Events, merchant UI |
| 2.1 | Products | Catalog operations |
| 2.2 | Orders | Order management |
| 2.3 | Inventory | Stock management |
| 3.1 | Cart | Programmatic carts |
| 3.2 | Checkout | Hosted checkout URL |
| 3.3 | Completion | Order webhooks |
| 4.1 | UCP Profile | Business discovery |
| 4.2 | UCP Checkout | AI checkout sessions |
| 5 | UCP Capabilities | Products, Orders |
| 6 | Production | Security, monitoring |

---

## Endpoints

### Wix Integration
- GET /auth/install
- GET /auth/callback
- POST /webhooks
- GET /dashboard
- POST /external/cart
- POST /external/checkout

### UCP Protocol
- GET /.well-known/ucp
- POST /ucp/v1/checkout-sessions
- GET /ucp/v1/checkout-sessions/{id}
- PATCH /ucp/v1/checkout-sessions/{id}
- POST /ucp/v1/checkout-sessions/{id}/complete
- DELETE /ucp/v1/checkout-sessions/{id}
- GET /ucp/v1/products
- GET /ucp/v1/products/{id}
- GET /ucp/v1/categories
- GET /ucp/v1/orders
- GET /ucp/v1/orders/{id}
- GET /health/live
- GET /health/ready
- GET /metrics

---

## UCP Capabilities

```
dev.ucp.shopping.checkout
dev.ucp.shopping.order
dev.ucp.shopping.fulfillment (extends checkout)
dev.ucp.shopping.discount (extends checkout)
```

---

## Wix Permissions

```
WIX_STORES.READ_PRODUCTS
WIX_STORES.READ_COLLECTIONS
WIX_STORES.READ_ORDERS
WIX_STORES.READ_INVENTORY
WIX_ECOM.READ_CARTS
WIX_ECOM.MANAGE_CARTS
WIX_ECOM.READ_CHECKOUTS
WIX_ECOM.MANAGE_CHECKOUTS
WIX_ECOM.READ_ORDERS
```

---

## Wix Webhooks

```
wix.instance.app_installed
wix.instance.app_removed
wix.stores.v1.product_created
wix.stores.v1.product_updated
wix.ecom.v1.order_created
wix.ecom.v1.order_paid
wix.ecom.v1.order_fulfilled
wix.ecom.v1.order_canceled
```

---

## Execution Order

1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 → 3.1 → 3.2 → 3.3 → 4.1 → 4.2 → 5 → 6

---

## Environment Variables

```bash
PORT=3000
NODE_ENV=production
BASE_URL=https://your-app.com

WIX_APP_ID=xxx
WIX_APP_SECRET=xxx
WIX_WEBHOOK_PUBLIC_KEY=xxx

UCP_ENABLED=true
UCP_VERSION=2026-01-11
UCP_AUTH_ENABLED=true
UCP_JWT_SECRET=xxx

DATABASE_URL=postgres://...
REDIS_URL=redis://...

LOG_LEVEL=info
METRICS_ENABLED=true
```
EOF

echo "Created 00-master-index.md"

echo ""
echo "✅ All Cursor rules files created in .cursor/rules/"
echo ""
echo "Files created:"
ls -la .cursor/rules/
