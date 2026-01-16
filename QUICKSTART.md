# Quick Start Guide - Phase 1.1

## Prerequisites

Before deploying, you need:
1. A Wix Developer account (https://dev.wix.com)
2. A Wix app created in Developer Console
3. Your app credentials (App ID, Secret, Webhook Key)

## 🚀 Deploy to Production (10 minutes)

### Step 1: Go to Render.com
Visit: **https://dashboard.render.com**

### Step 2: Create Blueprint
1. Click **"New +"** button
2. Select **"Blueprint"**
3. Connect your GitHub account (if not already)
4. Choose repository: **`itayshmool/wix-ucp-tpa`**
5. Render will detect `render.yaml` automatically
6. Click **"Apply"**

### Step 3: Set Environment Variables

In Render dashboard, add these environment variables:

```bash
WIX_APP_ID=your-app-id-here
WIX_APP_SECRET=your-app-secret-here
WIX_WEBHOOK_PUBLIC_KEY=your-webhook-key-here
BASE_URL=https://wix-ucp-tpa.onrender.com
```

Get these values from your Wix app in Developer Console.

### Step 4: Wait for Deployment
- Build time: ~2-3 minutes
- Render will:
  - Install dependencies (including axios, jsonwebtoken)
  - Compile TypeScript
  - Start the server
  - Run health checks

### Step 5: Get Your URL
Your app will be available at:
```
https://wix-ucp-tpa.onrender.com
```

### Step 6: Configure Your Wix App

In Wix Developer Console, set these URLs:

1. **OAuth Redirect URI**: `https://wix-ucp-tpa.onrender.com/auth/callback`
2. **Webhook URL**: `https://wix-ucp-tpa.onrender.com/webhooks`
3. **App URL**: `https://wix-ucp-tpa.onrender.com/dashboard`

### Step 7: Test It
```bash
# Test the API
curl https://wix-ucp-tpa.onrender.com/

# Check health
curl https://wix-ucp-tpa.onrender.com/health
```

## ✅ Expected Response

```json
{
  "name": "Wix UCP TPA",
  "version": "0.1.1",
  "description": "Wix Third-Party Application with UCP integration",
  "status": "phase-1.1",
  "phase": "OAuth & Webhooks Enabled",
  "endpoints": {
    "health": "/health",
    "liveness": "/health/live",
    "readiness": "/health/ready",
    "install": "/auth/install",
    "authCallback": "/auth/callback",
    "webhooks": "/webhooks",
    "dashboard": "/dashboard"
  }
}
```

## 🎯 After Deployment

Once your app is live:

1. ✅ Configure Wix app URLs (see Step 6)
2. ✅ Test OAuth flow by installing on a test site
3. ✅ Verify webhook delivery
4. ✅ Check the logs in Render dashboard
5. 🚀 Start implementing Phase 1.2 features

## 📚 What's Next?

Phase 1.1 is complete! Next steps:

1. **Test Your Integration**
   - Install app on a Wix test site
   - Verify OAuth token exchange
   - Check webhook delivery in Render logs
   
2. **Start Phase 1.2**
   - See `.cursor/rules/phase-1/phase-1.2-oauth.md`
   - Advanced OAuth features
   - Token refresh automation
   - Session management

3. **Explore the Dashboard**
   - Visit `https://wix-ucp-tpa.onrender.com/dashboard`
   - View connected instances
   - Monitor OAuth status

## 💡 Tips

- **Free tier**: Your app spins down after 15 min of inactivity
- **First request**: May take 30-60 seconds to wake up
- **Logs**: Available in Render dashboard under "Logs" tab
- **Metrics**: Check CPU/memory usage in "Metrics" tab

## 🆘 Need Help?

- **Deployment Guide**: See `DEPLOY.md` for detailed instructions
- **Project Status**: See `STATUS.md` for current state
- **Architecture**: See `.cursor/rules/00-master-index.md`

---

**Time to deploy**: ~5 minutes  
**Difficulty**: Easy  
**Cost**: Free
