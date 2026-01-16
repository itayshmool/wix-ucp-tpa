/**
 * Google Merchant Center Product Sync Script
 * 
 * Syncs products from our UCP API to Google Merchant Center
 * 
 * Prerequisites:
 * 1. Create a Google Cloud project
 * 2. Enable Content API for Shopping
 * 3. Create a service account and download JSON key
 * 4. Set GOOGLE_APPLICATION_CREDENTIALS env var to the key path
 * 5. Set GOOGLE_MERCHANT_ID env var to your Merchant Center ID
 * 
 * Usage:
 *   npx tsx scripts/sync-to-google-merchant.ts
 */

import { google } from 'googleapis';

// Configuration
const UCP_API_BASE = process.env.UCP_API_BASE || 'https://wix-ucp-tpa.onrender.com';
const MERCHANT_ID = process.env.GOOGLE_MERCHANT_ID;
const STORE_URL = 'https://www.popstopdrink.com';

interface UCPProduct {
  id: string;
  name: string;
  description?: string;
  price: {
    amount: number;
    currency: string;
    formatted: string;
  };
  images: Array<{
    url: string;
    alt?: string;
  }>;
  available: boolean;
  sku?: string;
  slug?: string;
}

interface UCPProductsResponse {
  products: UCPProduct[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface GoogleProduct {
  offerId: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks?: string[];
  contentLanguage: string;
  targetCountry: string;
  feedLabel: string;
  channel: string;
  availability: string;
  condition: string;
  price: {
    value: string;
    currency: string;
  };
  brand?: string;
}

/**
 * Fetch all products from UCP API
 */
async function fetchUCPProducts(): Promise<UCPProduct[]> {
  console.log('📦 Fetching products from UCP API...');
  
  const allProducts: UCPProduct[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${UCP_API_BASE}/ucp/products?limit=${limit}&offset=${offset}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }

    const data: UCPProductsResponse = await response.json();
    allProducts.push(...data.products);
    
    hasMore = data.pagination.hasMore;
    offset += limit;
    
    console.log(`   Fetched ${allProducts.length} of ${data.pagination.total} products`);
  }

  console.log(`✅ Fetched ${allProducts.length} products total\n`);
  return allProducts;
}

/**
 * Transform UCP product to Google Merchant format
 */
function transformToGoogleProduct(ucpProduct: UCPProduct): GoogleProduct {
  const mainImage = ucpProduct.images[0]?.url || '';
  const additionalImages = ucpProduct.images.slice(1).map(img => img.url);
  
  // Create product link - use slug if available, otherwise use ID
  const productPath = ucpProduct.slug || `product/${ucpProduct.id}`;
  const productLink = `${STORE_URL}/${productPath}`;

  return {
    offerId: ucpProduct.id,
    title: ucpProduct.name,
    description: ucpProduct.description || ucpProduct.name,
    link: productLink,
    imageLink: mainImage,
    additionalImageLinks: additionalImages.length > 0 ? additionalImages : undefined,
    contentLanguage: 'en',
    targetCountry: 'US',
    feedLabel: 'US',
    channel: 'online',
    availability: ucpProduct.available ? 'in_stock' : 'out_of_stock',
    condition: 'new',
    price: {
      value: ucpProduct.price.amount.toFixed(2),
      currency: ucpProduct.price.currency,
    },
    brand: 'Pop Stop Drink', // Default brand
  };
}

/**
 * Get authenticated Google API client
 */
async function getGoogleAuthClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/content'],
  });
  return await auth.getClient();
}

/**
 * Sync a single product to Google Merchant Center
 */
async function syncProduct(
  content: any,
  merchantId: string,
  auth: any,
  product: GoogleProduct
): Promise<{ success: boolean; error?: string }> {
  try {
    await content.products.insert({
      merchantId,
      auth,
      requestBody: product,
    });
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Unknown error' 
    };
  }
}

/**
 * Main sync function
 */
async function syncToGoogleMerchant() {
  console.log('🚀 Google Merchant Center Product Sync');
  console.log('=====================================\n');

  // Validate configuration
  if (!MERCHANT_ID) {
    console.error('❌ Error: GOOGLE_MERCHANT_ID environment variable is required');
    console.error('   Set it to your Google Merchant Center ID');
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable is required');
    console.error('   Set it to the path of your service account JSON key file');
    process.exit(1);
  }

  console.log(`📍 Merchant ID: ${MERCHANT_ID}`);
  console.log(`📍 UCP API: ${UCP_API_BASE}`);
  console.log(`📍 Store URL: ${STORE_URL}\n`);

  try {
    // 1. Fetch products from UCP API
    const ucpProducts = await fetchUCPProducts();
    
    if (ucpProducts.length === 0) {
      console.log('⚠️ No products to sync');
      return;
    }

    // 2. Authenticate with Google
    console.log('🔐 Authenticating with Google...');
    const auth = await getGoogleAuthClient();
    const content = google.content('v2.1');
    console.log('✅ Authenticated\n');

    // 3. Transform and sync products
    console.log('📤 Syncing products to Google Merchant Center...\n');
    
    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ product: string; error: string }> = [];

    for (const ucpProduct of ucpProducts) {
      const googleProduct = transformToGoogleProduct(ucpProduct);
      const result = await syncProduct(content, MERCHANT_ID, auth, googleProduct);
      
      if (result.success) {
        successCount++;
        console.log(`   ✅ ${ucpProduct.name}`);
      } else {
        failCount++;
        errors.push({ product: ucpProduct.name, error: result.error || 'Unknown' });
        console.log(`   ❌ ${ucpProduct.name}: ${result.error}`);
      }

      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 4. Summary
    console.log('\n=====================================');
    console.log('📊 Sync Summary');
    console.log('=====================================');
    console.log(`   Total products: ${ucpProducts.length}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    
    if (errors.length > 0) {
      console.log('\n📋 Errors:');
      errors.forEach(e => console.log(`   - ${e.product}: ${e.error}`));
    }

    console.log('\n✨ Sync complete!');

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncToGoogleMerchant();
