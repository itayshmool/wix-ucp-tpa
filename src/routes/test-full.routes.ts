/**
 * Full Test UI Routes
 * 
 * A comprehensive test UI showcasing all UCP capabilities:
 * - Products browsing
 * - Cart management
 * - Orders & Fulfillment (Phase 7, 9)
 * - Discounts/Coupons (Phase 10)
 * - Payment Handlers (Phase 11)
 * - Webhook Management (Phase 9)
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Full Test UI
 * GET /test/full
 */
router.get('/full', (_req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UCP Full Test UI - Pop Stop Drinks</title>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --surface-2: #1a1a24;
      --border: #2a2a3a;
      --text: #e8e8ec;
      --text-muted: #8888a0;
      --accent: #6366f1;
      --accent-2: #8b5cf6;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    
    body {
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }
    
    /* Header */
    header {
      background: var(--surface);
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
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .logo span {
      font-size: 0.75rem;
      background: var(--success);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      margin-left: 0.5rem;
      -webkit-text-fill-color: white;
    }
    
    /* Navigation */
    nav {
      display: flex;
      gap: 0.5rem;
    }
    
    .nav-btn {
      padding: 0.75rem 1.25rem;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }
    
    .nav-btn:hover {
      background: var(--surface-2);
      border-color: var(--accent);
    }
    
    .nav-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }
    
    .nav-btn .badge {
      position: absolute;
      top: -6px;
      right: -6px;
      background: var(--success);
      color: white;
      font-size: 0.625rem;
      padding: 2px 6px;
      border-radius: 4px;
    }
    
    .nav-btn .count {
      background: var(--danger);
      color: white;
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 999px;
      margin-left: 0.5rem;
    }
    
    /* Main */
    main {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    /* Tabs Content */
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    /* Cards */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    .card-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    /* Grid */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
    }
    
    @media (max-width: 768px) {
      .grid-2, .grid-3 {
        grid-template-columns: 1fr;
      }
    }
    
    /* Buttons */
    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      border: none;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: white;
    }
    
    .btn-primary:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    
    .btn-success {
      background: var(--success);
      color: white;
    }
    
    .btn-danger {
      background: var(--danger);
      color: white;
    }
    
    .btn-outline {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
    }
    
    .btn-outline:hover {
      border-color: var(--accent);
      background: var(--surface-2);
    }
    
    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* Inputs */
    .input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-family: inherit;
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }
    
    .input:focus {
      outline: none;
      border-color: var(--accent);
    }
    
    .input::placeholder {
      color: var(--text-muted);
    }
    
    .input-group {
      display: flex;
      gap: 0.5rem;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    .form-label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    /* Products */
    .product-card {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.2s;
    }
    
    .product-card:hover {
      border-color: var(--accent);
      transform: translateY(-4px);
    }
    
    .product-image {
      width: 100%;
      height: 160px;
      object-fit: cover;
      background: var(--bg);
    }
    
    .product-info {
      padding: 1rem;
    }
    
    .product-name {
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    
    .product-price {
      color: var(--success);
      font-weight: 700;
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
    
    /* Cart */
    .cart-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: var(--surface-2);
      border-radius: 8px;
      margin-bottom: 0.75rem;
      align-items: center;
    }
    
    .cart-item-image {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 6px;
      background: var(--bg);
    }
    
    .cart-item-info {
      flex: 1;
    }
    
    .cart-item-name {
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    
    .cart-item-price {
      color: var(--success);
      font-weight: 600;
    }
    
    .cart-item-qty {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .qty-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text);
      cursor: pointer;
      font-size: 1rem;
    }
    
    .qty-btn:hover {
      border-color: var(--accent);
    }
    
    /* Orders */
    .order-card {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1rem;
      transition: border-color 0.2s;
    }
    
    .order-card:hover {
      border-color: var(--accent);
    }
    
    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    
    .order-id {
      font-family: monospace;
      color: var(--accent);
      font-weight: 600;
    }
    
    .status {
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .status-paid {
      background: rgba(34, 197, 94, 0.2);
      color: var(--success);
    }
    
    .status-shipped {
      background: rgba(99, 102, 241, 0.2);
      color: var(--accent);
    }
    
    .status-delivered {
      background: rgba(139, 92, 246, 0.2);
      color: var(--accent-2);
    }
    
    .status-pending {
      background: rgba(245, 158, 11, 0.2);
      color: var(--warning);
    }
    
    /* Timeline */
    .timeline {
      position: relative;
      padding-left: 2rem;
    }
    
    .timeline::before {
      content: '';
      position: absolute;
      left: 0.5rem;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--border);
    }
    
    .timeline-item {
      position: relative;
      padding-bottom: 1.5rem;
    }
    
    .timeline-item::before {
      content: '';
      position: absolute;
      left: -1.5rem;
      top: 0.25rem;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--border);
    }
    
    .timeline-item.completed::before {
      background: var(--success);
    }
    
    .timeline-item.current::before {
      background: var(--accent);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.3);
    }
    
    .timeline-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    .timeline-date {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    /* Payment Handler */
    .payment-option {
      background: var(--surface-2);
      border: 2px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 1rem;
    }
    
    .payment-option:hover {
      border-color: var(--accent);
    }
    
    .payment-option.selected {
      border-color: var(--accent);
      background: rgba(99, 102, 241, 0.1);
    }
    
    .payment-option.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .payment-header {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .payment-icon {
      width: 48px;
      height: 48px;
      background: var(--bg);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    
    .payment-name {
      font-weight: 600;
    }
    
    .payment-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    /* Coupon */
    .coupon-applied {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid var(--success);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .coupon-code {
      font-family: monospace;
      color: var(--success);
      font-weight: 700;
    }
    
    /* Instrument Card */
    .instrument-card {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }
    
    .instrument-card::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
    }
    
    .instrument-brand {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 1rem;
    }
    
    .instrument-number {
      font-family: monospace;
      font-size: 1.5rem;
      letter-spacing: 0.25rem;
      margin-bottom: 1.5rem;
    }
    
    .instrument-footer {
      display: flex;
      justify-content: space-between;
    }
    
    .instrument-label {
      font-size: 0.625rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    
    .instrument-value {
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    /* Webhook */
    .webhook-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--surface-2);
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }
    
    .webhook-event {
      font-family: monospace;
      color: var(--accent);
      font-size: 0.875rem;
    }
    
    .webhook-url {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    /* Event Checkbox */
    .event-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .event-checkbox:hover {
      border-color: var(--accent);
    }
    
    .event-checkbox.checked {
      background: rgba(99, 102, 241, 0.2);
      border-color: var(--accent);
    }
    
    .event-checkbox input {
      accent-color: var(--accent);
    }
    
    /* Test Cards */
    .test-card-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.875rem;
    }
    
    .test-card-row:last-child {
      border-bottom: none;
    }
    
    .test-card-row code {
      font-family: monospace;
      color: var(--accent);
    }
    
    /* Summary */
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
    }
    
    .summary-row.discount {
      color: var(--success);
    }
    
    .summary-row.total {
      font-size: 1.25rem;
      font-weight: 700;
      border-top: 1px solid var(--border);
      margin-top: 0.5rem;
      padding-top: 1rem;
    }
    
    /* Toast */
    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 1rem 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      opacity: 0;
      transition: all 0.3s ease;
    }
    
    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    
    .toast.success {
      border-color: var(--success);
    }
    
    .toast.error {
      border-color: var(--danger);
    }
    
    /* Loading */
    .loading {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted);
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted);
    }
    
    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    
    /* API Log */
    .api-log {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--surface);
      border-top: 1px solid var(--border);
      max-height: 200px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 0.75rem;
      transform: translateY(100%);
      transition: transform 0.3s;
      z-index: 50;
    }
    
    .api-log.open {
      transform: translateY(0);
    }
    
    .api-log-toggle {
      position: absolute;
      top: -32px;
      right: 2rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-bottom: none;
      padding: 0.5rem 1rem;
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      font-size: 0.75rem;
    }
    
    .api-log-content {
      padding: 1rem;
    }
    
    .log-entry {
      padding: 0.25rem 0;
      display: flex;
      gap: 1rem;
    }
    
    .log-time {
      color: var(--text-muted);
    }
    
    .log-method {
      color: var(--accent);
      font-weight: 600;
      min-width: 60px;
    }
    
    .log-status {
      color: var(--success);
    }
    
    .log-status.error {
      color: var(--danger);
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">
      🥤 Pop Stop Drinks
      <span>UCP Test</span>
    </div>
    <nav>
      <button class="nav-btn active" data-tab="products">🛍️ Products</button>
      <button class="nav-btn" data-tab="cart">🛒 Cart <span class="count" id="cart-count">0</span></button>
      <button class="nav-btn" data-tab="checkout">💳 Checkout</button>
      <button class="nav-btn" data-tab="orders"><span class="badge">NEW</span>📦 Orders</button>
      <button class="nav-btn" data-tab="webhooks"><span class="badge">NEW</span>🔔 Webhooks</button>
    </nav>
  </header>
  
  <main>
    <!-- Products Tab -->
    <div id="tab-products" class="tab-content active">
      <div class="card">
        <div class="card-title">📦 Available Products</div>
        <div id="products-grid" class="grid-4">
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading products...</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Cart Tab -->
    <div id="tab-cart" class="tab-content">
      <div class="grid-2">
        <div class="card">
          <div class="card-title">🛒 Your Cart</div>
          <div id="cart-items">
            <div class="empty-state">
              <div class="empty-state-icon">🛒</div>
              <p>Your cart is empty</p>
            </div>
          </div>
          <div style="margin-top: 1rem;">
            <button class="btn btn-danger btn-sm" onclick="clearCart()">🗑️ Clear Cart</button>
          </div>
        </div>
        
        <div class="card">
          <div class="card-title">💰 Cart Summary</div>
          <div id="cart-summary">
            <div class="summary-row">
              <span>Subtotal</span>
              <span id="cart-subtotal">$0.00</span>
            </div>
            <div class="summary-row total">
              <span>Total</span>
              <span id="cart-total">$0.00</span>
            </div>
          </div>
          <button class="btn btn-primary" style="width: 100%; margin-top: 1.5rem;" onclick="goToCheckout()">
            Proceed to Checkout →
          </button>
        </div>
      </div>
    </div>
    
    <!-- Checkout Tab -->
    <div id="tab-checkout" class="tab-content">
      <div class="grid-2">
        <div>
          <div class="card">
            <div class="card-title">📋 Order Summary</div>
            <div id="checkout-items"></div>
            <div id="checkout-summary" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
              <div class="summary-row">
                <span>Subtotal</span>
                <span id="checkout-subtotal">$0.00</span>
              </div>
              <div class="summary-row discount" id="checkout-discount-row" style="display: none;">
                <span id="checkout-discount-label">Discount</span>
                <span id="checkout-discount">-$0.00</span>
              </div>
              <div class="summary-row total">
                <span>Total</span>
                <span id="checkout-total">$0.00</span>
              </div>
            </div>
          </div>
          
          <!-- Coupon Section -->
          <div class="card" style="border-color: var(--success);">
            <div class="card-title" style="color: var(--success);">🎟️ Discount Code</div>
            <div id="coupon-applied" class="coupon-applied" style="display: none;">
              <div>
                <span class="coupon-code" id="applied-coupon-code"></span>
                <span style="margin-left: 0.5rem; font-size: 0.875rem;" id="applied-coupon-desc"></span>
              </div>
              <button class="btn btn-sm btn-danger" onclick="removeCoupon()">Remove</button>
            </div>
            <div id="coupon-input" class="input-group">
              <input type="text" class="input" id="coupon-code" placeholder="Enter coupon code">
              <button class="btn btn-success" onclick="applyCoupon()">Apply</button>
            </div>
            <p style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-muted);">
              💡 Try: SAVE20, WELCOME10, FREESHIP
            </p>
          </div>
        </div>
        
        <div>
          <!-- Payment Method Selection -->
          <div class="card">
            <div class="card-title">💳 Payment Method</div>
            
            <div class="payment-option selected" data-handler="com.wix.checkout.v1" onclick="selectPaymentHandler(this)">
              <div class="payment-header">
                <div class="payment-icon">🏪</div>
                <div>
                  <div class="payment-name">Wix Hosted Checkout</div>
                  <div class="payment-desc">Secure redirect to Wix payment page</div>
                </div>
              </div>
            </div>
            
            <div class="payment-option" data-handler="com.ucp.sandbox" onclick="selectPaymentHandler(this)">
              <div class="payment-header">
                <div class="payment-icon">🧪</div>
                <div>
                  <div class="payment-name">Sandbox (Test)</div>
                  <div class="payment-desc">For testing - use test cards</div>
                </div>
              </div>
            </div>
            
            <div class="payment-option disabled" data-handler="com.google.pay">
              <div class="payment-header">
                <div class="payment-icon">G</div>
                <div>
                  <div class="payment-name">Google Pay</div>
                  <div class="payment-desc">Coming soon</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Sandbox Payment Form (shown when sandbox selected) -->
          <div class="card" id="sandbox-form" style="display: none;">
            <div class="card-title">🧪 Test Card</div>
            <div class="form-group">
              <label class="form-label">Card Number</label>
              <input type="text" class="input" id="card-number" value="4242424242424242" style="font-family: monospace;">
            </div>
            <div class="grid-2" style="gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Expiry</label>
                <input type="text" class="input" id="card-expiry" value="12/30">
              </div>
              <div class="form-group">
                <label class="form-label">CVC</label>
                <input type="text" class="input" id="card-cvc" value="123">
              </div>
            </div>
            
            <div style="margin-top: 1rem; padding: 1rem; background: var(--bg); border-radius: 8px;">
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">TEST CARDS</div>
              <div class="test-card-row">
                <code>4242424242424242</code>
                <span style="color: var(--success);">✓ Success</span>
              </div>
              <div class="test-card-row">
                <code>4000000000000002</code>
                <span style="color: var(--danger);">✗ Decline</span>
              </div>
              <div class="test-card-row">
                <code>4000000000009995</code>
                <span style="color: var(--warning);">⚠ No Funds</span>
              </div>
            </div>
          </div>
          
          <!-- Minted Instrument (shown after minting) -->
          <div class="card" id="instrument-display" style="display: none;">
            <div class="card-title">🔐 Payment Instrument</div>
            <div class="instrument-card">
              <div class="instrument-brand" id="instrument-brand">VISA • Sandbox</div>
              <div class="instrument-number" id="instrument-number">•••• •••• •••• 4242</div>
              <div class="instrument-footer">
                <div>
                  <div class="instrument-label">Amount</div>
                  <div class="instrument-value" id="instrument-amount">$0.00</div>
                </div>
                <div>
                  <div class="instrument-label">Status</div>
                  <div class="instrument-value" style="color: var(--success);" id="instrument-status">Active</div>
                </div>
                <div>
                  <div class="instrument-label">Expires</div>
                  <div class="instrument-value" id="instrument-expires">30 min</div>
                </div>
              </div>
            </div>
          </div>
          
          <button class="btn btn-primary" style="width: 100%; padding: 1rem;" id="checkout-btn" onclick="processCheckout()">
            Complete Purchase →
          </button>
        </div>
      </div>
    </div>
    
    <!-- Orders Tab -->
    <div id="tab-orders" class="tab-content">
      <div class="grid-2">
        <div class="card">
          <div class="card-title">📦 Your Orders</div>
          <div id="orders-list">
            <div class="loading">
              <div class="spinner"></div>
              <p>Loading orders...</p>
            </div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-title">🚚 Fulfillment Details</div>
          <div id="fulfillment-details">
            <div class="empty-state">
              <div class="empty-state-icon">📦</div>
              <p>Select an order to view fulfillment details</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Webhooks Tab -->
    <div id="tab-webhooks" class="tab-content">
      <div class="grid-2">
        <div>
          <div class="card">
            <div class="card-title">➕ Register Webhook</div>
            <div class="form-group">
              <label class="form-label">Webhook URL</label>
              <input type="text" class="input" id="webhook-url" placeholder="https://your-server.com/webhook">
            </div>
            <div class="form-group">
              <label class="form-label">Events</label>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                <label class="event-checkbox checked">
                  <input type="checkbox" value="fulfillment.shipped" checked> fulfillment.shipped
                </label>
                <label class="event-checkbox">
                  <input type="checkbox" value="fulfillment.delivered"> fulfillment.delivered
                </label>
                <label class="event-checkbox">
                  <input type="checkbox" value="order.cancelled"> order.cancelled
                </label>
              </div>
            </div>
            <button class="btn btn-primary" onclick="registerWebhook()">+ Register Webhook</button>
          </div>
          
          <div class="card">
            <div class="card-title">🧪 Test Webhook</div>
            <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">
              Simulate a fulfillment event to test your endpoint.
            </p>
            <div class="input-group">
              <select class="input" id="test-event">
                <option value="fulfillment.shipped">fulfillment.shipped</option>
                <option value="fulfillment.delivered">fulfillment.delivered</option>
                <option value="order.cancelled">order.cancelled</option>
              </select>
              <button class="btn btn-outline" onclick="testWebhook()">Send Test</button>
            </div>
          </div>
        </div>
        
        <div>
          <div class="card">
            <div class="card-title">🔔 Registered Webhooks</div>
            <div id="webhooks-list">
              <div class="loading">
                <div class="spinner"></div>
                <p>Loading webhooks...</p>
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-title">📜 Recent Events</div>
            <div id="events-list">
              <div class="empty-state">
                <p>No events yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
  
  <!-- Toast -->
  <div class="toast" id="toast"></div>
  
  <!-- API Log -->
  <div class="api-log" id="api-log">
    <div class="api-log-toggle" onclick="toggleApiLog()">📡 API Log</div>
    <div class="api-log-content" id="api-log-content"></div>
  </div>
  
  <script>
    // ========================================
    // State
    // ========================================
    let products = [];
    let cart = { items: [], totals: { subtotal: { amount: 0 }, total: { amount: 0 } } };
    let currentCheckoutId = null;
    let currentInstrumentId = null;
    let selectedPaymentHandler = 'com.wix.checkout.v1';
    let appliedCoupon = null;
    
    const API_BASE = '';
    
    // ========================================
    // Navigation
    // ========================================
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');
        
        // Load data for specific tabs
        if (tab === 'orders') loadOrders();
        if (tab === 'webhooks') loadWebhooks();
      });
    });
    
    // ========================================
    // API Logging
    // ========================================
    function logApi(method, path, status, isError = false) {
      const content = document.getElementById('api-log-content');
      const time = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = \`
        <span class="log-time">\${time}</span>
        <span class="log-method">\${method}</span>
        <span>\${path}</span>
        <span class="log-status \${isError ? 'error' : ''}">\${status}</span>
      \`;
      content.insertBefore(entry, content.firstChild);
    }
    
    function toggleApiLog() {
      document.getElementById('api-log').classList.toggle('open');
    }
    
    // ========================================
    // Toast
    // ========================================
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'toast show ' + type;
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
    
    // ========================================
    // Products
    // ========================================
    async function loadProducts() {
      try {
        logApi('GET', '/ucp/products', '...');
        const res = await fetch(API_BASE + '/ucp/products?limit=20');
        const data = await res.json();
        logApi('GET', '/ucp/products', res.ok ? '200 OK' : res.status, !res.ok);
        
        products = data.products || [];
        renderProducts();
      } catch (e) {
        logApi('GET', '/ucp/products', 'ERROR', true);
        document.getElementById('products-grid').innerHTML = '<div class="empty-state"><p>Failed to load products</p></div>';
      }
    }
    
    function renderProducts() {
      const grid = document.getElementById('products-grid');
      if (products.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No products found</p></div>';
        return;
      }
      
      grid.innerHTML = products.map(p => \`
        <div class="product-card">
          <img class="product-image" src="\${p.images?.[0]?.url || ''}" alt="\${p.name}" onerror="this.style.display='none'">
          <div class="product-info">
            <div class="product-name">\${p.name}</div>
            <div class="product-price">\${p.price?.formatted || '$0.00'}</div>
            <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="addToCart('\${p.id}')">
              Add to Cart
            </button>
          </div>
        </div>
      \`).join('');
    }
    
    // ========================================
    // Cart
    // ========================================
    async function addToCart(productId) {
      try {
        logApi('POST', '/ucp/cart', '...');
        const res = await fetch(API_BASE + '/ucp/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ productId, quantity: 1 }] })
        });
        cart = await res.json();
        logApi('POST', '/ucp/cart', res.ok ? '201 OK' : res.status, !res.ok);
        
        updateCartCount();
        showToast('Added to cart!');
      } catch (e) {
        logApi('POST', '/ucp/cart', 'ERROR', true);
        showToast('Failed to add to cart', 'error');
      }
    }
    
    async function loadCart() {
      try {
        logApi('GET', '/ucp/cart', '...');
        const res = await fetch(API_BASE + '/ucp/cart');
        cart = await res.json();
        logApi('GET', '/ucp/cart', res.ok ? '200 OK' : res.status, !res.ok);
        
        updateCartCount();
        renderCart();
      } catch (e) {
        logApi('GET', '/ucp/cart', 'ERROR', true);
      }
    }
    
    async function clearCart() {
      try {
        logApi('DELETE', '/ucp/cart', '...');
        const res = await fetch(API_BASE + '/ucp/cart', { method: 'DELETE' });
        logApi('DELETE', '/ucp/cart', res.ok ? '200 OK' : res.status, !res.ok);
        
        cart = { items: [], totals: { subtotal: { amount: 0 }, total: { amount: 0 } } };
        updateCartCount();
        renderCart();
        showToast('Cart cleared');
      } catch (e) {
        logApi('DELETE', '/ucp/cart', 'ERROR', true);
      }
    }
    
    function updateCartCount() {
      const count = cart.items?.length || 0;
      document.getElementById('cart-count').textContent = count;
    }
    
    function renderCart() {
      const container = document.getElementById('cart-items');
      const items = cart.items || [];
      
      if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><p>Your cart is empty</p></div>';
        document.getElementById('cart-subtotal').textContent = '$0.00';
        document.getElementById('cart-total').textContent = '$0.00';
        return;
      }
      
      container.innerHTML = items.map(item => \`
        <div class="cart-item">
          <img class="cart-item-image" src="\${item.image?.url || ''}" alt="\${item.name}" onerror="this.style.background='var(--bg)'">
          <div class="cart-item-info">
            <div class="cart-item-name">\${item.name}</div>
            <div class="cart-item-price">\${item.price?.formatted || '$0.00'}</div>
          </div>
          <div class="cart-item-qty">
            <span>Qty: \${item.quantity}</span>
          </div>
        </div>
      \`).join('');
      
      document.getElementById('cart-subtotal').textContent = cart.totals?.subtotal?.formatted || '$0.00';
      document.getElementById('cart-total').textContent = cart.totals?.total?.formatted || '$0.00';
    }
    
    function goToCheckout() {
      document.querySelector('[data-tab="checkout"]').click();
      renderCheckoutSummary();
    }
    
    // ========================================
    // Checkout
    // ========================================
    function renderCheckoutSummary() {
      const items = cart.items || [];
      const container = document.getElementById('checkout-items');
      
      container.innerHTML = items.map(item => \`
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
          <span>\${item.quantity}x \${item.name}</span>
          <span>\${item.price?.formatted || '$0.00'}</span>
        </div>
      \`).join('');
      
      document.getElementById('checkout-subtotal').textContent = cart.totals?.subtotal?.formatted || '$0.00';
      document.getElementById('checkout-total').textContent = cart.totals?.total?.formatted || '$0.00';
    }
    
    function selectPaymentHandler(el) {
      if (el.classList.contains('disabled')) return;
      
      document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
      el.classList.add('selected');
      
      selectedPaymentHandler = el.dataset.handler;
      
      // Show/hide sandbox form
      document.getElementById('sandbox-form').style.display = 
        selectedPaymentHandler === 'com.ucp.sandbox' ? 'block' : 'none';
      document.getElementById('instrument-display').style.display = 'none';
    }
    
    async function applyCoupon() {
      const code = document.getElementById('coupon-code').value.trim();
      if (!code) return;
      
      // For demo purposes, simulate coupon validation
      // In real implementation, this would call POST /ucp/checkout/:id/coupons
      
      const coupons = {
        'SAVE20': { discount: 20, type: 'percent', desc: '20% off' },
        'WELCOME10': { discount: 10, type: 'percent', desc: '10% off' },
        'FREESHIP': { discount: 0, type: 'shipping', desc: 'Free shipping' },
      };
      
      const coupon = coupons[code.toUpperCase()];
      
      if (coupon) {
        appliedCoupon = { code: code.toUpperCase(), ...coupon };
        document.getElementById('coupon-applied').style.display = 'flex';
        document.getElementById('coupon-input').style.display = 'none';
        document.getElementById('applied-coupon-code').textContent = appliedCoupon.code;
        document.getElementById('applied-coupon-desc').textContent = appliedCoupon.desc;
        
        // Update totals
        const subtotal = cart.totals?.subtotal?.amount || 0;
        const discountAmount = coupon.type === 'percent' ? subtotal * (coupon.discount / 100) : 0;
        
        document.getElementById('checkout-discount-row').style.display = 'flex';
        document.getElementById('checkout-discount-label').textContent = \`Discount (\${appliedCoupon.code})\`;
        document.getElementById('checkout-discount').textContent = '-$' + discountAmount.toFixed(2);
        document.getElementById('checkout-total').textContent = '$' + (subtotal - discountAmount).toFixed(2);
        
        showToast('Coupon applied!');
        logApi('POST', '/ucp/checkout/.../coupons', '200 OK');
      } else {
        showToast('Invalid coupon code', 'error');
        logApi('POST', '/ucp/checkout/.../coupons', '400 Error', true);
      }
    }
    
    function removeCoupon() {
      appliedCoupon = null;
      document.getElementById('coupon-applied').style.display = 'none';
      document.getElementById('coupon-input').style.display = 'flex';
      document.getElementById('coupon-code').value = '';
      document.getElementById('checkout-discount-row').style.display = 'none';
      document.getElementById('checkout-total').textContent = cart.totals?.total?.formatted || '$0.00';
      
      showToast('Coupon removed');
      logApi('DELETE', '/ucp/checkout/.../coupons', '200 OK');
    }
    
    async function processCheckout() {
      const btn = document.getElementById('checkout-btn');
      btn.disabled = true;
      btn.textContent = 'Processing...';
      
      try {
        if (selectedPaymentHandler === 'com.ucp.sandbox') {
          // Mint instrument first
          const cardNumber = document.getElementById('card-number').value.replace(/\\s/g, '');
          const amount = parseFloat(document.getElementById('checkout-total').textContent.replace('$', ''));
          
          logApi('POST', '/ucp/checkout/.../mint', '...');
          const mintRes = await fetch(API_BASE + '/ucp/test/mint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, currency: 'USD', cardNumber })
          });
          const mintData = await mintRes.json();
          
          if (!mintData.success) {
            logApi('POST', '/ucp/checkout/.../mint', '400 Error', true);
            showToast(mintData.error || 'Payment failed', 'error');
            btn.disabled = false;
            btn.textContent = 'Complete Purchase →';
            return;
          }
          
          logApi('POST', '/ucp/checkout/.../mint', '201 Created');
          
          // Show minted instrument
          const inst = mintData.instrument;
          document.getElementById('instrument-display').style.display = 'block';
          document.getElementById('instrument-brand').textContent = (inst.display?.brand || 'Card') + ' • Sandbox';
          document.getElementById('instrument-number').textContent = '•••• •••• •••• ' + (inst.display?.last4 || '****');
          document.getElementById('instrument-amount').textContent = '$' + inst.amount.toFixed(2);
          
          showToast('Payment successful!');
          
          // Clear cart
          await clearCart();
          
          btn.textContent = '✓ Payment Complete';
          
        } else {
          // Wix hosted checkout
          logApi('POST', '/ucp/checkout', '...');
          const res = await fetch(API_BASE + '/ucp/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          const checkout = await res.json();
          
          if (checkout.error) {
            logApi('POST', '/ucp/checkout', '400 Error', true);
            showToast(checkout.message || 'Checkout failed', 'error');
            btn.disabled = false;
            btn.textContent = 'Complete Purchase →';
            return;
          }
          
          logApi('POST', '/ucp/checkout', '201 Created');
          
          // Redirect to Wix checkout
          window.open(checkout.checkoutUrl, '_blank');
          showToast('Redirecting to payment...');
          
          btn.disabled = false;
          btn.textContent = 'Complete Purchase →';
        }
      } catch (e) {
        showToast('Checkout failed', 'error');
        btn.disabled = false;
        btn.textContent = 'Complete Purchase →';
      }
    }
    
    // ========================================
    // Orders
    // ========================================
    async function loadOrders() {
      const container = document.getElementById('orders-list');
      
      try {
        logApi('GET', '/ucp/orders', '...');
        const res = await fetch(API_BASE + '/ucp/orders');
        const data = await res.json();
        logApi('GET', '/ucp/orders', res.ok ? '200 OK' : res.status, !res.ok);
        
        const orders = data.orders || [];
        
        if (orders.length === 0) {
          container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>No orders yet</p></div>';
          return;
        }
        
        container.innerHTML = orders.map(order => \`
          <div class="order-card" onclick="showOrderDetails('\${order.id}')">
            <div class="order-header">
              <span class="order-id">#\${order.number || order.id.slice(0, 8)}</span>
              <span class="status status-\${order.paymentStatus?.toLowerCase() || 'pending'}">\${order.paymentStatus || 'Pending'}</span>
            </div>
            <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">
              \${order.items?.map(i => i.quantity + 'x ' + i.name).join(', ') || 'Items'}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 600;">\${order.totals?.total?.formatted || '$0.00'}</span>
              <button class="btn btn-outline btn-sm">View Details →</button>
            </div>
          </div>
        \`).join('');
      } catch (e) {
        logApi('GET', '/ucp/orders', 'ERROR', true);
        container.innerHTML = '<div class="empty-state"><p>Failed to load orders</p></div>';
      }
    }
    
    async function showOrderDetails(orderId) {
      const container = document.getElementById('fulfillment-details');
      
      try {
        logApi('GET', '/ucp/orders/' + orderId.slice(0, 8) + '...', '...');
        const res = await fetch(API_BASE + '/ucp/orders/' + orderId);
        const order = await res.json();
        logApi('GET', '/ucp/orders/...', res.ok ? '200 OK' : res.status, !res.ok);
        
        container.innerHTML = \`
          <div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 0.5rem;">Order #\${order.number || order.id.slice(0, 8)}</h4>
            <span class="status status-\${order.fulfillmentStatus?.toLowerCase() || 'pending'}">\${order.fulfillmentStatus || 'Processing'}</span>
          </div>
          
          <div class="timeline">
            <div class="timeline-item completed">
              <div class="timeline-title">Order Placed</div>
              <div class="timeline-date">\${new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <div class="timeline-item \${order.paymentStatus === 'PAID' ? 'completed' : ''}">
              <div class="timeline-title">Payment Confirmed</div>
              <div class="timeline-date">\${order.paymentStatus === 'PAID' ? 'Completed' : 'Pending'}</div>
            </div>
            <div class="timeline-item \${order.fulfillmentStatus === 'FULFILLED' ? 'completed' : order.fulfillmentStatus === 'PARTIALLY_FULFILLED' ? 'current' : ''}">
              <div class="timeline-title">Shipped</div>
              <div class="timeline-date">\${order.fulfillmentStatus === 'FULFILLED' || order.fulfillmentStatus === 'PARTIALLY_FULFILLED' ? 'In transit' : 'Pending'}</div>
            </div>
            <div class="timeline-item">
              <div class="timeline-title">Delivered</div>
              <div class="timeline-date">Pending</div>
            </div>
          </div>
          
          \${order.fulfillments?.length ? \`
            <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg); border-radius: 8px;">
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">TRACKING</div>
              \${order.fulfillments.map(f => \`
                <div style="font-family: monospace; color: var(--accent);">\${f.trackingInfo?.trackingNumber || 'N/A'}</div>
              \`).join('')}
            </div>
          \` : ''}
        \`;
      } catch (e) {
        logApi('GET', '/ucp/orders/...', 'ERROR', true);
        container.innerHTML = '<div class="empty-state"><p>Failed to load order details</p></div>';
      }
    }
    
    // ========================================
    // Webhooks
    // ========================================
    async function loadWebhooks() {
      const container = document.getElementById('webhooks-list');
      
      try {
        logApi('GET', '/ucp/webhooks', '...');
        const res = await fetch(API_BASE + '/ucp/webhooks');
        const data = await res.json();
        logApi('GET', '/ucp/webhooks', res.ok ? '200 OK' : res.status, !res.ok);
        
        const webhooks = data.subscriptions || [];
        
        if (webhooks.length === 0) {
          container.innerHTML = '<div class="empty-state"><p>No webhooks registered</p></div>';
          return;
        }
        
        container.innerHTML = webhooks.map(wh => \`
          <div class="webhook-item">
            <div>
              <div class="webhook-event">\${wh.events.join(', ')}</div>
              <div class="webhook-url">\${wh.url}</div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteWebhook('\${wh.id}')">🗑️</button>
          </div>
        \`).join('');
      } catch (e) {
        logApi('GET', '/ucp/webhooks', 'ERROR', true);
        container.innerHTML = '<div class="empty-state"><p>Failed to load webhooks</p></div>';
      }
    }
    
    async function registerWebhook() {
      const url = document.getElementById('webhook-url').value.trim();
      if (!url) {
        showToast('Please enter a webhook URL', 'error');
        return;
      }
      
      const events = Array.from(document.querySelectorAll('.event-checkbox input:checked'))
        .map(cb => cb.value);
      
      if (events.length === 0) {
        showToast('Please select at least one event', 'error');
        return;
      }
      
      try {
        logApi('POST', '/ucp/webhooks', '...');
        const res = await fetch(API_BASE + '/ucp/webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, events })
        });
        const data = await res.json();
        
        if (data.error) {
          logApi('POST', '/ucp/webhooks', '400 Error', true);
          showToast(data.message || 'Failed to register webhook', 'error');
          return;
        }
        
        logApi('POST', '/ucp/webhooks', '201 Created');
        showToast('Webhook registered!');
        document.getElementById('webhook-url').value = '';
        loadWebhooks();
      } catch (e) {
        logApi('POST', '/ucp/webhooks', 'ERROR', true);
        showToast('Failed to register webhook', 'error');
      }
    }
    
    async function deleteWebhook(id) {
      try {
        logApi('DELETE', '/ucp/webhooks/' + id.slice(0, 8) + '...', '...');
        const res = await fetch(API_BASE + '/ucp/webhooks/' + id, { method: 'DELETE' });
        logApi('DELETE', '/ucp/webhooks/...', res.ok ? '200 OK' : res.status, !res.ok);
        
        showToast('Webhook deleted');
        loadWebhooks();
      } catch (e) {
        logApi('DELETE', '/ucp/webhooks/...', 'ERROR', true);
        showToast('Failed to delete webhook', 'error');
      }
    }
    
    async function testWebhook() {
      const event = document.getElementById('test-event').value;
      
      try {
        logApi('POST', '/ucp/test/fulfillment', '...');
        const res = await fetch(API_BASE + '/ucp/test/fulfillment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: 'test-order-' + Date.now(),
            status: event.split('.')[1],
            trackingNumber: '1Z999AA1' + Math.random().toString().slice(2, 10)
          })
        });
        logApi('POST', '/ucp/test/fulfillment', res.ok ? '200 OK' : res.status, !res.ok);
        
        showToast('Test event sent!');
        
        // Add to events list
        const eventsContainer = document.getElementById('events-list');
        const eventEl = document.createElement('div');
        eventEl.className = 'webhook-item';
        eventEl.innerHTML = \`
          <span style="color: var(--accent);">\${event}</span>
          <span style="color: var(--text-muted); font-size: 0.75rem;">just now</span>
        \`;
        eventsContainer.insertBefore(eventEl, eventsContainer.firstChild);
      } catch (e) {
        logApi('POST', '/ucp/test/fulfillment', 'ERROR', true);
        showToast('Failed to send test event', 'error');
      }
    }
    
    // Event checkbox toggle styling
    document.querySelectorAll('.event-checkbox').forEach(label => {
      const cb = label.querySelector('input');
      cb.addEventListener('change', () => {
        label.classList.toggle('checked', cb.checked);
      });
    });
    
    // ========================================
    // Init
    // ========================================
    document.addEventListener('DOMContentLoaded', () => {
      loadProducts();
      loadCart();
    });
  </script>
</body>
</html>
  `;
  
  res.send(html);
});

export default router;
