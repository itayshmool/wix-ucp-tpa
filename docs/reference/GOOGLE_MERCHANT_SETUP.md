# Google Merchant Center Setup Guide

This guide walks you through setting up Google Merchant Center for UCP discovery and running the product sync script.

## Prerequisites

- Google Account
- Google Cloud Console access
- Products in your Wix store

---

## Step 1: Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it something like `popstopdrink-merchant`

## Step 2: Enable Content API for Shopping

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **Content API for Shopping**
3. Click **Enable**

## Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Name: `merchant-sync`
4. Click **Create and Continue**
5. Role: **Editor** (or create custom role with Content API access)
6. Click **Done**

## Step 4: Download Service Account Key

1. Click on the service account you just created
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON**
5. Download and save as `google-merchant-key.json` in your project root
6. **⚠️ Never commit this file to git!**

## Step 5: Set Up Google Merchant Center

1. Go to [Google Merchant Center](https://merchants.google.com/)
2. Sign in with your Google account
3. Complete business setup:
   - Business name: **Pop Stop Drink**
   - Website: **https://www.popstopdrink.com**
4. Verify your website (use Google Analytics or Search Console if possible)
5. Note your **Merchant ID** (shown in top right or account settings)

## Step 6: Link Service Account to Merchant Center

1. In Merchant Center, go to **Settings** → **Account access**
2. Click **Add user**
3. Enter the service account email (looks like `merchant-sync@your-project.iam.gserviceaccount.com`)
4. Set role to **Admin** or **Standard**
5. Click **Add**

---

## Running the Sync Script

### Set Environment Variables

```bash
# Path to your service account key
export GOOGLE_APPLICATION_CREDENTIALS="./google-merchant-key.json"

# Your Merchant Center ID (find in MC settings)
export GOOGLE_MERCHANT_ID="123456789"

# Optional: Override UCP API URL
export UCP_API_BASE="https://wix-ucp-tpa.onrender.com"
```

### Run the Sync

```bash
npx tsx scripts/sync-to-google-merchant.ts
```

### Expected Output

```
🚀 Google Merchant Center Product Sync
=====================================

📍 Merchant ID: 123456789
📍 UCP API: https://wix-ucp-tpa.onrender.com
📍 Store URL: https://www.popstopdrink.com

📦 Fetching products from UCP API...
   Fetched 5 of 5 products
✅ Fetched 5 products total

🔐 Authenticating with Google...
✅ Authenticated

📤 Syncing products to Google Merchant Center...

   ✅ cone crusher
   ✅ Nitro Dr
   ✅ Caramel Clutch
   ✅ Pink Slip
   ✅ Pit Stop Punch

=====================================
📊 Sync Summary
=====================================
   Total products: 5
   ✅ Successful: 5
   ❌ Failed: 0

✨ Sync complete!
```

---

## Automating the Sync

### Option A: Cron Job (Local/Server)

```bash
# Add to crontab - sync every hour
0 * * * * cd /path/to/wix-ucp-tpa && npx tsx scripts/sync-to-google-merchant.ts
```

### Option B: GitHub Actions

Create `.github/workflows/sync-products.yml`:

```yaml
name: Sync Products to Google Merchant
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx tsx scripts/sync-to-google-merchant.ts
        env:
          GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GOOGLE_MERCHANT_KEY }}
          GOOGLE_MERCHANT_ID: ${{ secrets.GOOGLE_MERCHANT_ID }}
```

### Option C: Render Cron Job

Create a cron job in Render that runs the sync script periodically.

---

## Troubleshooting

### "Permission denied" Error
- Make sure the service account email is added to Merchant Center with correct permissions

### "Invalid merchant ID" Error
- Verify your Merchant ID in Merchant Center settings

### "Product rejected" Errors
- Check product data meets Google's requirements:
  - Valid image URLs (publicly accessible)
  - Price must be positive
  - Title/description not empty
  - Valid availability status

### Rate Limits
- The script includes a 100ms delay between products
- For large catalogs (1000+ products), consider using batch API

---

## Next Steps After Sync

1. **Check Merchant Center** for product status
2. **Fix any rejected products** based on error messages
3. **Enable Free Listings** in Merchant Center
4. **Apply for UCP** when available in your region
5. **Monitor** product performance in Merchant Center dashboard

---

## Links

- [Google Merchant Center](https://merchants.google.com/)
- [Content API for Shopping Docs](https://developers.google.com/shopping-content)
- [Product Data Specification](https://support.google.com/merchants/answer/7052112)
- [UCP Documentation](https://ucp.dev/)
