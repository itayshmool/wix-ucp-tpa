/**
 * Test script for Wix SDK Client
 * Run with: npx tsx test-sdk-client.ts
 */

import { createWixSdkClient } from './src/wix/sdk-client.js';

async function testSdkClient() {
  console.log('🧪 Testing Wix SDK Client...\n');

  try {
    // Create client
    console.log('1. Creating SDK client...');
    const client = createWixSdkClient();
    console.log('   ✅ Client created successfully\n');

    // Test products query
    console.log('2. Querying products...');
    const productsResult = await client.products.queryProducts()
      .limit(3)
      .find();
    
    console.log(`   ✅ Found ${productsResult.items.length} products:`);
    productsResult.items.forEach((p, i) => {
      console.log(`      ${i + 1}. ${p.name} - ${p.priceData?.formatted?.price || 'N/A'}`);
    });
    console.log('');

    // Test current cart operations
    console.log('3. Testing cart operations...');
    
    // Get or create current cart
    const currentCartResult = await client.currentCart.getCurrentCart();
    console.log(`   ✅ Current cart ID: ${currentCartResult.cart?.id || 'No cart yet'}`);
    
    // If we have products, try adding one to cart
    if (productsResult.items.length > 0) {
      const firstProduct = productsResult.items[0];
      console.log(`\n4. Adding product to cart: ${firstProduct.name}`);
      
      const addResult = await client.currentCart.addToCurrentCart({
        lineItems: [{
          catalogReference: {
            catalogItemId: firstProduct._id!,
            appId: '1380b703-ce81-ff05-f115-39571d94dfcd', // Wix Stores App ID
          },
          quantity: 1,
        }],
      });
      
      console.log(`   ✅ Cart updated!`);
      console.log(`   Cart ID: ${addResult.cart?.id}`);
      console.log(`   Items: ${addResult.cart?.lineItems?.length || 0}`);
      
      if (addResult.cart?.lineItems && addResult.cart.lineItems.length > 0) {
        addResult.cart.lineItems.forEach((item, i) => {
          console.log(`      ${i + 1}. ${item.productName?.original || 'Unknown'} x ${item.quantity}`);
        });
      }
    }

    console.log('\n✅ All SDK tests passed!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.details) {
      console.error('   Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

testSdkClient();
