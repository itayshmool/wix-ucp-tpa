/**
 * Authentication Routes
 * 
 * Handles OAuth flow for Wix app installation
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import {
  getAuthorizationUrl,
  handleOAuthCallback,
} from '../wix/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /auth/install
 * 
 * Initial installation endpoint - redirects to Wix authorization
 */
router.get(
  '/install',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('App installation initiated');

    // Get state parameter if provided
    const state = req.query.state as string | undefined;

    // Generate authorization URL
    const authUrl = getAuthorizationUrl(state);

    logger.debug('Redirecting to Wix authorization', { hasState: !!state });

    // Redirect to Wix OAuth page
    res.redirect(authUrl);
  })
);

/**
 * GET /auth/callback
 * 
 * OAuth callback - receives authorization code and exchanges for tokens
 */
router.get(
  '/callback',
  asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      logger.warn('OAuth callback missing authorization code');
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing authorization code',
      });
      return;
    }

    logger.info('OAuth callback received', { hasState: !!state });

    // Handle OAuth callback
    const result = await handleOAuthCallback({
      code,
      state: state as string | undefined,
    });

    logger.info('OAuth flow completed', { instanceId: result.instanceId });

    // Redirect to success page or dashboard
    // For now, return JSON response
    res.json({
      success: true,
      message: 'App installed successfully',
      instanceId: result.instanceId,
    });
  })
);

/**
 * GET /auth/status
 * 
 * Check authentication status (for debugging)
 */
router.get(
  '/status',
  asyncHandler(async (req: Request, res: Response) => {
    const instanceId = req.query.instanceId as string | undefined;

    if (!instanceId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing instanceId parameter',
      });
      return;
    }

    // Import here to avoid circular dependencies
    const { instanceStore } = await import('../store/instances.js');
    const instance = instanceStore.get(instanceId);

    if (!instance) {
      res.status(404).json({
        authenticated: false,
        message: 'Instance not found',
      });
      return;
    }

    res.json({
      authenticated: true,
      instanceId: instance.instanceId,
      installedAt: instance.installedAt,
      hasSiteId: !!instance.siteId,
    });
  })
);

export default router;
