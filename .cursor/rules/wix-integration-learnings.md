# Wix Integration Learnings

**Date:** January 16, 2026  
**Phase:** 1.3 - Dashboard Implementation  
**Status:** ✅ Validated in Production

---

## 🔑 Critical Discoveries

### 1. Wix Instance Parameter Format

**❌ WRONG ASSUMPTION:**
- Wix uses standard JWT format: `header.payload.signature` (3 parts)

**✅ ACTUAL FORMAT:**
- Wix uses custom 2-part format: **`signature.payload`**
- Signature is HMAC-SHA256 of the payload
- Payload is base64url-encoded JSON

**Example Instance:**
```
nA0SVQiOEyOto8qPUvOhanr3PzhGxu6GaSxKfw3HJH8.eyJpbnN0YW5jZUlkIjoiOT...
├─ signature (HMAC-SHA256)
└─ payload (base64url JSON)
```

**Decoding Logic:**
```typescript
const parts = instance.split('.');
if (parts.length === 2) {
  const [signature, encodedPayload] = parts;
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', WIX_APP_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

### 2. Dashboard-Only Apps DON'T Need OAuth

**❌ WRONG ASSUMPTION:**
- All Wix apps need OAuth flow with access/refresh tokens

**✅ ACTUAL REQUIREMENT:**
- **Dashboard-only apps** (Phase 1.3) do NOT require OAuth
- The **instance parameter itself** proves the app is installed
- OAuth is ONLY needed when making **API calls to Wix** (Phase 2+)

**Correct Pattern:**
```typescript
// When dashboard receives instance parameter:
if (!instanceStore.get(decodedInstance.instanceId)) {
  // Auto-create instance record
  instanceStore.save(decodedInstance.instanceId, {
    instanceId: decodedInstance.instanceId,
    accessToken: '', // Empty for now
    refreshToken: '', // Empty for now
    installedAt: new Date(),
    siteId: decodedInstance.siteOwnerId
  });
}
// Show dashboard - NO OAuth required!
```

**Why This Works:**
- Wix only sends the instance parameter if the app is installed
- Instance parameter is cryptographically signed by Wix
- For dashboard display, no API calls are needed
- OAuth can be added later for API access (Phase 2+)

---

### 3. OAuth Redirect URL Configuration

**❌ WRONG ASSUMPTION:**
- Need to configure OAuth redirect URL in Wix Developer Console

**✅ ACTUAL SITUATION:**
- **Self-hosted dashboard apps** don't have OAuth redirect URL configuration
- Wix Developer Console only shows:
  - App ID
  - App Secret
  - Webhook Public Key
  - Webhook Endpoint URL

**What This Means:**
- For Phase 1.3 (dashboard-only), OAuth setup is NOT available
- Dashboard works purely on instance parameter validation
- OAuth flow (`/auth/install`, `/auth/callback`) is for future phases
- Don't try to complete OAuth flow in Phase 1.3 - it will fail with 400 Bad Request

---

### 4. Instance Parameter Contents

**Decoded Instance Payload:**
```json
{
  "instanceId": "921c6868-d476-43b5-9604-01a473a0ff7a",
  "appDefId": "5d6eef19-7185-44f6-a45d-ab1f4ae30e82",
  "signDate": "2026-01-16T10:14:39.400Z",
  "uid": "60b1a5ea-2e3e-4697-b280-f0c44b63f29d",
  "permissions": "OWNER",
  "demoMode": false,
  "siteOwnerId": "f1899499-75ab-4863-bed3-d353f7b29dff",
  "siteMemberId": "dc7f2c7a-d816-4feb-aef8-3b8aa29edcaf",
  "expirationDate": "2026-01-16T14:14:39.400Z",
  "loginAccountId": "60b1a5ea-2e3e-4697-b280-f0c44b63f29d",
  "lpai": null,
  "aor": true,
  "scd": "2026-01-12T11:20:40.488Z",
  "acd": "2022-02-07T16:27:44Z"
}
```

**Key Fields:**
- `instanceId` - Unique app installation ID (use as primary key)
- `appDefId` - Your app's ID in Wix
- `permissions` - User's permission level (OWNER, etc.)
- `siteOwnerId` - Wix site owner ID
- `expirationDate` - When instance parameter expires (typically 4 hours)

---

### 5. TypeScript Configuration for Render Deployment

**❌ WRONG:**
- Types packages in `devDependencies`

**✅ CORRECT:**
- Move ALL `@types/*` packages to `dependencies`
- Render needs types during build (production install)

**package.json:**
```json
{
  "dependencies": {
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^20.10.6",
    "@types/uuid": "^10.0.0",
    "typescript": "^5.3.3"
  },
  "devDependencies": {
    "tsx": "^4.7.0"
  }
}
```

---

## 🎯 Phase 1.3 Dashboard Implementation Pattern

### What Works (Validated)

```typescript
// 1. Dashboard receives instance parameter
router.get('/dashboard', async (req, res) => {
  const instanceParam = req.query.instance;
  
  // 2. Decode and verify signature
  const decoded = decodeInstance(instanceParam);
  
  // 3. Auto-create instance if not exists
  let instance = instanceStore.get(decoded.instanceId);
  if (!instance) {
    instance = {
      instanceId: decoded.instanceId,
      accessToken: '',  // Empty OK for Phase 1.3
      refreshToken: '', // Empty OK for Phase 1.3
      installedAt: new Date(),
      siteId: decoded.siteOwnerId
    };
    instanceStore.save(decoded.instanceId, instance);
  }
  
  // 4. Render dashboard (no OAuth needed!)
  res.send(generateDashboard(decoded, instance));
});
```

### Dashboard Should Show

- ✅ **"App Installed"** status (based on valid instance)
- ✅ Instance ID, Site ID, Permissions
- ✅ Installation timestamp
- ℹ️ **"OAuth Status: Not configured"** (expected for Phase 1.3)
- ℹ️ Info message: "OAuth will be needed for API calls in Phase 2+"

---

## 🚫 Common Mistakes to Avoid

### 1. Don't Require OAuth for Dashboard Display
```typescript
// ❌ WRONG - Checking for tokens
if (!instance.accessToken) {
  return res.send("App Not Installed");
}

// ✅ CORRECT - Instance parameter proves installation
if (!instance) {
  instance = createFromDecoded(decoded);
}
```

### 2. Don't Try to Configure OAuth Redirect URL in Wix
- There is NO place to configure this for self-hosted dashboard apps
- OAuth flow is for future phases
- Will result in endless loop of "where do I configure this?"

### 3. Don't Use Standard JWT Verification
```typescript
// ❌ WRONG - Standard JWT verify
jwt.verify(instance, secret); // Fails - wrong format

// ✅ CORRECT - 2-part format
const [sig, payload] = instance.split('.');
const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
```

### 4. Don't Show "Not Installed" When Instance Exists
```typescript
// ❌ WRONG
if (!instance) {
  return "App Not Installed - complete OAuth";
}

// ✅ CORRECT
if (!instance) {
  instance = autoCreateFromInstance(decoded);
}
return "App Installed - OAuth optional for Phase 1.3";
```

---

## 📊 Logs to Look For

### Success Pattern
```json
{"level":"info","message":"Instance signature verified successfully"}
{"level":"info","message":"Successfully decoded Wix instance (2-part format)","instanceId":"921c6868-..."}
{"level":"info","message":"Creating new instance from dashboard access"}
{"level":"info","message":"Instance created successfully"}
```

### Failure Patterns
```json
// Wrong format
{"level":"error","message":"Failed to decode instance parameter","error":"All decoding methods failed"}

// Missing in store (before auto-create fix)
{"level":"warn","message":"Instance not found in store"}
```

---

## 🔄 Evolution Path

### Phase 1.3 (Current) - Dashboard Only
- ✅ Decode instance parameter
- ✅ Auto-create instance record
- ✅ Display dashboard
- ⚠️ OAuth NOT required

### Phase 2+ - API Integration
- 🔜 Add OAuth flow (`/auth/install`, `/auth/callback`)
- 🔜 Store access/refresh tokens
- 🔜 Make API calls to Wix
- 🔜 Token refresh logic

---

## 📚 References

- Wix Instance Parameter Docs: https://dev.wix.com/docs/build-apps/develop-your-app/frameworks/self-hosted-apps/instance-query-parameter
- Wix OAuth Docs: https://dev.wix.com/docs/build-apps/develop-your-app/authentication
- Signature Verification: HMAC-SHA256 with WIX_APP_SECRET

---

## ✅ Validation Checklist

When implementing dashboard in future:

- [ ] Use 2-part format decoder (not standard JWT)
- [ ] Verify signature with HMAC-SHA256
- [ ] Auto-create instance on dashboard access
- [ ] Don't require OAuth for Phase 1.3
- [ ] Show OAuth status as "optional" or "not configured"
- [ ] Don't look for OAuth redirect URL config (it doesn't exist for self-hosted)
- [ ] Put @types/* in dependencies for Render deployment

---

**Last Updated:** January 16, 2026  
**Validated By:** Real production deployment with instance ID `921c6868-d476-43b5-9604-01a473a0ff7a`  
**Working Deployment:** https://wix-ucp-tpa.onrender.com
