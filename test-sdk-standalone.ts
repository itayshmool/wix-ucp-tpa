/**
 * Standalone test for Wix SDK Client
 * Run with: HEADLESS_CLIENT_ID=xxx npx tsx test-sdk-standalone.ts
 */

import { createClient, OAuthStrategy } from '@wix/sdk';
import { cart, currentCart, checkout } from '@wix/ecom';
import { products, collections } from '@wix/stores';

const HEADLESS_CLIENT_ID = process.env.HEADLESS_CLIENT_ID || 'ae2cf608-a307-49df-9842-438672c92915';

async function testSdk() {
  console.log('🧪 Testing Wix SDK Client (Standalone)...\n');
  console.log(`   Client ID: ${HEADLESS_CLIENT_ID.substring(0, 10)}...\n`);

  try {
    // Create client
    console.log('1. Creating SDK client...');
    const client = createClient({
      modules: { cart, currentCart, checkout, products, collections },
      auth: OAuthStrategy({ clientId: HEADLESS_CLIENT_ID }),
    });
    console.log('   ✅ Client created\n');

    // Test products query
    console.log('2. Querying products...');
    const productsResult = await client.products.queryProducts()
      .limit(3)
      .find();
    
    console.log(`   ✅ Found ${productsResult.items.length} products:`);
    productsResult.items.forEach((p, i) => {
      console.log(`      ${i + 1}. ${p.name} (ID: ${p._id}) - ${p.priceData?.formatted?.price || 'N/A'}`);
    });
    console.log('');

    // Test adding to cart
    if (productsResult.items.length > 0) {
      const firstProduct = productsResult.items[0];
      console.log(`3. Adding "${firstProduct.name}" to cart...`);
      
      const addResult = await client.currentCart.addToCurrentCart({
        lineItems: [{
          catalogReference: {
            catalogItemId: firstProduct._id!,
            appId: '1380b703-ce81-ff05-f115-39571d94dfcd', // Wix Stores
          },
          quantity: 1,
        }],
      });
      
      console.log(`   ✅ Cart updated!`);
      console.log(`   Cart ID: ${addResult.cart?.id}`);
      console.log(`   Line items: ${addResult.cart?.lineItems?.length || 0}`);
      
      if (addResult.cart?.lineItems && addResult.cart.lineItems.length > 0) {
        addResult.cart.lineItems.forEach((item, i) => {
          const name = item.productName?.original || item.productName?.translated || 'Unknown';
          const price = item.price?.formattedAmount || 'N/A';
          console.log(`      ${i + 1}. ${name} x ${item.quantity} = ${price}`);
        });
        console.log(`   Subtotal: ${addResult.cart.subtotal?.formattedAmount}`);
      }

      // Test creating checkout
      if (addResult.cart?.id) {
        console.log(`\n4. Creating checkout from cart...`);
        
        const checkoutResult = await client.checkout.createCheckout({
          lineItems: addResult.cart.lineItems?.map(item => ({
            catalogReference: item.catalogReference!,
            quantity: item.quantity!,
          })) || [],
          channelType: 'WEB',
        });
        
        console.log(`   ✅ Checkout created!`);
        console.log(`   Checkout ID: ${checkoutResult.checkout?._id}`);
        
        // Get checkout URL
        if (checkoutResult.checkout?._id) {
          console.log(`\n5. Getting checkout redirect URL...`);
          const redirectResult = await client.checkout.createCheckoutUrl({
            checkoutId: checkoutResult.checkout._id,
          });
          console.log(`   ✅ Checkout URL: ${redirectResult.checkoutUrl}`);
        }
      }
    }

    console.log('\n✅ All SDK tests passed!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.details) {
      console.error('   Details:', JSON.stringify(error.details, null, 2));
    }
    console.error('\n   Full error:', error);
    process.exit(1);
  }
}

testSdk();
