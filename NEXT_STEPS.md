# 🚀 Next Steps After Phase 1.1

## Current Status

✅ **Code Complete**: Phase 1.1 implementation finished and pushed to GitHub
🔄 **Deployment**: Render auto-deploy in progress
⏳ **Configuration**: Waiting for Wix app setup

## Step-by-Step Action Plan

### 1. Wait for Render Deployment (5-10 minutes)

**Check deployment status:**
```bash
# Monitor in browser
https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg/deploys

# Or check via curl
curl -s https://wix-ucp-tpa.onrender.com/ | grep version
# Should show: "version":"0.1.1" when ready
```

**What Render is doing:**
1. Detecting new commit on main branch ✓
2. Starting new deployment
3. Installing dependencies (npm install)
4. Running TypeScript build (npm run build)
5. Starting server (npm start)
6. Running health checks
7. Switching traffic to new version

### 2. Add Environment Variables to Render

⚠️ **IMPORTANT**: The new deployment will FAIL without Wix environment variables!

**Required Variables:**

Go to: https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg/env-vars

Add these (replace with your actual values):

```bash
WIX_APP_ID=<your-app-id>
WIX_APP_SECRET=<your-app-secret>
WIX_WEBHOOK_PUBLIC_KEY=<your-webhook-key>
BASE_URL=https://wix-ucp-tpa.onrender.com
```

**Where to get these values:**

1. Go to **Wix Developer Console**: https://dev.wix.com/apps
2. Create a new app (or use existing)
3. Navigate to **Settings** → **OAuth**
4. Copy **App ID** and **App Secret**
5. Navigate to **Webhooks** → Copy **Public Key**

**After adding variables:**
- Render will automatically redeploy
- Or click "Manual Deploy" → "Deploy latest commit"

### 3. Configure Your Wix App

Once deployment is successful, configure these URLs in Wix Developer Console:

#### OAuth Settings
```
Redirect URL: https://wix-ucp-tpa.onrender.com/auth/callback
```

#### App URLs
```
App URL: https://wix-ucp-tpa.onrender.com/dashboard
Dashboard URL: https://wix-ucp-tpa.onrender.com/dashboard
```

#### Webhooks
```
Webhook Endpoint: https://wix-ucp-tpa.onrender.com/webhooks
```

**Events to subscribe to:**
- ✅ `app.installed` - App installation
- ✅ `app.removed` - App uninstallation
- ✅ `site.published` - Site goes live
- ✅ `site.unpublished` - Site goes offline

### 4. Test the OAuth Flow

**Steps:**

1. **Create Test Site** (if you don't have one)
   - Go to Wix.com
   - Create a new site (any template)

2. **Install Your App**
   ```
   https://wix-ucp-tpa.onrender.com/auth/install
   ```
   - You'll be redirected to Wix authorization
   - Click "Allow" to authorize

3. **Verify Success**
   - Should redirect to callback endpoint
   - Check Render logs for "OAuth flow completed"
   - Verify instance stored

4. **Check Instance Storage**
   ```bash
   curl https://wix-ucp-tpa.onrender.com/dashboard/instances
   ```
   Should show your installed instance

### 5. Test Webhooks

**Trigger a webhook:**

1. In your Wix test site, click **Publish**
2. This triggers `site.published` webhook
3. Check Render logs:
   ```
   [INFO]: Webhook received
   [INFO]: Processing webhook event
   [INFO]: Webhook event processed successfully
   ```

**Manual webhook test:**
```bash
# Get your webhook signature key
# Send test webhook (Wix provides testing tool in Developer Console)
```

### 6. Monitor & Debug

**Check Render Logs:**
```
https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg/logs
```

**Look for:**
- ✅ Server started successfully
- ✅ No environment validation errors
- ✅ OAuth callbacks processing
- ✅ Webhook events received
- ❌ Any error messages

**Common Issues:**

1. **Build Failure**
   - Check if environment variables are set
   - Verify all dependencies installed
   - Check TypeScript compilation errors

2. **OAuth Fails**
   - Verify `WIX_APP_ID` and `WIX_APP_SECRET` are correct
   - Check redirect URI matches exactly
   - Ensure `BASE_URL` is correct

3. **Webhooks Not Received**
   - Verify webhook URL in Wix console
   - Check `WIX_WEBHOOK_PUBLIC_KEY` is correct
   - Ensure events are subscribed

### 7. Verify All Endpoints

Once deployed, test each endpoint:

```bash
# Root - Should show v0.1.1 with Phase 1.1
curl https://wix-ucp-tpa.onrender.com/

# Health checks
curl https://wix-ucp-tpa.onrender.com/health
curl https://wix-ucp-tpa.onrender.com/health/live
curl https://wix-ucp-tpa.onrender.com/health/ready

# Dashboard (in browser)
open https://wix-ucp-tpa.onrender.com/dashboard

# Webhook health
curl https://wix-ucp-tpa.onrender.com/webhooks/health

# Instance list
curl https://wix-ucp-tpa.onrender.com/dashboard/instances
```

## Quick Commands Reference

```bash
# Check deployment status
curl -s https://wix-ucp-tpa.onrender.com/ | python3 -m json.tool

# Monitor logs (in Render dashboard)
# https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg/logs

# Test OAuth install
open https://wix-ucp-tpa.onrender.com/auth/install

# View dashboard
open https://wix-ucp-tpa.onrender.com/dashboard

# Check instances
curl https://wix-ucp-tpa.onrender.com/dashboard/instances
```

## Success Criteria

Before moving to Phase 1.2, verify:

- [ ] Render deployment successful (v0.1.1 live)
- [ ] All environment variables configured
- [ ] Wix app URLs configured in Developer Console
- [ ] OAuth flow works (can install app)
- [ ] Instance appears in dashboard
- [ ] Webhooks received and processed
- [ ] No errors in Render logs

## Timeline Estimate

- ⏱️ Render deployment: 5-10 minutes
- ⏱️ Environment setup: 5 minutes
- ⏱️ Wix app configuration: 10 minutes
- ⏱️ Testing: 10-15 minutes
- **Total**: ~30-40 minutes

## Need Help?

**Resources:**
- Wix OAuth Docs: https://dev.wix.com/docs/build-apps/build-your-app/authentication/oauth
- Wix Webhooks: https://dev.wix.com/docs/build-apps/build-your-app/webhooks
- Render Docs: https://render.com/docs
- Project Status: `STATUS.md`
- Implementation Guide: `PHASE_1.1_SUMMARY.md`

**Common Questions:**

**Q: Build is failing?**
A: Add environment variables in Render dashboard, then redeploy.

**Q: OAuth redirect fails?**
A: Verify redirect URI in Wix matches exactly: `https://wix-ucp-tpa.onrender.com/auth/callback`

**Q: Webhooks not working?**
A: Check webhook URL and public key. Verify events are subscribed in Wix console.

**Q: Where do I get Wix credentials?**
A: https://dev.wix.com/apps → Select your app → Settings → OAuth & Webhooks

---

## What Happens Next (Phase 1.2)

After successful testing, Phase 1.2 will add:

- ✨ Automatic token refresh
- ✨ Enhanced session management
- ✨ Additional webhook events
- ✨ Wix site API integration
- ✨ Error recovery mechanisms
- ✨ Request logging & analytics

See `.cursor/rules/phase-1/phase-1.2-oauth.md` for details.

---

**Last Updated**: 2026-01-16
**Current Phase**: 1.1 → Deployment & Configuration
**Next Phase**: 1.2 → Advanced OAuth Features
