# Deployment Guide

## ✅ DEPLOYMENT STATUS: **COMPLETED**

**Your app is already deployed and live!**

- **Production URL**: https://wix-ucp-tpa.onrender.com
- **Dashboard**: https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg
- **Service ID**: srv-d5kv0b7gi27c738espgg
- **Deployed**: 2026-01-16 via Render MCP
- **Status**: ✅ LIVE and healthy

**See `DEPLOYMENT_SUCCESS.md` for complete deployment details.**

---

## 🚀 How It Was Deployed

### Method: Render MCP (Model Context Protocol)

This project was deployed automatically using the Render MCP integration:

1. Used `mcp_render_create_web_service` tool from Cursor
2. Configured with:
   - Service name: wix-ucp-tpa
   - Region: Oregon
   - Plan: Starter
   - Auto-deploy: Enabled
3. Initial build failed (TypeScript deps issue)
4. Fixed dependencies and auto-deployed
5. Build completed in ~47 seconds
6. All endpoints verified working

---

## 🔄 Continuous Deployment (Already Active)

Auto-deploy is **enabled** on the `main` branch. Every push automatically triggers:

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main

# Render automatically:
# 1. Detects push (webhook)
# 2. Runs: npm install && npm run build
# 3. Deploys new version
# 4. Performs health checks
# 5. Routes traffic to new version
```

---

## ✅ Verified Endpoints

All endpoints are working in production:

```bash
# Check API info
curl https://wix-ucp-tpa.onrender.com/

# Check health
curl https://wix-ucp-tpa.onrender.com/health

# Check liveness probe
curl https://wix-ucp-tpa.onrender.com/health/live

# Check readiness probe
curl https://wix-ucp-tpa.onrender.com/health/ready
```

---

## 📊 Monitor Your Deployment

### Render Dashboard
- **Main Dashboard**: https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg
- **Logs**: https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg/logs
- **Metrics**: https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg/metrics
- **Environment**: https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg/env-groups

### What to Monitor
1. **Logs** - Real-time application logs (JSON format in production)
2. **Metrics** - CPU, memory, response times
3. **Deploy History** - All deployments and their status
4. **Events** - Service events and alerts

---

## 🔧 If You Need to Redeploy Manually

### Option 1: Via Dashboard (Fastest)
1. Go to https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for build to complete (~1-2 minutes)

### Option 2: Via Git Push (Automatic)
```bash
# Any push to main triggers auto-deploy
git push origin main
```

### Option 3: Via Render MCP (From Cursor)
Use the Render MCP tools in agent mode to trigger deployments programmatically.

---

## 🆕 Deploying a New Environment

If you want to deploy a separate staging/dev environment:

### Using Render Dashboard
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect: `itayshmool/wix-ucp-tpa`
4. Configure:
   - **Name**: `wix-ucp-tpa-staging`
   - **Branch**: `staging` or `develop`
   - **Region**: Oregon (US West)
   - **Plan**: Starter
5. Add environment variables (same as production)
6. Click **"Create Web Service"**

## 🔧 Troubleshooting

### Build Fails

**Issue**: TypeScript compilation errors

**Solution**: 
```bash
# Test locally first
npm run build
npm start

# Check logs
# Visit: https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg/logs
```

**Common Issues:**
- Missing dependencies in `package.json`
- TypeScript errors in code
- Build command incorrect

**Fix Applied**: We moved TypeScript and type definitions to runtime dependencies (not devDependencies) because Render needs them during build.

### Service Won't Start

**Issue**: Server crashes on startup

**Solution**: 
- Check logs for error messages
- Verify `PORT` environment variable is set (10000)
- Ensure build output exists in `dist/` folder

### Health Check Fails

**Issue**: Health checks timing out

**Solution**: 
- Verify `/health` endpoint responds within 30 seconds
- Check if server is listening on correct port
- Review startup logs for errors

### Deployment Slow

**Issue**: Builds taking longer than expected

**Solution**:
- First deploy after inactivity may take longer (cold start)
- Check if npm install is downloading many packages
- Consider using build cache (available on paid plans)

---

## 🔐 Environment Variables

### Current Variables (Set)
- `NODE_ENV` = `production`
- `LOG_LEVEL` = `info`
- `PORT` = `10000`

### Variables to Add Later (Phase 1.2+)
When you implement Wix integration:
```bash
WIX_APP_ID=your-app-id-from-wix
WIX_APP_SECRET=your-secret-from-wix
WIX_WEBHOOK_PUBLIC_KEY=your-webhook-key
BASE_URL=https://wix-ucp-tpa.onrender.com
```

### How to Add Variables
1. Go to https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg
2. Click **"Environment"** tab
3. Add new environment variables
4. Service will automatically redeploy

## 💰 Cost

**Current Plan**: Starter (Free tier eligible)
- 750 hours/month free (enough for 24/7)
- Automatic SSL certificates
- Automatic deployments from Git
- Health checks and monitoring

**Note**: Free tier services spin down after 15 minutes of inactivity. First request after spin-down takes 30-60 seconds to wake up.

**Upgrade Options** (when needed):
- **Starter Plus** ($7/mo) - No spin-down, better performance
- **Standard** ($25/mo) - More resources, build cache
- **Pro** ($85/mo) - High performance, priority support

---

## 📝 Next Steps

### 1. Configure Wix App
Use your production URL when creating your Wix app:
- **App URL**: `https://wix-ucp-tpa.onrender.com/auth/install`
- **Redirect URL**: `https://wix-ucp-tpa.onrender.com/auth/callback`
- **Webhook URL**: `https://wix-ucp-tpa.onrender.com/webhooks`
- **Dashboard URL**: `https://wix-ucp-tpa.onrender.com/dashboard`

### 2. Add Wix Environment Variables
In Render dashboard, add:
- `WIX_APP_ID`
- `WIX_APP_SECRET`
- `WIX_WEBHOOK_PUBLIC_KEY`
- `BASE_URL=https://wix-ucp-tpa.onrender.com`

### 3. Start Feature Development
Begin implementing Phase 1.1 features:
- Add Wix OAuth flow
- Create webhook handlers
- Build merchant dashboard

See `.cursor/rules/phase-1/` for implementation guides.

---

## 📚 Resources

- **Live App**: https://wix-ucp-tpa.onrender.com
- **Dashboard**: https://dashboard.render.com/web/srv-d5kv0b7gi27c738espgg
- **GitHub**: https://github.com/itayshmool/wix-ucp-tpa
- **Render Docs**: https://render.com/docs
- **Render Status**: https://status.render.com
- **Support**: https://community.render.com

---

**Deployment Date**: 2026-01-16  
**Method**: Render MCP via Cursor  
**Status**: ✅ Live and Operational  
**Last Updated**: 2026-01-16
