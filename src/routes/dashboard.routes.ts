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
      const client = new WixApiClient(instance.accessToken);
      
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
    </head>
    <body>
      <div class="container">
        <h1>🏪 Store Agent Dashboard</h1>
        <p class="subtitle">Phase 1.3 - Connection & Status</p>
        
        <div class="status-card success">
          <div class="status-icon">✅</div>
          <div class="status-content">
            <h3>App Installed</h3>
            <p>Your Wix store is connected to Store Agent</p>
          </div>
        </div>
        
        ${!instance.accessToken || !instance.refreshToken ? `
        <div class="info warning">
          <h3>ℹ️ OAuth Not Configured</h3>
          <p>The app is installed, but OAuth tokens are not available yet.</p>
          <p>For Phase 1.3 (Dashboard), this is expected. OAuth will be needed for API calls in later phases.</p>
        </div>
        ` : ''}
        
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
          <div class="info-item">
            <label>OAuth Status</label>
            <span>${instance.accessToken ? '✅ Configured' : '⚠️ Not configured'}</span>
          </div>
        </div>
        
        <div class="actions">
          <button id="testConnectionBtn" class="btn btn-primary">
            🔌 Test Connection
          </button>
          <button id="viewInstancesBtn" class="btn btn-secondary" onclick="window.open('/dashboard/instances', '_blank')">
            📋 View All Instances
          </button>
        </div>
        
        <div id="results" class="results" style="display: none;">
          <h3>Connection Test Results</h3>
          <pre id="resultsContent"></pre>
        </div>
        
        <div class="info">
          <h3>📚 Next Steps (Phase 2+)</h3>
          <ul>
            <li><strong>Phase 2:</strong> Product catalog integration</li>
            <li><strong>Phase 3:</strong> Hosted checkout & cart management</li>
            <li><strong>Phase 4-6:</strong> UCP layer for AI commerce</li>
          </ul>
        </div>
      </div>
      
      <script>
        const instanceId = '${instanceId}';
        
        document.getElementById('testConnectionBtn').addEventListener('click', async () => {
          const btn = document.getElementById('testConnectionBtn');
          const results = document.getElementById('results');
          const resultsContent = document.getElementById('resultsContent');
          
          btn.disabled = true;
          btn.textContent = '⏳ Testing...';
          results.style.display = 'block';
          resultsContent.textContent = 'Connecting to Wix API...';
          
          try {
            const response = await fetch('/dashboard/api/test-connection/' + instanceId, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (data.success) {
              resultsContent.textContent = '✅ Success!\\n\\n' + JSON.stringify(data, null, 2);
              resultsContent.style.color = '#28a745';
            } else {
              resultsContent.textContent = '❌ Failed:\\n\\n' + JSON.stringify(data, null, 2);
              resultsContent.style.color = '#dc3545';
            }
          } catch (error) {
            resultsContent.textContent = '❌ Error: ' + error.message;
            resultsContent.style.color = '#dc3545';
          } finally {
            btn.disabled = false;
            btn.textContent = '🔌 Test Connection';
          }
        });
      </script>
    </body>
    </html>
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
