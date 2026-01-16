# Deployment Guide

## 🚀 Deploy to Render.com

### Prerequisites
- [x] GitHub account
- [x] Render.com account (sign up at https://render.com)
- [x] Code pushed to GitHub

### Step 1: Push to GitHub

```bash
# Code is ready - push to GitHub
git push origin main
```

### Step 2: Deploy on Render.com

#### Option A: Using Blueprint (Recommended)

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository: `itayshmool/wix-ucp-tpa`
4. Render will automatically detect `render.yaml`
5. Click **"Apply"**
6. Wait for deployment (~2-3 minutes)

#### Option B: Manual Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `wix-ucp-tpa`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Add environment variables:
   - `NODE_ENV` = `production`
   - `LOG_LEVEL` = `info`
   - `PORT` = `10000`
6. Click **"Create Web Service"**

### Step 3: Verify Deployment

Once deployed, you'll get a URL like: `https://wix-ucp-tpa.onrender.com`

Test the endpoints:

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

Expected responses:

**GET /**
```json
{
  "name": "Wix UCP TPA",
  "version": "0.1.0",
  "description": "Wix Third-Party Application with UCP integration",
  "status": "bootstrap",
  "endpoints": {
    "health": "/health",
    "liveness": "/health/live",
    "readiness": "/health/ready"
  }
}
```

**GET /health**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-16T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### Step 4: Monitor Your Deployment

1. Go to your service dashboard on Render
2. Check the **"Logs"** tab for structured JSON logs
3. Monitor the **"Metrics"** tab for CPU/memory usage
4. Set up alerts in **"Settings"** → **"Notifications"**

## 🔧 Troubleshooting

### Build Fails

**Issue**: TypeScript compilation errors

**Solution**: 
```bash
# Run locally first
npm run build
npm start
```

### Service Won't Start

**Issue**: Port already in use

**Solution**: Render automatically uses `PORT` from environment (10000)

### Health Check Fails

**Issue**: `/health` endpoint not responding

**Solution**: 
- Check logs for startup errors
- Verify `PORT` environment variable is set
- Ensure build completed successfully

## 📊 Next Steps After Deployment

1. ✅ Verify all health check endpoints work
2. ✅ Review logs in Render dashboard
3. ✅ Note your deployment URL for Wix app configuration
4. 🚀 Start implementing Phase 1.1 features
5. 🚀 Configure Wix app with your Render URL

## 🔄 Continuous Deployment

Render automatically redeploys when you push to `main`:

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main

# Render automatically:
# 1. Detects push
# 2. Runs build
# 3. Deploys new version
# 4. Performs health checks
```

## 💰 Cost

**Free Tier Includes:**
- 750 hours/month (enough for 1 service running 24/7)
- Automatic SSL certificates
- Automatic deployments from Git
- Health checks and monitoring

**Note**: Free tier services spin down after 15 minutes of inactivity and may take 30-60 seconds to spin back up on first request.

## 🔐 Security Checklist

- [x] `.env` is in `.gitignore`
- [x] No secrets in code
- [x] Environment variables set in Render dashboard
- [x] HTTPS enabled by default
- [ ] Add secrets when implementing Wix integration (Phase 1.2)

## 📝 Render.com Resources

- **Dashboard**: https://dashboard.render.com
- **Docs**: https://render.com/docs
- **Status**: https://status.render.com
- **Support**: https://community.render.com
