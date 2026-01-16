/**
 * Test to check checkout URL format
 */

import { createClient, OAuthStrategy } from '@wix/sdk';
import { checkout } from '@wix/ecom';
import { products } from '@wix/stores';

const HEADLESS_CLIENT_ID = 'ae2cf608-a307-49df-9842-438672c92915';

async function testCheckoutUrl() {
  const client = createClient({
    modules: { checkout, products },
    auth: OAuthStrategy({ clientId: HEADLESS_CLIENT_ID }),
  });

  // Get a product first
  const productsResult = await client.products.queryProducts().limit(1).find();
  const product = productsResult.items[0];

  // Create checkout
  const checkoutResult = await client.checkout.createCheckout({
    lineItems: [{
      catalogReference: {
        catalogItemId: product._id!,
        appId: '1380b703-ce81-ff05-f115-39571d94dfcd',
      },
      quantity: 1,
    }],
    channelType: 'WEB',
  });

  const checkoutData = (checkoutResult as any).checkout || checkoutResult;
  const checkoutId = checkoutData?._id || checkoutData?.id;

  console.log('Checkout ID:', checkoutId);
  console.log('\nGetting checkout URL...');
  
  const urlResult = await client.checkout.getCheckoutUrl(checkoutId);
  console.log('\nURL Result type:', typeof urlResult);
  console.log('URL Result:', JSON.stringify(urlResult, null, 2));
  console.log('\nURL Result keys:', Object.keys(urlResult as any));
  
  // Try to get the actual URL
  const url = (urlResult as any).checkoutUrl || (urlResult as any).url || urlResult;
  console.log('\nExtracted URL:', url);
}

testCheckoutUrl().catch(console.error);
