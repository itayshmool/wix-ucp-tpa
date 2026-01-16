/**
 * Dashboard Routes
 * 
 * Merchant-facing dashboard and UI endpoints
 * Embedded in Wix dashboard via iframe
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error-handler.js';
import { instanceStore } from '../store/instances.js';
import { decodeInstance } from '../wix/auth.js';
import { WixApiClient } from '../wix/client.js';
import { DecodedInstance, WixInstance } from '../wix/types.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /dashboard
 * 
 * Main dashboard endpoint - embedded in Wix dashboard iframe
 * Query params from Wix:
 * - instance: Signed JWT containing instanceId and permissions
 * - locale: User's language (e.g., 'en')
 */
router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Extract instance parameter from query
  const instanceParam = req.query.instance as string | undefined;
  const locale = req.query.locale as string | undefined;

  logger.debug('Dashboard accessed', { 
    hasInstance: !!instanceParam,
    locale 
  });

  // If no instance parameter, show generic landing page
  if (!instanceParam) {
    res.send(generateLandingPage());
    return;
  }

  // Decode the instance JWT
  const decodedInstance = decodeInstance(instanceParam);

  if (!decodedInstance) {
    logger.error('Failed to decode instance parameter');
    res.status(400).send(generateErrorPage('Invalid instance parameter'));
    return;
  }

  // Get or create instance data from store
  let instance = instanceStore.get(decodedInstance.instanceId);

  if (!instance) {
    logger.info('Creating new instance from dashboard access', { 
      instanceId: decodedInstance.instanceId,
      appDefId: decodedInstance.appDefId,
      permissions: decodedInstance.permissions,
    });
    
    // Create instance record (without OAuth tokens for now)
    const newInstance: WixInstance = {
      instanceId: decodedInstance.instanceId,
      accessToken: '', // Will be populated via OAuth later
      refreshToken: '', // Will be populated via OAuth later
      installedAt: new Date(),
      siteId: decodedInstance.siteOwnerId || decodedInstance.instanceId,
    };
    
    instanceStore.save(decodedInstance.instanceId, newInstance);
    logger.info('Instance created successfully', { instanceId: newInstance.instanceId });
    
    instance = newInstance;
  }

  // Render dashboard with instance data
  res.send(generateDashboard(decodedInstance, instance, locale || 'en'));
}));

/**
 * GET /dashboard/instances
 * 
 * List all connected instances (for debugging/admin)
 */
router.get(
  '/instances',
  asyncHandler(async (_req: Request, res: Response) => {
    const instances = instanceStore.getAll();

    logger.debug('Listing all instances', { count: instances.length });

    // Return sanitized instance data (without tokens)
    const sanitized = instances.map((instance) => ({
      instanceId: instance.instanceId,
      installedAt: instance.installedAt,
      siteId: instance.siteId,
      hasAccessToken: !!instance.accessToken,
      hasRefreshToken: !!instance.refreshToken,
    }));

    res.json({
      count: sanitized.length,
      instances: sanitized,
    });
  })
);

/**
 * GET /dashboard/instance/:instanceId
 * 
 * Get details for a specific instance
 */
router.get(
  '/instance/:instanceId',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId } = req.params;

    const instance = instanceStore.get(instanceId);

    if (!instance) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Instance not found',
      });
      return;
    }

    logger.debug('Instance details requested', { instanceId });

    // Return sanitized data
    res.json({
      instanceId: instance.instanceId,
      installedAt: instance.installedAt,
      siteId: instance.siteId,
      metaSiteId: instance.metaSiteId,
      hasAccessToken: !!instance.accessToken,
      hasRefreshToken: !!instance.refreshToken,
    });
  })
);

/**
 * GET /dashboard/api/status/:instanceId
 * 
 * Get connection status for an instance
 */
router.get(
  '/api/status/:instanceId',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId } = req.params;

    logger.debug('Status check requested', { instanceId });

    const instance = instanceStore.get(instanceId);

    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    // Check if tokens exist
    const hasTokens = !!(instance.accessToken && instance.refreshToken);

    res.json({
      status: hasTokens ? 'connected' : 'disconnected',
      instanceId: instance.instanceId,
      siteId: instance.siteId,
      installedAt: instance.installedAt,
      hasAccessToken: !!instance.accessToken,
      hasRefreshToken: !!instance.refreshToken,
    });
  })
);

/**
 * POST /dashboard/api/test-connection/:instanceId
 * 
 * Test Wix API connection for an instance
 */
router.post(
  '/api/test-connection/:instanceId',
  asyncHandler(async (req: Request, res: Response) => {
    const { instanceId } = req.params;

    logger.info('Testing connection', { instanceId });

    const instance = instanceStore.get(instanceId);

    if (!instance) {
      throw new AppError('Instance not found', 404);
    }

    try {
      // Create Wix client and make a test API call
      const client = new WixApiClient({ accessToken: instance.accessToken });
      
      // Make a simple API call to verify connection
      // Using the site properties endpoint which is always available
      const response = await client.request({
        method: 'GET',
        path: '/_api/site-properties/v4/properties',
      });

      logger.info('Connection test successful', { instanceId });

      res.json({
        success: true,
        message: 'Successfully connected to Wix API',
        timestamp: new Date().toISOString(),
        data: response,
      });
    } catch (error) {
      logger.error('Connection test failed', {
        instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.json({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// ============================================================================
// HTML Generators
// ============================================================================

function generateLandingPage(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Wix UCP TPA - Dashboard</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <h1>🎉 Wix UCP TPA Dashboard</h1>
        <p class="status">✅ Your app is running!</p>
        
        <div class="info">
          <h3>Phase 1.3 Complete</h3>
          <p>OAuth integration, webhook handling, and dashboard are now active.</p>
        </div>
        
        <div class="info warning">
          <h3>⚠️ No Instance Context</h3>
          <p>This page should be loaded from within Wix dashboard.</p>
          <p>To install the app, visit: <code>/auth/install</code></p>
        </div>
        
        <h3>Available Endpoints:</h3>
        <ul>
          <li><code>GET /auth/install</code> - Install app</li>
          <li><code>GET /auth/callback</code> - OAuth callback</li>
          <li><code>POST /webhooks</code> - Webhook receiver</li>
          <li><code>GET /dashboard</code> - This page</li>
          <li><code>GET /dashboard/instances</code> - List instances</li>
        </ul>
      </div>
    </body>
    </html>
  `;
}

function generateErrorPage(message: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error - Wix UCP TPA</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <h1>❌ Error</h1>
        <div class="info error">
          <p>${message}</p>
        </div>
        <p>Please try refreshing the page or contact support if the issue persists.</p>
      </div>
    </body>
    </html>
  `;
}


function generateDashboard(decodedInstance: DecodedInstance, instance: WixInstance, locale: string): string {
  const instanceId = decodedInstance.instanceId;
  
  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Store Agent - Dashboard</title>
      ${getStyles()}
      ${getTestingStyles()}
    </head>
    <body>
      <div class="container">
        <h1>🏪 Store Agent Dashboard</h1>
        <p class="subtitle">Multi-Tenant E-Commerce Platform - Phase 3 Complete</p>
        
        <div class="status-card success">
          <div class="status-icon">✅</div>
          <div class="status-content">
            <h3>Connected via Dashboard</h3>
            <p>Your store is connected and ready to use!</p>
          </div>
        </div>
        
        <div class="info">
          <h3>🎯 Multi-Tenant Architecture</h3>
          <p><strong>Your store instance:</strong> <code>/api/${instanceId}/*</code></p>
          <p>Each merchant gets a unique instance ID. Buyers interact with your store using your instance endpoints.</p>
          <p><strong>Test the APIs below</strong> or check the <a href="https://github.com/itayshmool/wix-ucp-tpa/blob/main/MANUAL_TESTING_GUIDE.md" target="_blank" style="color: #0c6efd;">Manual Testing Guide</a> for curl examples.</p>
        </div>
        
        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-btn active" onclick="switchTab('overview')">📊 Overview</button>
          <button class="tab-btn" onclick="switchTab('products')">📦 Products API</button>
          <button class="tab-btn" onclick="switchTab('orders')">📋 Orders API</button>
          <button class="tab-btn" onclick="switchTab('inventory')">📊 Inventory API</button>
        </div>
        
        <!-- Overview Tab -->
        <div id="overview-tab" class="tab-content active">
          <div class="info-grid">
            <div class="info-item">
              <label>Instance ID</label>
              <code>${instanceId}</code>
            </div>
            <div class="info-item">
              <label>Site ID</label>
              <code>${instance.siteId || 'N/A'}</code>
            </div>
            <div class="info-item">
              <label>Installed</label>
              <span>${new Date(instance.installedAt).toLocaleString()}</span>
            </div>
            <div class="info-item">
              <label>Permissions</label>
              <span>${decodedInstance.permissions || 'Standard'}</span>
            </div>
          </div>
          
          <div class="info">
            <h3>✅ Available APIs</h3>
            <ul>
              <li><strong>Products API:</strong> List, search, filter products and collections</li>
              <li><strong>Orders API:</strong> View orders, create fulfillments, manage tracking</li>
              <li><strong>Inventory API:</strong> Track stock, low stock alerts, bulk updates</li>
            </ul>
          </div>
        </div>
        
        <!-- Products Tab -->
        <div id="products-tab" class="tab-content">
          <h2>📦 Products API Testing</h2>
          
          <div class="test-section">
            <h3>List Products</h3>
            <div class="test-controls">
              <label>Limit: <input type="number" id="products-limit" value="5" min="1" max="100"></label>
              <label>Search: <input type="text" id="products-search" placeholder="Optional search term"></label>
              <button onclick="testListProducts()" class="btn btn-primary">🔍 List Products</button>
            </div>
          </div>
          
          <div class="test-section">
            <h3>Get Single Product</h3>
            <div class="test-controls">
              <label>Product ID: <input type="text" id="product-id" placeholder="Enter product ID"></label>
              <button onclick="testGetProduct()" class="btn btn-primary">🔍 Get Product</button>
            </div>
          </div>
          
          <div class="test-section">
            <h3>List Collections</h3>
            <div class="test-controls">
              <button onclick="testListCollections()" class="btn btn-primary">🔍 List Collections</button>
            </div>
          </div>
        </div>
        
        <!-- Orders Tab -->
        <div id="orders-tab" class="tab-content">
          <h2>📋 Orders API Testing</h2>
          
          <div class="test-section">
            <h3>List Orders</h3>
            <div class="test-controls">
              <label>Limit: <input type="number" id="orders-limit" value="10" min="1" max="100"></label>
              <label>Status: 
                <select id="orders-status">
                  <option value="">All</option>
                  <option value="APPROVED">Approved</option>
                  <option value="FULFILLED">Fulfilled</option>
                  <option value="CANCELED">Canceled</option>
                </select>
              </label>
              <button onclick="testListOrders()" class="btn btn-primary">🔍 List Orders</button>
            </div>
          </div>
          
          <div class="test-section">
            <h3>Get Single Order</h3>
            <div class="test-controls">
              <label>Order ID: <input type="text" id="order-id" placeholder="Enter order ID"></label>
              <button onclick="testGetOrder()" class="btn btn-primary">🔍 Get Order</button>
            </div>
          </div>
          
          <div class="test-section">
            <h3>Search Orders</h3>
            <div class="test-controls">
              <label>Search: <input type="text" id="orders-search" placeholder="Email or order number"></label>
              <button onclick="testSearchOrders()" class="btn btn-primary">🔍 Search Orders</button>
            </div>
          </div>
        </div>
        
        <!-- Inventory Tab -->
        <div id="inventory-tab" class="tab-content">
          <h2>📊 Inventory API Testing</h2>
          
          <div class="test-section">
            <h3>List Inventory</h3>
            <div class="test-controls">
              <label>Limit: <input type="number" id="inventory-limit" value="10" min="1" max="100"></label>
              <label>In Stock Only: <input type="checkbox" id="inventory-instock"></label>
              <button onclick="testListInventory()" class="btn btn-primary">🔍 List Inventory</button>
            </div>
          </div>
          
          <div class="test-section">
            <h3>Low Stock Alert</h3>
            <div class="test-controls">
              <label>Threshold: <input type="number" id="lowstock-threshold" value="10" min="1"></label>
              <button onclick="testLowStock()" class="btn btn-primary">⚠️ Check Low Stock</button>
            </div>
          </div>
          
          <div class="test-section">
            <h3>Get Product Inventory</h3>
            <div class="test-controls">
              <label>Product ID: <input type="text" id="inv-product-id" placeholder="Enter product ID"></label>
              <button onclick="testGetProductInventory()" class="btn btn-primary">🔍 Get Inventory</button>
            </div>
          </div>
          
          <div class="test-section">
            <h3>Export Inventory</h3>
            <div class="test-controls">
              <button onclick="testExportInventory()" class="btn btn-primary">📤 Export Inventory</button>
            </div>
          </div>
        </div>
        
        <!-- Results Display -->
        <div id="results" class="results" style="display: none;">
          <div class="results-header">
            <h3>📋 API Response</h3>
            <button onclick="clearResults()" class="btn btn-sm">Clear</button>
          </div>
          <pre id="resultsContent"></pre>
        </div>
      </div>
      
      ${getTestingScript(instanceId)}
    </body>
    </html>
  `;
}

function getTestingStyles(): string {
  return `
    <style>
      .tabs {
        display: flex;
        gap: 5px;
        margin: 20px 0;
        border-bottom: 2px solid #e9ecef;
      }
      
      .tab-btn {
        padding: 12px 20px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: #6c757d;
        border-bottom: 3px solid transparent;
        transition: all 0.2s;
      }
      
      .tab-btn:hover:not(:disabled) {
        color: #0c6efd;
        background: #f8f9fa;
      }
      
      .tab-btn.active {
        color: #0c6efd;
        border-bottom-color: #0c6efd;
      }
      
      .tab-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .tab-content {
        display: none;
        animation: fadeIn 0.3s;
      }
      
      .tab-content.active {
        display: block;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .test-section {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 15px;
      }
      
      .test-section h3 {
        margin: 0 0 15px 0;
        color: #495057;
        font-size: 16px;
      }
      
      .test-controls {
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
        align-items: center;
      }
      
      .test-controls label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #495057;
      }
      
      .test-controls input[type="text"],
      .test-controls input[type="number"],
      .test-controls select {
        padding: 8px 12px;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 14px;
        min-width: 150px;
      }
      
      .test-controls input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
      
      .results-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .results-header h3 {
        margin: 0;
      }
      
      .btn-sm {
        padding: 6px 12px;
        font-size: 12px;
      }
      
      .btn-install {
        display: inline-block;
        margin-top: 10px;
        background: #28a745;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        text-decoration: none;
        font-weight: 500;
      }
      
      .btn-install:hover {
        background: #218838;
      }
    </style>
  `;
}

function getTestingScript(instanceId: string): string {
  return `
    <script>
      const instanceId = '${instanceId}';
      
      // Tab switching
      function switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName + '-tab').classList.add('active');
      }
      
      // Helper function to make API calls
      async function callAPI(endpoint, options = {}) {
        const results = document.getElementById('results');
        const resultsContent = document.getElementById('resultsContent');
        
        results.style.display = 'block';
        resultsContent.textContent = '⏳ Loading...';
        resultsContent.style.color = '#6c757d';
        
        try {
          const response = await fetch(endpoint, {
            method: options.method || 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : undefined
          });
          
          const data = await response.json();
          
          resultsContent.textContent = JSON.stringify(data, null, 2);
          resultsContent.style.color = data.success ? '#28a745' : '#dc3545';
          
          // Scroll to results
          results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (error) {
          resultsContent.textContent = '❌ Error: ' + error.message;
          resultsContent.style.color = '#dc3545';
        }
      }
      
      function clearResults() {
        document.getElementById('results').style.display = 'none';
      }
      
      // Products API
      function testListProducts() {
        const limit = document.getElementById('products-limit').value;
        const search = document.getElementById('products-search').value;
        let url = \`/api/\${instanceId}/products?limit=\${limit}\`;
        if (search) url += \`&search=\${encodeURIComponent(search)}\`;
        callAPI(url);
      }
      
      function testGetProduct() {
        const productId = document.getElementById('product-id').value;
        if (!productId) {
          alert('Please enter a product ID');
          return;
        }
        callAPI(\`/api/\${instanceId}/products/\${productId}\`);
      }
      
      function testListCollections() {
        callAPI(\`/api/\${instanceId}/collections\`);
      }
      
      // Orders API
      function testListOrders() {
        const limit = document.getElementById('orders-limit').value;
        const status = document.getElementById('orders-status').value;
        let url = \`/api/\${instanceId}/orders?limit=\${limit}\`;
        if (status) url += \`&status=\${status}\`;
        callAPI(url);
      }
      
      function testGetOrder() {
        const orderId = document.getElementById('order-id').value;
        if (!orderId) {
          alert('Please enter an order ID');
          return;
        }
        callAPI(\`/api/\${instanceId}/orders/\${orderId}\`);
      }
      
      function testSearchOrders() {
        const search = document.getElementById('orders-search').value;
        if (!search) {
          alert('Please enter a search term');
          return;
        }
        callAPI(\`/api/\${instanceId}/orders?search=\${encodeURIComponent(search)}\`);
      }
      
      // Inventory API
      function testListInventory() {
        const limit = document.getElementById('inventory-limit').value;
        const inStock = document.getElementById('inventory-instock').checked;
        let url = \`/api/\${instanceId}/inventory?limit=\${limit}\`;
        if (inStock) url += '&inStock=true';
        callAPI(url);
      }
      
      function testLowStock() {
        const threshold = document.getElementById('lowstock-threshold').value;
        callAPI(\`/api/\${instanceId}/inventory/low-stock?threshold=\${threshold}\`);
      }
      
      function testGetProductInventory() {
        const productId = document.getElementById('inv-product-id').value;
        if (!productId) {
          alert('Please enter a product ID');
          return;
        }
        callAPI(\`/api/\${instanceId}/inventory/products/\${productId}\`);
      }
      
      function testExportInventory() {
        callAPI(\`/api/\${instanceId}/inventory/export\`);
      }
    </script>
  `;
}

function getStyles(): string {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: #f5f7fa;
        padding: 20px;
        line-height: 1.6;
        color: #333;
      }
      
      .container {
        max-width: 900px;
        margin: 0 auto;
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      h1 {
        color: #0c6efd;
        margin-bottom: 5px;
        font-size: 28px;
      }
      
      .subtitle {
        color: #6c757d;
        margin-bottom: 30px;
        font-size: 14px;
      }
      
      .status-card {
        display: flex;
        align-items: center;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
        border: 2px solid;
      }
      
      .status-card.success {
        background: #d1e7dd;
        border-color: #badbcc;
        color: #0f5132;
      }
      
      .status-card.warning {
        background: #fff3cd;
        border-color: #ffecb5;
        color: #664d03;
      }
      
      .status-icon {
        font-size: 36px;
        margin-right: 20px;
      }
      
      .status-content h3 {
        margin-bottom: 5px;
        font-size: 20px;
      }
      
      .status-content p {
        margin: 0;
        opacity: 0.9;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .info-item {
        padding: 15px;
        background: #f8f9fa;
        border-radius: 6px;
      }
      
      .info-item label {
        display: block;
        font-size: 12px;
        text-transform: uppercase;
        color: #6c757d;
        margin-bottom: 8px;
        font-weight: 600;
      }
      
      .info-item code {
        background: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 13px;
        border: 1px solid #dee2e6;
        word-break: break-all;
        display: inline-block;
      }
      
      .actions {
        display: flex;
        gap: 10px;
        margin-bottom: 30px;
      }
      
      .btn {
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }
      
      .btn:active {
        transform: translateY(0);
      }
      
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
      
      .btn-primary {
        background: #0c6efd;
        color: white;
      }
      
      .btn-primary:hover {
        background: #0b5ed7;
      }
      
      .btn-secondary {
        background: #6c757d;
        color: white;
      }
      
      .btn-secondary:hover {
        background: #5c636a;
      }
      
      .results {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
      }
      
      .results h3 {
        margin-bottom: 15px;
        font-size: 16px;
      }
      
      .results pre {
        background: white;
        padding: 15px;
        border-radius: 6px;
        overflow-x: auto;
        font-size: 12px;
        border: 1px solid #dee2e6;
      }
      
      .info {
        background: #e7f3ff;
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid #0c6efd;
      }
      
      .info h3 {
        margin-bottom: 15px;
        color: #0c6efd;
        font-size: 18px;
      }
      
      .info ul {
        list-style-position: inside;
        margin-left: 0;
      }
      
      .info li {
        margin-bottom: 8px;
      }
      
      .info.warning {
        background: #fff3cd;
        border-left-color: #ffc107;
      }
      
      .info.warning h3 {
        color: #664d03;
      }
      
      .info.error {
        background: #f8d7da;
        border-left-color: #dc3545;
      }
      
      .info.error h3 {
        color: #842029;
      }
      
      code {
        background: #f4f4f4;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
      }
    </style>
  `;
}

export default router;
