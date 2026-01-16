# Configuration Guide - Wix UCP TPA

## ⚠️ CRITICAL: Deployment Will Fail Without These Steps!

Your Phase 1.1 code requires Wix environment variables. The current Render deployment **WILL FAIL** because these are not configured yet.

## 🚨 Immediate Action Required

### Step 1: Get Wix Credentials (5 minutes)

1. **Go to Wix Developer Console**
   - Visit: https://dev.wix.com/apps
   - Sign in with your Wix account

2. **Create or Select Your App**
   - Click "Create New App" (or select existing)
   - Name it: "UCP TPA" (or your preferred name)
   - Category: eCommerce (or relevant)

3. **Get OAuth Credentials**
   - Navigate to **Settings** → **OAuth**
   - Copy **App ID** (looks like: `12345678-abcd-1234-abcd-123456789012`)
   - Copy **App Secret** (keep this secure!)

4. **Get Webhook Key**
   - Navigate to **Webhooks**
   - Copy **Public Key** (used for signature verification)

### Step 2: Configure Render Environment (2 minutes)

**Go to Render Dashboard:**
https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg/env-vars

**Add These Variables:**

| Variable Name | Value | Example |
|--------------|--------|---------|
| `WIX_APP_ID` | From Wix OAuth settings | `12345678-abcd-1234-abcd-123456789012` |
| `WIX_APP_SECRET` | From Wix OAuth settings | `ABCD-1234-EFGH-5678` |
| `WIX_WEBHOOK_PUBLIC_KEY` | From Wix Webhooks settings | `-----BEGIN PUBLIC KEY-----\n...` |
| `BASE_URL` | Your Render URL | `https://wix-ucp-tpa.onrender.com` |

**After adding variables:**
- Render will automatically trigger a new deployment
- This deployment should succeed
- Wait 3-5 minutes for deployment to complete

### Step 3: Configure Wix App URLs (3 minutes)

Back in Wix Developer Console, configure these URLs:

**OAuth Settings:**
```
Redirect URL: https://wix-ucp-tpa.onrender.com/auth/callback
```

**App Settings:**
```
App URL: https://wix-ucp-tpa.onrender.com/dashboard
```

**Webhook Settings:**
```
Endpoint URL: https://wix-ucp-tpa.onrender.com/webhooks
```

**Subscribe to Events:**
- [x] `app.installed`
- [x] `app.removed`
- [x] `site.published`
- [x] `site.unpublished`

### Step 4: Verify Deployment (2 minutes)

Once Render finishes deploying:

```bash
# Check version (should show 0.1.1)
curl https://wix-ucp-tpa.onrender.com/

# Check health
curl https://wix-ucp-tpa.onrender.com/health

# View dashboard in browser
open https://wix-ucp-tpa.onrender.com/dashboard
```

**Expected Response:**
```json
{
  "name": "Wix UCP TPA",
  "version": "0.1.1",
  "status": "phase-1.1",
  "phase": "OAuth & Webhooks Enabled",
  "endpoints": {
    "health": "/health",
    "install": "/auth/install",
    "webhooks": "/webhooks",
    "dashboard": "/dashboard"
  }
}
```

## 🧪 Testing Your Integration

### Test 1: OAuth Flow

1. **Initiate Installation:**
   ```
   https://wix-ucp-tpa.onrender.com/auth/install
   ```

2. **Authorize on Wix:**
   - You'll be redirected to Wix
   - Click "Allow" to authorize

3. **Verify Success:**
   ```bash
   # Check stored instances
   curl https://wix-ucp-tpa.onrender.com/dashboard/instances
   ```

4. **Check Render Logs:**
   - Go to: https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg/logs
   - Look for: "OAuth flow completed successfully"

### Test 2: Webhooks

1. **In your Wix site, click Publish**

2. **Check Render Logs:**
   ```
   [INFO]: Webhook received
   [INFO]: Site published webhook received
   [INFO]: Webhook event processed successfully
   ```

3. **Test Webhook Endpoint:**
   ```bash
   curl https://wix-ucp-tpa.onrender.com/webhooks/health
   ```

## 🎯 Local Development Setup

For local testing with real Wix integration:

1. **Install ngrok:**
   ```bash
   brew install ngrok  # macOS
   # or download from https://ngrok.com
   ```

2. **Create local .env file:**
   ```bash
   cat > .env << 'EOF'
   PORT=3000
   NODE_ENV=development
   LOG_LEVEL=debug
   WIX_APP_ID=your-app-id-here
   WIX_APP_SECRET=your-app-secret-here
   WIX_WEBHOOK_PUBLIC_KEY=your-webhook-key-here
   BASE_URL=http://localhost:3000
   EOF
   ```

3. **Start ngrok tunnel:**
   ```bash
   ngrok http 3000
   ```

4. **Update BASE_URL in .env:**
   ```bash
   BASE_URL=https://your-ngrok-url.ngrok.io
   ```

5. **Update Wix Console URLs:**
   - Use ngrok URL instead of Render URL
   - Redirect: `https://your-ngrok-url.ngrok.io/auth/callback`
   - Webhook: `https://your-ngrok-url.ngrok.io/webhooks`

6. **Start dev server:**
   ```bash
   npm run dev
   ```

## 📊 Current Deployment Status

**Check Build Status:**
https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg/deploys

**Latest Commit:** `9fafe05` (Phase 1.1 complete)

**What's Happening:**
1. Render detected new commit ✓
2. Starting deployment...
3. Will fail without env vars ⚠️
4. Need to add env vars (see Step 2)
5. New deployment will trigger automatically
6. Should succeed with env vars ✓

## 🔍 Troubleshooting

### Deployment Fails with "Invalid environment variables"

**Cause:** Missing or incorrect Wix environment variables

**Solution:**
1. Go to Render env vars
2. Verify all 4 Wix variables are set
3. Check for typos in variable names
4. Trigger manual deploy

### OAuth Flow Returns 401

**Cause:** Incorrect App ID or Secret

**Solution:**
1. Verify `WIX_APP_ID` and `WIX_APP_SECRET` in Render
2. Copy again from Wix console (check for spaces)
3. Redeploy

### Webhooks Not Received

**Cause:** Wrong webhook URL or public key

**Solution:**
1. Verify webhook URL in Wix: `https://wix-ucp-tpa.onrender.com/webhooks`
2. Check `WIX_WEBHOOK_PUBLIC_KEY` in Render
3. Ensure events are subscribed in Wix console
4. Test with manual webhook in Wix console

### "Cannot find module" errors

**Cause:** Build issue or dependencies not installed

**Solution:**
1. Check Render build logs
2. Verify package.json is committed
3. Trigger clean build in Render

## 📞 Getting Help

**Wix Resources:**
- Developer Console: https://dev.wix.com/apps
- OAuth Docs: https://dev.wix.com/docs/build-apps/build-your-app/authentication/oauth
- Webhooks Docs: https://dev.wix.com/docs/build-apps/build-your-app/webhooks
- Community: https://www.wix.com/velo/forum

**Render Resources:**
- Dashboard: https://dashboard.render.com
- Docs: https://render.com/docs
- Support: https://render.com/support

## ✅ Success Checklist

Before proceeding to Phase 1.2:

- [ ] Wix app created in Developer Console
- [ ] All 4 environment variables set in Render
- [ ] Render deployment successful (v0.1.1 live)
- [ ] OAuth redirect URI configured in Wix
- [ ] Webhook URL configured in Wix
- [ ] Webhook events subscribed
- [ ] OAuth flow tested successfully
- [ ] Instance appears in dashboard
- [ ] Webhooks received and logged
- [ ] No errors in production logs

---

**Priority:** 🔴 HIGH - Complete configuration to proceed
**Time Required:** ~15 minutes
**Next:** Test integration → Begin Phase 1.2
