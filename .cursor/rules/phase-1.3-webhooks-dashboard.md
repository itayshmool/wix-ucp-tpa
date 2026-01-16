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
