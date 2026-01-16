# Quick Start Guide

## 🚀 Deploy Now (5 minutes)

### Step 1: Go to Render.com
Visit: **https://dashboard.render.com**

### Step 2: Create Blueprint
1. Click **"New +"** button
2. Select **"Blueprint"**
3. Connect your GitHub account (if not already)
4. Choose repository: **`itayshmool/wix-ucp-tpa`**
5. Render will detect `render.yaml` automatically
6. Click **"Apply"**

### Step 3: Wait for Deployment
- Build time: ~2-3 minutes
- Render will:
  - Install dependencies
  - Compile TypeScript
  - Start the server
  - Run health checks

### Step 4: Get Your URL
Your app will be available at:
```
https://wix-ucp-tpa.onrender.com
```

### Step 5: Test It
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

## 🎯 After Deployment

Once your app is live:

1. ✅ Save your Render URL
2. ✅ Check the logs in Render dashboard
3. ✅ Verify all health endpoints work
4. 🚀 Start implementing Phase 1.1 features

## 📚 What's Next?

See the implementation guides:
- **Phase 1.1**: `.cursor/rules/phase-1/phase-1.1-project-setup.md`
- **Phase 1.2**: `.cursor/rules/phase-1/phase-1.2-oauth.md`
- **Phase 1.3**: `.cursor/rules/phase-1/phase-1.3-webhooks-dashboard.md`

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
