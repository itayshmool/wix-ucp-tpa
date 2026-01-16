/**
 * Dashboard Routes
 * 
 * Merchant-facing dashboard and UI endpoints
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { instanceStore } from '../store/instances.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /dashboard
 * 
 * Main dashboard endpoint (will serve UI in future phases)
 */
router.get('/', (_req: Request, res: Response) => {
  // For now, return a simple HTML page
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Wix UCP TPA - Dashboard</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #0c6efd; margin-top: 0; }
        .status { color: #28a745; font-weight: bold; }
        .info { background: #e7f3ff; padding: 15px; border-radius: 4px; margin: 20px 0; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎉 Wix UCP TPA Dashboard</h1>
        <p class="status">✅ Your app is running!</p>
        
        <div class="info">
          <h3>Phase 1.1 Complete</h3>
          <p>OAuth integration and webhook handling are now active.</p>
        </div>
        
        <h3>Available Endpoints:</h3>
        <ul>
          <li><code>GET /auth/install</code> - Install app</li>
          <li><code>GET /auth/callback</code> - OAuth callback</li>
          <li><code>POST /webhooks</code> - Webhook receiver</li>
          <li><code>GET /dashboard</code> - This page</li>
        </ul>
        
        <h3>Next Steps:</h3>
        <ol>
          <li>Configure your Wix app with these URLs</li>
          <li>Test the OAuth flow</li>
          <li>Verify webhook delivery</li>
        </ol>
      </div>
    </body>
    </html>
  `);
});

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

export default router;
