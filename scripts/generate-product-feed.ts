/**
 * Generate Google Merchant Center Product Feed
 * 
 * Creates a TSV (Tab-Separated Values) file that can be uploaded
 * directly to Google Merchant Center - NO Google Cloud setup required!
 * 
 * Usage:
 *   npx tsx scripts/generate-product-feed.ts
 * 
 * Output:
 *   products-feed.tsv (upload this to Merchant Center)
 * 
 * Reference: https://support.google.com/merchants/answer/12631822
 */

import * as fs from 'fs';

// Configuration
const UCP_API_BASE = process.env.UCP_API_BASE || 'https://wix-ucp-tpa.onrender.com';
const STORE_URL = 'https://www.popstopdrink.com';
const OUTPUT_FILE = 'products-feed.tsv';

interface UCPProduct {
  id: string;
  name: string;
  description?: string;
  price: {
    amount: number;
    currency: string;
    formatted: string;  // e.g., "$4.00"
  };
  images: Array<{
    url: string;
    alt?: string;
  }>;
  available: boolean;
  sku?: string;
  slug?: string;
}

/**
 * Parse price from formatted string (e.g., "$4.00" -> 4.00)
 */
function parsePriceFromFormatted(formatted: string): number {
  // Remove currency symbols and parse
  const match = formatted.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Strip HTML tags from string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .replace(/&amp;/g, '&')   // Decode &amp;
    .replace(/&lt;/g, '<')    // Decode &lt;
    .replace(/&gt;/g, '>')    // Decode &gt;
    .replace(/&quot;/g, '"')  // Decode &quot;
    .replace(/&#39;/g, "'")   // Decode &#39;
    .trim();
}

interface UCPProductsResponse {
  products: UCPProduct[];
  pagination: {
    total: number;
    hasMore: boolean;
  };
}

/**
 * Fetch all products from UCP API
 */
async function fetchProducts(): Promise<UCPProduct[]> {
  console.log('📦 Fetching products from UCP API...');
  
  const response = await fetch(`${UCP_API_BASE}/ucp/products?limit=100`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const data: UCPProductsResponse = await response.json();
  console.log(`✅ Fetched ${data.products.length} products\n`);
  return data.products;
}

/**
 * Escape TSV field (handle tabs, newlines, quotes)
 */
function escapeTSV(value: string): string {
  if (!value) return '';
  // Replace tabs and newlines, trim whitespace
  return value
    .replace(/\t/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .trim();
}

/**
 * Generate TSV content for Google Merchant Center
 */
function generateTSV(products: UCPProduct[]): string {
  // Header row - required attributes for Google Merchant Center
  const headers = [
    'id',
    'title', 
    'description',
    'link',
    'image_link',
    'price',
    'availability',
    'condition',
    'brand',
  ];

  const rows: string[] = [headers.join('\t')];

  for (const product of products) {
    const productLink = product.slug 
      ? `${STORE_URL}/product-page/${product.slug}`
      : `${STORE_URL}/product-page/${product.id}`;

    // Get price - use formatted if amount is 0
    const priceAmount = product.price.amount > 0 
      ? product.price.amount 
      : parsePriceFromFormatted(product.price.formatted);
    
    const row = [
      escapeTSV(product.id),                                    // id
      escapeTSV(product.name),                                  // title
      escapeTSV(stripHtml(product.description || product.name)), // description (stripped HTML)
      productLink,                                               // link
      product.images[0]?.url || '',                             // image_link
      `${priceAmount.toFixed(2)} ${product.price.currency}`,    // price (format: "4.00 USD")
      product.available ? 'in_stock' : 'out_of_stock',          // availability
      'new',                                                     // condition
      'Pop Stop Drink',                                          // brand
    ];

    rows.push(row.join('\t'));
  }

  return rows.join('\n');
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Google Merchant Center Product Feed Generator');
  console.log('================================================\n');

  try {
    // 1. Fetch products
    const products = await fetchProducts();
    
    if (products.length === 0) {
      console.log('⚠️ No products found');
      return;
    }

    // 2. Generate TSV
    console.log('📝 Generating product feed...');
    const tsv = generateTSV(products);

    // 3. Write file
    fs.writeFileSync(OUTPUT_FILE, tsv, 'utf-8');
    console.log(`✅ Created: ${OUTPUT_FILE}\n`);

    // 4. Show preview
    console.log('📋 Preview (first 3 products):');
    console.log('─'.repeat(60));
    const lines = tsv.split('\n').slice(0, 4);
    lines.forEach(line => {
      const cols = line.split('\t');
      console.log(`  ${cols[0].padEnd(40)} | ${cols[1]?.substring(0, 20) || ''}`);
    });
    console.log('─'.repeat(60));

    // 5. Instructions
    console.log('\n📤 Next Steps:');
    console.log('1. Go to: https://merchants.google.com/');
    console.log('2. Click: Products → Add products → Upload products from a file');
    console.log(`3. Upload: ${OUTPUT_FILE}`);
    console.log('4. Done! Google will review your products.\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
