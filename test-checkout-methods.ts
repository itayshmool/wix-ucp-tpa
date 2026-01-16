/**
 * Test script to discover checkout methods
 */

import { checkout } from '@wix/ecom';

console.log('Checkout module methods:');
console.log(Object.keys(checkout).filter(k => typeof (checkout as any)[k] === 'function'));
