/**
 * Test UI Routes
 * 
 * Provides a simple web UI for testing the buyer flow:
 * - Browse products
 * - Add to cart
 * - Checkout
 */

import { Router, Request, Response } from 'express';
import { getPocStoreInfo } from '../wix/poc-client.js';

const router = Router();

/**
 * Test Storefront Page
 * GET /test/storefront
 */
router.get('/storefront', (_req: Request, res: Response) => {
  const storeInfo = getPocStoreInfo();
  
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${storeInfo.storeName} - Test Storefront</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    :root {
      --bg-dark: #0f0f0f;
      --bg-card: #1a1a1a;
      --bg-hover: #252525;
      --text-primary: #ffffff;
      --text-secondary: #a0a0a0;
      --accent: #22c55e;
      --accent-hover: #16a34a;
      --border: #2a2a2a;
      --danger: #ef4444;
    }
    
    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      min-height: 100vh;
    }
    
    /* Header */
    header {
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent);
    }
    
    .logo span {
      color: var(--text-secondary);
      font-weight: 400;
      font-size: 0.875rem;
      margin-left: 0.5rem;
    }
    
    .cart-btn {
      background: var(--accent);
      color: var(--bg-dark);
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background 0.2s;
    }
    
    .cart-btn:hover {
      background: var(--accent-hover);
    }
    
    .cart-count {
      background: var(--bg-dark);
      color: var(--accent);
      padding: 0.125rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
    }
    
    /* Main Content */
    main {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    .section-title {
      font-size: 1.25rem;
      margin-bottom: 1.5rem;
      color: var(--text-secondary);
    }
    
    /* Products Grid */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    
    .product-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }
    
    .product-card:hover {
      transform: translateY(-4px);
      border-color: var(--accent);
    }
    
    .product-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      background: var(--bg-hover);
    }
    
    .product-image-placeholder {
      width: 100%;
      height: 200px;
      background: linear-gradient(135deg, var(--bg-hover) 0%, var(--bg-card) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      font-size: 3rem;
    }
    
    .product-info {
      padding: 1.25rem;
    }
    
    .product-name {
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }
    
    .product-price {
      color: var(--accent);
      font-weight: 700;
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
    
    .add-to-cart {
      width: 100%;
      background: transparent;
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 0.75rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .add-to-cart:hover {
      background: var(--accent);
      color: var(--bg-dark);
    }
    
    .add-to-cart:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* Cart Sidebar */
    .cart-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 200;
      display: none;
    }
    
    .cart-overlay.open {
      display: block;
    }
    
    .cart-sidebar {
      position: fixed;
      top: 0;
      right: -400px;
      width: 400px;
      height: 100%;
      background: var(--bg-card);
      z-index: 201;
      transition: right 0.3s ease;
      display: flex;
      flex-direction: column;
    }
    
    .cart-sidebar.open {
      right: 0;
    }
    
    .cart-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .cart-header h2 {
      font-size: 1.25rem;
    }
    
    .close-cart {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.5rem;
      cursor: pointer;
    }
    
    .cart-items {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }
    
    .cart-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-hover);
      border-radius: 8px;
      margin-bottom: 0.75rem;
    }
    
    .cart-item-image {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 6px;
      background: var(--bg-dark);
    }
    
    .cart-item-info {
      flex: 1;
    }
    
    .cart-item-name {
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    
    .cart-item-price {
      color: var(--accent);
      font-weight: 600;
    }
    
    .cart-item-qty {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    
    .cart-item-remove {
      background: none;
      border: none;
      color: var(--danger);
      cursor: pointer;
      font-size: 1.25rem;
    }
    
    .cart-empty {
      text-align: center;
      color: var(--text-secondary);
      padding: 3rem 1rem;
    }
    
    .cart-footer {
      padding: 1.5rem;
      border-top: 1px solid var(--border);
    }
    
    .cart-total {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
      font-size: 1.25rem;
    }
    
    .checkout-btn {
      width: 100%;
      background: var(--accent);
      color: var(--bg-dark);
      border: none;
      padding: 1rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .checkout-btn:hover {
      background: var(--accent-hover);
    }
    
    .checkout-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* Loading States */
    .loading {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }
    
    .spinner {
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Error State */
    .error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--danger);
      color: var(--danger);
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    
    /* Toast */
    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--accent);
      color: var(--bg-dark);
      padding: 1rem 2rem;
      border-radius: 8px;
      font-weight: 600;
      z-index: 300;
      opacity: 0;
      transition: all 0.3s ease;
    }
    
    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    
    /* POC Badge */
    .poc-badge {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.75rem;
      color: var(--text-secondary);
      z-index: 100;
    }
    
    .poc-badge strong {
      color: var(--accent);
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">
      ${storeInfo.storeName}
      <span>POC Test Store</span>
    </div>
    <button class="cart-btn" onclick="toggleCart()">
      🛒 Cart
      <span class="cart-count" id="cart-count">0</span>
    </button>
  </header>
  
  <main>
    <h2 class="section-title">Products</h2>
    <div id="products-container" class="products-grid">
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading products...</p>
      </div>
    </div>
  </main>
  
  <!-- Cart Sidebar -->
  <div class="cart-overlay" id="cart-overlay" onclick="toggleCart()"></div>
  <div class="cart-sidebar" id="cart-sidebar">
    <div class="cart-header">
      <h2>Your Cart</h2>
      <button class="close-cart" onclick="toggleCart()">×</button>
    </div>
    <div class="cart-items" id="cart-items">
      <div class="cart-empty">Your cart is empty</div>
    </div>
    <div class="cart-footer">
      <div class="cart-total">
        <span>Total</span>
        <span id="cart-total">$0.00</span>
      </div>
      <button class="checkout-btn" id="checkout-btn" onclick="checkout()" disabled>
        Proceed to Checkout
      </button>
    </div>
  </div>
  
  <!-- Toast -->
  <div class="toast" id="toast"></div>
  
  <!-- POC Badge -->
  <div class="poc-badge">
    <strong>POC</strong> | UCP Protocol v1.0
  </div>
  
  <script>
    // State
    let products = [];
    let cart = null;
    
    // API Base URL
    const API_BASE = '';
    
    // Load products on page load
    document.addEventListener('DOMContentLoaded', loadProducts);
    
    async function loadProducts() {
      try {
        const response = await fetch(API_BASE + '/ucp/products?limit=20');
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.message);
        }
        
        products = data.products;
        renderProducts();
      } catch (error) {
        document.getElementById('products-container').innerHTML = 
          '<div class="error">Failed to load products: ' + error.message + '</div>';
      }
    }
    
    function renderProducts() {
      const container = document.getElementById('products-container');
      
      if (products.length === 0) {
        container.innerHTML = '<div class="loading"><p>No products found</p></div>';
        return;
      }
      
      container.innerHTML = products.map(product => \`
        <div class="product-card">
          \${product.images && product.images[0] 
            ? \`<img class="product-image" src="\${product.images[0].url}" alt="\${product.name}">\`
            : \`<div class="product-image-placeholder">📦</div>\`
          }
          <div class="product-info">
            <h3 class="product-name">\${product.name}</h3>
            <p class="product-price">\${product.price.formatted}</p>
            <button class="add-to-cart" onclick="addToCart('\${product.id}')" \${!product.available ? 'disabled' : ''}>
              \${product.available ? 'Add to Cart' : 'Out of Stock'}
            </button>
          </div>
        </div>
      \`).join('');
    }
    
    async function addToCart(productId) {
      try {
        showToast('Adding to cart...');
        
        if (!cart) {
          // Create new cart
          const response = await fetch(API_BASE + '/ucp/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: [{ productId, quantity: 1 }]
            })
          });
          cart = await response.json();
        } else {
          // Add to existing cart
          const response = await fetch(API_BASE + '/ucp/cart/' + cart.id + '/items', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: [{ productId, quantity: 1 }]
            })
          });
          cart = await response.json();
        }
        
        if (cart.error) {
          throw new Error(cart.message);
        }
        
        renderCart();
        showToast('Added to cart!');
      } catch (error) {
        showToast('Error: ' + error.message);
      }
    }
    
    function renderCart() {
      const itemsContainer = document.getElementById('cart-items');
      const totalEl = document.getElementById('cart-total');
      const countEl = document.getElementById('cart-count');
      const checkoutBtn = document.getElementById('checkout-btn');
      
      if (!cart || cart.items.length === 0) {
        itemsContainer.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
        totalEl.textContent = '$0.00';
        countEl.textContent = '0';
        checkoutBtn.disabled = true;
        return;
      }
      
      itemsContainer.innerHTML = cart.items.map(item => \`
        <div class="cart-item">
          \${item.image 
            ? \`<img class="cart-item-image" src="\${item.image.url}" alt="\${item.name}">\`
            : \`<div class="cart-item-image" style="display:flex;align-items:center;justify-content:center;">📦</div>\`
          }
          <div class="cart-item-info">
            <div class="cart-item-name">\${item.name}</div>
            <div class="cart-item-price">\${item.price.formatted}</div>
            <div class="cart-item-qty">Qty: \${item.quantity}</div>
          </div>
          <button class="cart-item-remove" onclick="removeFromCart('\${item.id}')">🗑</button>
        </div>
      \`).join('');
      
      totalEl.textContent = cart.totals.total.formatted;
      countEl.textContent = cart.totals.itemCount.toString();
      checkoutBtn.disabled = false;
    }
    
    async function removeFromCart(itemId) {
      try {
        const response = await fetch(API_BASE + '/ucp/cart/' + cart.id + '/items/' + itemId, {
          method: 'DELETE'
        });
        cart = await response.json();
        
        if (cart.error) {
          throw new Error(cart.message);
        }
        
        renderCart();
        showToast('Item removed');
      } catch (error) {
        showToast('Error: ' + error.message);
      }
    }
    
    async function checkout() {
      try {
        const checkoutBtn = document.getElementById('checkout-btn');
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Creating checkout...';
        
        const response = await fetch(API_BASE + '/ucp/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId: cart.id })
        });
        
        const checkout = await response.json();
        
        if (checkout.error) {
          throw new Error(checkout.message);
        }
        
        // Redirect to Wix Hosted Checkout
        window.location.href = checkout.checkoutUrl;
      } catch (error) {
        showToast('Checkout error: ' + error.message);
        const checkoutBtn = document.getElementById('checkout-btn');
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Proceed to Checkout';
      }
    }
    
    function toggleCart() {
      const overlay = document.getElementById('cart-overlay');
      const sidebar = document.getElementById('cart-sidebar');
      overlay.classList.toggle('open');
      sidebar.classList.toggle('open');
    }
    
    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  </script>
</body>
</html>
  `);
});

/**
 * Order Complete Page
 * GET /test/order-complete
 */
router.get('/order-complete', (req: Request, res: Response) => {
  const orderId = req.query.orderId as string;
  
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Complete</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: #0f0f0f;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 3rem;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      max-width: 500px;
    }
    .checkmark {
      width: 80px;
      height: 80px;
      background: #22c55e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      margin: 0 auto 1.5rem;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    p {
      color: #a0a0a0;
      margin-bottom: 1.5rem;
    }
    .order-id {
      background: #252525;
      padding: 1rem;
      border-radius: 8px;
      font-family: monospace;
      margin-bottom: 2rem;
    }
    .back-btn {
      background: #22c55e;
      color: #0f0f0f;
      border: none;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }
    .back-btn:hover {
      background: #16a34a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">✓</div>
    <h1>Order Complete!</h1>
    <p>Thank you for your purchase</p>
    ${orderId ? `<div class="order-id">Order ID: ${orderId}</div>` : ''}
    <a href="/test/storefront" class="back-btn">Continue Shopping</a>
  </div>
</body>
</html>
  `);
});

export default router;
