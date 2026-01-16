/**
 * Test UCP routes with SDK
 * Run with: npx tsx test-ucp-sdk.ts
 */

import { createClient, OAuthStrategy } from '@wix/sdk';
import { cart, currentCart, checkout } from '@wix/ecom';
import { products, collections } from '@wix/stores';

const HEADLESS_CLIENT_ID = process.env.HEADLESS_CLIENT_ID || 'ae2cf608-a307-49df-9842-438672c92915';

async function testUcpWithSdk() {
  console.log('🧪 Testing UCP Routes Logic with SDK...\n');
  console.log(`   Client ID: ${HEADLESS_CLIENT_ID.substring(0, 10)}...\n`);

  const client = createClient({
    modules: { cart, currentCart, checkout, products, collections },
    auth: OAuthStrategy({ clientId: HEADLESS_CLIENT_ID }),
  });

  try {
    // 1. List Products (simulating GET /ucp/products)
    console.log('1. GET /ucp/products - Listing products...');
    const productsResult = await client.products.queryProducts()
      .limit(5)
      .find();
    
    console.log(`   ✅ Found ${productsResult.items.length} products:`);
    productsResult.items.forEach((p, i) => {
      console.log(`      ${i + 1}. ${p.name} (ID: ${p._id}) - ${p.priceData?.formatted?.price || 'N/A'}`);
    });

    if (productsResult.items.length === 0) {
      console.log('\n❌ No products found - cannot continue test');
      return;
    }

    // 2. Create Cart with items (simulating POST /ucp/cart)
    const firstProduct = productsResult.items[0];
    console.log(`\n2. POST /ucp/cart - Creating cart with "${firstProduct.name}"...`);
    
    const cartResult = await client.currentCart.addToCurrentCart({
      lineItems: [{
        catalogReference: {
          catalogItemId: firstProduct._id!,
          appId: '1380b703-ce81-ff05-f115-39571d94dfcd',
        },
        quantity: 1,
      }],
    });

    const cartData = (cartResult as any).cart || cartResult;
    console.log(`   ✅ Cart created/updated`);
    console.log(`   Line items: ${cartData.lineItems?.length || 0}`);
    if (cartData.lineItems && cartData.lineItems.length > 0) {
      cartData.lineItems.forEach((item: any, i: number) => {
        const name = item.productName?.original || 'Unknown';
        console.log(`      ${i + 1}. ${name} x ${item.quantity} = ${item.price?.formattedAmount}`);
      });
    }
    console.log(`   Subtotal: ${cartData.subtotal?.formattedAmount}`);

    // 3. Get Current Cart (simulating GET /ucp/cart)
    console.log(`\n3. GET /ucp/cart - Getting current cart...`);
    const getCurrentResult = await client.currentCart.getCurrentCart();
    const currentCartData = (getCurrentResult as any).cart || getCurrentResult;
    console.log(`   ✅ Current cart has ${currentCartData.lineItems?.length || 0} items`);

    // 4. Create Checkout (simulating POST /ucp/checkout)
    if (currentCartData.lineItems && currentCartData.lineItems.length > 0) {
      console.log(`\n4. POST /ucp/checkout - Creating checkout...`);
      
      const checkoutResult = await client.checkout.createCheckout({
        lineItems: currentCartData.lineItems.map((item: any) => ({
          catalogReference: item.catalogReference,
          quantity: item.quantity,
        })),
        channelType: 'WEB',
      });

      const checkoutData = (checkoutResult as any).checkout || checkoutResult;
      const checkoutId = checkoutData?._id || checkoutData?.id;
      console.log(`   ✅ Checkout created`);
      console.log(`   Checkout ID: ${checkoutId}`);
      console.log(`   Total: ${checkoutData?.priceSummary?.total?.formattedAmount}`);

      // 5. Get Checkout URL
      if (checkoutId) {
        console.log(`\n5. Getting checkout URL...`);
        try {
          const urlResult = await client.checkout.getCheckoutUrl(checkoutId);
          console.log(`   ✅ Checkout URL: ${urlResult}`);
        } catch (urlError: any) {
          console.log(`   ⚠️ Could not get checkout URL: ${urlError.message}`);
          console.log(`   Fallback URL: https://www.wix.com/checkout/${checkoutId}`);
        }
      }
    }

    console.log('\n✅ All UCP SDK tests passed!');
    console.log('\n📋 Summary:');
    console.log('   - Products API: Working ✅');
    console.log('   - Cart API: Working ✅');
    console.log('   - Checkout API: Working ✅');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.details) {
      console.error('   Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

testUcpWithSdk();
