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
