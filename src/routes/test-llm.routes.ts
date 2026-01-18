/**
 * LLM Test Chat Interface
 * 
 * A "Gemini-like" chat experience that actually makes real API calls.
 * No hallucinations - just real UCP protocol in action!
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /test/llm
 * Serves the chat interface
 */
router.get('/test/llm', (_req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PopStop AI Shopping Assistant</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #e8e8e8;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .header {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .header h1 {
      font-size: 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header h1 span {
      font-size: 1.5rem;
    }

    .clear-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #e8e8e8;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .clear-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* Chat Area */
    .chat-area {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Messages */
    .message {
      max-width: 85%;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message.user {
      align-self: flex-end;
    }

    .message.assistant {
      align-self: flex-start;
    }

    .message-content {
      padding: 14px 18px;
      border-radius: 18px;
      line-height: 1.5;
    }

    .message.user .message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-bottom-right-radius: 4px;
    }

    .message.assistant .message-content {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-bottom-left-radius: 4px;
    }

    /* Product Grid */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }

    .product-card {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s;
    }

    .product-card:hover {
      background: rgba(255, 255, 255, 0.12);
      transform: translateY(-2px);
    }

    .product-card img {
      width: 100%;
      height: 80px;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .product-card h4 {
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .product-card .price {
      color: #4ade80;
      font-weight: 600;
      font-size: 0.9rem;
      margin-bottom: 8px;
    }

    .product-card button {
      width: 100%;
      padding: 6px 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .product-card button:hover {
      opacity: 0.9;
      transform: scale(1.02);
    }

    /* Cart Display */
    .cart-display {
      background: rgba(74, 222, 128, 0.1);
      border: 1px solid rgba(74, 222, 128, 0.3);
      border-radius: 12px;
      padding: 16px;
      margin-top: 12px;
    }

    .cart-display h4 {
      color: #4ade80;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cart-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .cart-item:last-child {
      border-bottom: none;
    }

    .cart-total {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 2px solid rgba(255, 255, 255, 0.2);
      font-weight: 600;
      display: flex;
      justify-content: space-between;
    }

    /* Checkout Box */
    .checkout-box {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
      border: 1px solid rgba(102, 126, 234, 0.4);
      border-radius: 12px;
      padding: 20px;
      margin-top: 12px;
    }

    .checkout-box h4 {
      color: #a78bfa;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .checkout-url {
      background: rgba(0, 0, 0, 0.3);
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.8rem;
      word-break: break-all;
      margin: 12px 0;
      color: #93c5fd;
    }

    .checkout-actions {
      display: flex;
      gap: 8px;
    }

    .checkout-actions button {
      flex: 1;
      padding: 10px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-copy {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
    }

    .btn-open {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-copy:hover, .btn-open:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    /* Waiting Indicator */
    .waiting-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
      padding: 12px;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 8px;
      color: #fbbf24;
    }

    .waiting-indicator .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(251, 191, 36, 0.3);
      border-top-color: #fbbf24;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Order Confirmed */
    .order-confirmed {
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(34, 197, 94, 0.2) 100%);
      border: 1px solid rgba(74, 222, 128, 0.4);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin-top: 12px;
    }

    .order-confirmed h3 {
      color: #4ade80;
      font-size: 1.5rem;
      margin-bottom: 8px;
    }

    .order-confirmed .order-number {
      font-size: 2rem;
      font-weight: 700;
      color: white;
      margin: 16px 0;
    }

    .order-confirmed button {
      margin-top: 16px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      cursor: pointer;
    }

    /* Checkout Modal */
    .checkout-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 1000;
      justify-content: center;
      align-items: center;
      animation: fadeIn 0.3s ease;
    }

    .checkout-modal.open {
      display: flex;
    }

    .checkout-modal-content {
      width: 100%;
      max-width: 420px;  /* Narrower to trigger mobile checkout layout */
      height: 92vh;
      max-height: 800px;
      background: #1a1a2e;
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Full screen on mobile devices */
    @media (max-width: 480px) {
      .checkout-modal-content {
        max-width: 100%;
        height: 100vh;
        max-height: none;
        border-radius: 0;
      }
      
      .checkout-modal {
        align-items: flex-end;
      }
    }

    .checkout-modal-header {
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .checkout-modal-header h3 {
      font-size: 1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .checkout-modal-close {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .checkout-modal-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .checkout-iframe-container {
      flex: 1;
      position: relative;
      background: white;
      overflow: hidden;
      min-height: 0;  /* Important for flexbox */
    }

    .checkout-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    .checkout-iframe-loading {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 16px;
    }

    .checkout-iframe-loading .spinner-large {
      width: 48px;
      height: 48px;
      border: 3px solid rgba(102, 126, 234, 0.3);
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .checkout-iframe-error {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 16px;
      padding: 24px;
      text-align: center;
    }

    .checkout-iframe-error.show {
      display: flex;
    }

    .checkout-iframe-error h4 {
      color: #fbbf24;
      font-size: 1.1rem;
    }

    .checkout-iframe-error p {
      opacity: 0.8;
      max-width: 300px;
      line-height: 1.5;
    }

    .checkout-iframe-error button {
      margin-top: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      cursor: pointer;
    }

    .checkout-modal-footer {
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.05);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
    }

    .checkout-modal-footer a {
      color: #93c5fd;
      text-decoration: none;
    }

    .checkout-modal-footer a:hover {
      text-decoration: underline;
    }

    /* Embed mode toggle */
    .btn-embed {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      color: white;
    }

    .btn-embed:hover {
      opacity: 0.9;
    }

    /* Input Area */
    .input-area {
      padding: 16px 24px;
      background: rgba(255, 255, 255, 0.05);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 12px;
    }

    .input-area input {
      flex: 1;
      padding: 14px 18px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      color: white;
      font-size: 1rem;
      outline: none;
      transition: all 0.2s;
    }

    .input-area input:focus {
      border-color: #667eea;
      background: rgba(255, 255, 255, 0.15);
    }

    .input-area input::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }

    .input-area button {
      padding: 14px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 12px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .input-area button:hover {
      opacity: 0.9;
      transform: scale(1.02);
    }

    .input-area button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    /* Quick Actions */
    .quick-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    .quick-actions button {
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      color: white;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .quick-actions button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* API Log */
    .api-log {
      background: rgba(0, 0, 0, 0.3);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .api-log.open {
      max-height: 200px;
    }

    .api-log-header {
      padding: 12px 24px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .api-log-content {
      padding: 0 24px 12px;
      font-family: monospace;
      font-size: 0.75rem;
      max-height: 150px;
      overflow-y: auto;
    }

    .api-log-entry {
      padding: 4px 0;
      display: flex;
      gap: 12px;
    }

    .api-log-entry .time {
      color: rgba(255, 255, 255, 0.5);
    }

    .api-log-entry .method {
      color: #93c5fd;
      font-weight: 600;
    }

    .api-log-entry .status {
      color: #4ade80;
    }

    .api-log-entry .status.error {
      color: #f87171;
    }

    /* Typing indicator */
    .typing {
      display: flex;
      gap: 4px;
      padding: 8px 0;
    }

    .typing span {
      width: 8px;
      height: 8px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
    }

    .typing span:nth-child(1) { animation-delay: 0s; }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
  </style>
</head>
<body>
  <!-- Checkout Modal -->
  <div class="checkout-modal" id="checkoutModal">
    <div class="checkout-modal-content">
      <div class="checkout-modal-header">
        <h3>💳 Complete Your Payment</h3>
        <button class="checkout-modal-close" onclick="closeCheckoutModal()">×</button>
      </div>
      <div class="checkout-iframe-container">
        <div class="checkout-iframe-loading" id="iframeLoading">
          <div class="spinner-large"></div>
          <p>Loading checkout...</p>
        </div>
        <div class="checkout-iframe-error" id="iframeError">
          <h4>⚠️ Embedding Not Supported</h4>
          <p>The Wix checkout page cannot be embedded due to security restrictions. Please use the button below to open it in a new tab.</p>
          <button onclick="openCheckoutExternal()">Open Checkout in New Tab →</button>
        </div>
        <iframe 
          id="checkoutIframe" 
          class="checkout-iframe" 
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation allow-popups-to-escape-sandbox"
          allow="payment"
          style="width: 100%; height: 100%; border: none;"
        ></iframe>
      </div>
      <div class="checkout-modal-footer">
        <span>Secure payment by Wix</span>
        <a href="#" onclick="openCheckoutExternal(); return false;">Open in new tab</a>
      </div>
    </div>
  </div>

  <div class="container">
    <header class="header">
      <h1><span>🤖</span> PopStop AI Shopping Assistant</h1>
      <button class="clear-btn" onclick="clearChat()">Clear Chat</button>
    </header>

    <div class="chat-area" id="chatArea">
      <!-- Welcome message -->
      <div class="message assistant">
        <div class="message-content">
          <strong>👋 Welcome to PopStop Drinks!</strong>
          <p style="margin-top: 8px; opacity: 0.9;">I can help you browse products, add items to your cart, and checkout. Try saying:</p>
          <div class="quick-actions">
            <button onclick="sendMessage('Show me your products')">Show products</button>
            <button onclick="sendMessage('What drinks do you have?')">What's available?</button>
            <button onclick="sendMessage('View my cart')">View cart</button>
          </div>
        </div>
      </div>
    </div>

    <div class="api-log" id="apiLog">
      <div class="api-log-header" onclick="toggleApiLog()">
        <span>📡 API Activity Log</span>
        <span id="apiLogToggle">▼</span>
      </div>
      <div class="api-log-content" id="apiLogContent"></div>
    </div>

    <div class="input-area">
      <input 
        type="text" 
        id="userInput" 
        placeholder="Type a message... (e.g., 'show products', 'add cone crusher')"
        onkeypress="if(event.key === 'Enter') sendMessage()"
      >
      <button onclick="sendMessage()" id="sendBtn">Send</button>
    </div>
  </div>

  <script>
    // State
    let cart = { items: [], total: 0 };
    let products = [];
    let currentCheckoutId = null;
    let pollingInterval = null;

    // API base URL
    const API_BASE = '';

    // Log API call
    function logApi(method, path, status, isError = false) {
      const content = document.getElementById('apiLogContent');
      const time = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.className = 'api-log-entry';
      entry.innerHTML = \`
        <span class="time">\${time}</span>
        <span class="method">\${method}</span>
        <span>\${path}</span>
        <span class="status \${isError ? 'error' : ''}">\${status}</span>
      \`;
      content.appendChild(entry);
      content.scrollTop = content.scrollHeight;
    }

    // Toggle API log
    function toggleApiLog() {
      const log = document.getElementById('apiLog');
      const toggle = document.getElementById('apiLogToggle');
      log.classList.toggle('open');
      toggle.textContent = log.classList.contains('open') ? '▲' : '▼';
    }

    // Add message to chat
    function addMessage(content, isUser = false) {
      const chatArea = document.getElementById('chatArea');
      const msg = document.createElement('div');
      msg.className = \`message \${isUser ? 'user' : 'assistant'}\`;
      msg.innerHTML = \`<div class="message-content">\${content}</div>\`;
      chatArea.appendChild(msg);
      chatArea.scrollTop = chatArea.scrollHeight;
      return msg;
    }

    // Show typing indicator
    function showTyping() {
      const msg = addMessage('<div class="typing"><span></span><span></span><span></span></div>');
      msg.id = 'typingIndicator';
      return msg;
    }

    // Remove typing indicator
    function removeTyping() {
      const typing = document.getElementById('typingIndicator');
      if (typing) typing.remove();
    }

    // Clear chat
    function clearChat() {
      cart = { items: [], total: 0 };
      products = [];
      currentCheckoutId = null;
      if (pollingInterval) clearInterval(pollingInterval);
      
      const chatArea = document.getElementById('chatArea');
      chatArea.innerHTML = \`
        <div class="message assistant">
          <div class="message-content">
            <strong>👋 Chat cleared!</strong>
            <p style="margin-top: 8px; opacity: 0.9;">Ready to start fresh. What would you like to do?</p>
            <div class="quick-actions">
              <button onclick="sendMessage('Show me your products')">Show products</button>
              <button onclick="sendMessage('What drinks do you have?')">What's available?</button>
            </div>
          </div>
        </div>
      \`;
    }

    // Intent detection
    function detectIntent(message) {
      const lower = message.toLowerCase();
      
      if (lower.match(/show|list|what|browse|products|drinks|menu|available|have/)) {
        return 'BROWSE';
      }
      if (lower.match(/add|want|buy|get|order|i('ll| will) (take|have)/)) {
        return 'ADD_TO_CART';
      }
      if (lower.match(/checkout|pay|purchase|complete|finish|done shopping/)) {
        return 'CHECKOUT';
      }
      if (lower.match(/cart|basket|bag/)) {
        return 'VIEW_CART';
      }
      if (lower.match(/clear|empty|remove all|start over/)) {
        return 'CLEAR_CART';
      }
      if (lower.match(/status|order|paid|payment/)) {
        return 'CHECK_STATUS';
      }
      
      return 'UNKNOWN';
    }

    // Extract product and quantity from message
    function extractProductInfo(message) {
      const lower = message.toLowerCase();
      let quantity = 1;
      
      // Extract quantity
      const qtyMatch = lower.match(/(\\d+)\\s*(of|x|×)?/);
      if (qtyMatch) quantity = parseInt(qtyMatch[1]);
      
      // Find matching product
      const product = products.find(p => 
        lower.includes(p.name.toLowerCase()) ||
        lower.includes(p.name.toLowerCase().split(' ')[0])
      );
      
      return { product, quantity };
    }

    // Format currency
    function formatCurrency(amount) {
      return '$' + parseFloat(amount).toFixed(2);
    }

    // API Calls
    async function fetchProducts() {
      try {
        logApi('GET', '/ucp/products', '...');
        const res = await fetch(API_BASE + '/ucp/products');
        const data = await res.json();
        logApi('GET', '/ucp/products', res.ok ? '200 OK' : res.status, !res.ok);
        products = data.products || [];
        return products;
      } catch (e) {
        logApi('GET', '/ucp/products', 'ERROR', true);
        throw e;
      }
    }

    async function addToCart(productId, quantity) {
      try {
        logApi('POST', '/ucp/cart', '...');
        const res = await fetch(API_BASE + '/ucp/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ productId, quantity }] })
        });
        const data = await res.json();
        logApi('POST', '/ucp/cart', res.ok ? '201 OK' : res.status, !res.ok);
        return data;
      } catch (e) {
        logApi('POST', '/ucp/cart', 'ERROR', true);
        throw e;
      }
    }

    async function getCart() {
      try {
        logApi('GET', '/ucp/cart', '...');
        const res = await fetch(API_BASE + '/ucp/cart');
        const data = await res.json();
        logApi('GET', '/ucp/cart', res.ok ? '200 OK' : res.status, !res.ok);
        return data;
      } catch (e) {
        logApi('GET', '/ucp/cart', 'ERROR', true);
        throw e;
      }
    }

    async function clearCartApi() {
      try {
        logApi('DELETE', '/ucp/cart', '...');
        const res = await fetch(API_BASE + '/ucp/cart', { method: 'DELETE' });
        const data = await res.json();
        logApi('DELETE', '/ucp/cart', res.ok ? '200 OK' : res.status, !res.ok);
        return data;
      } catch (e) {
        logApi('DELETE', '/ucp/cart', 'ERROR', true);
        throw e;
      }
    }

    async function createCheckout() {
      try {
        logApi('POST', '/ucp/checkout', '...');
        const res = await fetch(API_BASE + '/ucp/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await res.json();
        logApi('POST', '/ucp/checkout', res.ok ? '201 OK' : res.status, !res.ok);
        if (!res.ok) throw new Error(data.message || 'Checkout failed');
        return data;
      } catch (e) {
        logApi('POST', '/ucp/checkout', 'ERROR', true);
        throw e;
      }
    }

    async function checkOrderStatus(checkoutId) {
      try {
        logApi('GET', \`/ucp/checkout/\${checkoutId.slice(0,8)}../status\`, '...');
        const res = await fetch(API_BASE + '/ucp/checkout/' + checkoutId + '/status');
        const data = await res.json();
        logApi('GET', \`/ucp/checkout/.../status\`, res.ok ? '200 OK' : res.status, !res.ok);
        return data;
      } catch (e) {
        logApi('GET', '/ucp/checkout/.../status', 'ERROR', true);
        throw e;
      }
    }

    // Render products
    function renderProducts(products) {
      let html = '<strong>Here are our drinks:</strong>';
      html += '<div class="products-grid">';
      
      for (const p of products) {
        const imgUrl = p.images?.[0]?.url || 'https://via.placeholder.com/150';
        html += \`
          <div class="product-card">
            <img src="\${imgUrl}" alt="\${p.name}" onerror="this.src='https://via.placeholder.com/150'">
            <h4>\${p.name}</h4>
            <div class="price">\${p.price?.formatted || formatCurrency(p.price?.amount || 4)}</div>
            <button onclick="sendMessage('Add \${p.name} to my cart')">Add to Cart</button>
          </div>
        \`;
      }
      
      html += '</div>';
      html += '<p style="margin-top: 12px; opacity: 0.8;">Click a product or tell me what you\\'d like!</p>';
      return html;
    }

    // Render cart
    function renderCart(cartData) {
      if (!cartData.items || cartData.items.length === 0) {
        return \`
          <div class="cart-display">
            <h4>🛒 Your Cart</h4>
            <p style="opacity: 0.7;">Your cart is empty. Add some drinks!</p>
          </div>
          <div class="quick-actions">
            <button onclick="sendMessage('Show me your products')">Browse Products</button>
          </div>
        \`;
      }

      let html = '<div class="cart-display"><h4>🛒 Your Cart</h4>';
      
      for (const item of cartData.items) {
        html += \`
          <div class="cart-item">
            <span>\${item.name} × \${item.quantity}</span>
            <span>\${item.price?.formatted || formatCurrency(item.price?.amount || 0)}</span>
          </div>
        \`;
      }
      
      html += \`
        <div class="cart-total">
          <span>Total</span>
          <span>\${cartData.totals?.total?.formatted || formatCurrency(cartData.totals?.total?.amount || 0)}</span>
        </div>
      </div>
      <div class="quick-actions">
        <button onclick="sendMessage('Checkout')">Proceed to Checkout</button>
        <button onclick="sendMessage('Show products')">Add More</button>
        <button onclick="sendMessage('Clear cart')">Clear Cart</button>
      </div>
      \`;
      
      return html;
    }

    // Store checkout URL in a variable (avoids HTML entity issues)
    let currentCheckoutUrl = null;

    // Render checkout
    function renderCheckout(checkoutData) {
      currentCheckoutId = checkoutData.id;
      currentCheckoutUrl = checkoutData.checkoutUrl; // Store the raw URL
      
      const html = \`
        <strong>🎉 Checkout Ready!</strong>
        <p style="margin-top: 8px;">Total: <strong>\${checkoutData.totals?.total?.formatted || '$0.00'}</strong></p>
        
        <div class="checkout-box">
          <h4>💳 Complete Payment</h4>
          <div class="checkout-url" id="checkoutUrl"></div>
          <div class="checkout-actions">
            <button class="btn-embed" onclick="openEmbeddedCheckout()">🖼️ Pay Here</button>
            <button class="btn-open" onclick="openCheckout()">Open in Tab →</button>
          </div>
          <div style="margin-top: 8px;">
            <button class="btn-copy" onclick="copyCheckoutUrl()" style="width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); padding: 8px;">📋 Copy Link</button>
          </div>
        </div>
        
        <div style="margin-top: 16px; padding: 16px; background: linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(34, 197, 94, 0.15) 100%); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px;">
          <p style="margin-bottom: 12px; opacity: 0.9;">After completing payment, click below:</p>
          <button onclick="confirmPayment()" style="width: 100%; padding: 14px 24px; background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); border: none; border-radius: 8px; color: white; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            ✅ I Completed Payment
          </button>
        </div>
      \`;
      
      // After rendering, set the URL using textContent (avoids HTML parsing)
      setTimeout(() => {
        const urlEl = document.getElementById('checkoutUrl');
        if (urlEl) urlEl.textContent = currentCheckoutUrl;
      }, 0);
      
      return html;
    }
    
    // Confirm payment manually
    function confirmPayment() {
      showOrderConfirmation({ 
        completed: true,
        orderId: null,
        orderNumber: null 
      });
    }

    // Copy checkout URL
    function copyCheckoutUrl() {
      if (currentCheckoutUrl) {
        navigator.clipboard.writeText(currentCheckoutUrl);
        alert('Checkout URL copied!');
      }
    }

    // Open checkout in new tab
    function openCheckout() {
      if (currentCheckoutUrl) {
        window.open(currentCheckoutUrl, '_blank');
      }
    }

    // Embedded checkout modal functions
    let iframeLoadTimeout = null;
    let iframeLoaded = false;

    function openEmbeddedCheckout() {
      if (!currentCheckoutUrl) return;
      
      const modal = document.getElementById('checkoutModal');
      const iframe = document.getElementById('checkoutIframe');
      const loading = document.getElementById('iframeLoading');
      const error = document.getElementById('iframeError');
      
      // Reset state
      iframeLoaded = false;
      loading.style.display = 'flex';
      error.classList.remove('show');
      iframe.style.opacity = '0';
      
      // Open modal
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      
      // Set up iframe load detection
      iframe.onload = function() {
        iframeLoaded = true;
        clearTimeout(iframeLoadTimeout);
        
        // Small delay to ensure content is rendered
        setTimeout(() => {
          loading.style.display = 'none';
          iframe.style.opacity = '1';
          
          // Try to detect if we got blocked (X-Frame-Options)
          // This is tricky - we can't directly access cross-origin iframe content
          // But we can check if the iframe appears empty
          try {
            // If we can access contentWindow but not contentDocument, 
            // it might be blocked or cross-origin (which is expected)
            // We'll assume success if load event fired
            logApi('EMBED', 'Checkout iframe loaded', 'OK');
          } catch (e) {
            // Expected for cross-origin
          }
        }, 500);
      };
      
      iframe.onerror = function() {
        clearTimeout(iframeLoadTimeout);
        showIframeError();
      };
      
      // Set timeout for loading (if takes too long, might be blocked)
      iframeLoadTimeout = setTimeout(() => {
        if (!iframeLoaded) {
          // Check if iframe has any content
          showIframeError();
        }
      }, 10000); // 10 second timeout
      
      // Load the checkout URL
      iframe.src = currentCheckoutUrl;
      logApi('EMBED', 'Loading checkout in iframe', '...');
    }

    function showIframeError() {
      const loading = document.getElementById('iframeLoading');
      const error = document.getElementById('iframeError');
      const iframe = document.getElementById('checkoutIframe');
      
      loading.style.display = 'none';
      error.classList.add('show');
      iframe.style.opacity = '0';
      logApi('EMBED', 'Checkout iframe', 'BLOCKED', true);
    }

    function closeCheckoutModal() {
      const modal = document.getElementById('checkoutModal');
      const iframe = document.getElementById('checkoutIframe');
      
      modal.classList.remove('open');
      document.body.style.overflow = '';
      iframe.src = '';
      
      clearTimeout(iframeLoadTimeout);
    }

    function openCheckoutExternal() {
      closeCheckoutModal();
      if (currentCheckoutUrl) {
        window.open(currentCheckoutUrl, '_blank');
      }
    }

    // Close modal on backdrop click
    document.addEventListener('DOMContentLoaded', () => {
      const modal = document.getElementById('checkoutModal');
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeCheckoutModal();
        }
      });
      
      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
          closeCheckoutModal();
        }
      });
    });

    // Show order confirmation
    function showOrderConfirmation(status) {
      const chatArea = document.getElementById('chatArea');
      
      // Stop any ongoing polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
      
      // Remove waiting indicator from last message
      const indicator = document.getElementById('waitingIndicator');
      if (indicator) indicator.remove();
      
      // Determine what to show for order number (prefer orderNumber over orderId)
      const orderDisplay = status.orderNumber 
        ? \`Order #\${status.orderNumber}\`
        : status.orderId 
          ? \`Order #\${status.orderId}\`
          : 'Order Confirmed!';
      
      // Add confirmation message
      addMessage(\`
        <div class="order-confirmed">
          <h3>🎊 Payment Received!</h3>
          <p>Your order has been confirmed</p>
          <div class="order-number">\${orderDisplay}</div>
          <p>Thank you for shopping with PopStop! 🎉</p>
          <p style="font-size: 0.9rem; opacity: 0.8; margin-top: 8px;">Check your email for order details.</p>
          <button onclick="clearChat()">Start New Order</button>
        </div>
      \`);
      
      currentCheckoutId = null;
      currentCheckoutUrl = null;
    }

    // Main send message handler
    async function sendMessage(customMessage) {
      const input = document.getElementById('userInput');
      const message = customMessage || input.value.trim();
      
      if (!message) return;
      
      input.value = '';
      input.disabled = true;
      document.getElementById('sendBtn').disabled = true;
      
      // Add user message
      addMessage(message, true);
      
      // Show typing
      showTyping();
      
      try {
        const intent = detectIntent(message);
        let response = '';
        
        switch (intent) {
          case 'BROWSE':
            const prods = await fetchProducts();
            response = renderProducts(prods);
            break;
            
          case 'ADD_TO_CART':
            // Make sure we have products loaded
            if (products.length === 0) {
              await fetchProducts();
            }
            
            const { product, quantity } = extractProductInfo(message);
            
            if (!product) {
              response = \`
                <p>I couldn't find that product. Here's what we have:</p>
                \${renderProducts(products)}
              \`;
            } else {
              const cartResult = await addToCart(product.id, quantity);
              response = \`
                <strong>✅ Added to cart!</strong>
                <p>\${quantity}× \${product.name} - \${product.price?.formatted || formatCurrency(product.price?.amount || 4)}</p>
                \${renderCart(cartResult)}
              \`;
            }
            break;
            
          case 'VIEW_CART':
            const cartData = await getCart();
            response = renderCart(cartData);
            break;
            
          case 'CHECKOUT':
            try {
              const checkout = await createCheckout();
              response = renderCheckout(checkout);
            } catch (e) {
              response = \`
                <strong>❌ Checkout Error</strong>
                <p>\${e.message}</p>
                <div class="quick-actions">
                  <button onclick="sendMessage('View cart')">View Cart</button>
                  <button onclick="sendMessage('Show products')">Browse Products</button>
                </div>
              \`;
            }
            break;
            
          case 'CLEAR_CART':
            await clearCartApi();
            response = \`
              <strong>🗑️ Cart Cleared!</strong>
              <p>Your cart is now empty. Ready to start fresh?</p>
              <div class="quick-actions">
                <button onclick="sendMessage('Show me your products')">Browse Products</button>
              </div>
            \`;
            break;
            
          case 'CHECK_STATUS':
            if (currentCheckoutId) {
              const status = await checkOrderStatus(currentCheckoutId);
              if (status.completed) {
                showOrderConfirmation(status);
                return;
              } else {
                response = \`
                  <strong>⏳ Payment Pending</strong>
                  <p>\${status.message}</p>
                  <p>Complete your payment at the checkout link above.</p>
                \`;
              }
            } else {
              response = \`
                <p>No active checkout found. Would you like to start shopping?</p>
                <div class="quick-actions">
                  <button onclick="sendMessage('Show products')">Browse Products</button>
                </div>
              \`;
            }
            break;
            
          default:
            response = \`
              <p>I'm not sure what you mean. Try one of these:</p>
              <div class="quick-actions">
                <button onclick="sendMessage('Show me your products')">Show Products</button>
                <button onclick="sendMessage('View my cart')">View Cart</button>
                <button onclick="sendMessage('Checkout')">Checkout</button>
              </div>
            \`;
        }
        
        removeTyping();
        addMessage(response);
        
      } catch (error) {
        removeTyping();
        addMessage(\`
          <strong>❌ Error</strong>
          <p>\${error.message || 'Something went wrong. Please try again.'}</p>
        \`);
      }
      
      input.disabled = false;
      document.getElementById('sendBtn').disabled = false;
      input.focus();
    }
  </script>
</body>
</html>
  `;

  res.send(html);
});

export default router;
