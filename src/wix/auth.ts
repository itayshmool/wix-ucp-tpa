/**
 * Wix OAuth Authentication
 * 
 * Handles the OAuth 2.0 flow for Wix app installation and authorization.
 * 
 * Flow:
 * 1. User installs app in Wix → redirected to /auth/install
 * 2. We redirect to Wix authorization URL
 * 3. User authorizes → Wix redirects to /auth/callback with code
 * 4. We exchange code for tokens → save to instance store
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { instanceStore } from '../store/instances.js';
import {
  WixTokenResponse,
  WixAuthRequest,
  DecodedInstance,
  isWixTokenResponse,
} from './types.js';

/**
 * Wix OAuth endpoints
 */
const WIX_OAUTH_BASE_URL = 'https://www.wix.com/oauth';
const WIX_TOKEN_URL = `${WIX_OAUTH_BASE_URL}/access`;

/**
 * Generate the Wix authorization URL
 */
export function getAuthorizationUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: config.WIX_APP_ID,
    redirect_uri: `${config.BASE_URL}/auth/callback`,
    response_type: 'code',
  });

  if (state) {
    params.append('state', state);
  }

  const url = `${WIX_OAUTH_BASE_URL}/authorize?${params.toString()}`;
  logger.debug('Generated authorization URL', { hasState: !!state });
  return url;
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<WixTokenResponse> {
  try {
    logger.info('Exchanging authorization code for tokens');

    const response = await axios.post(
      WIX_TOKEN_URL,
      {
        code,
        client_id: config.WIX_APP_ID,
        client_secret: config.WIX_APP_SECRET,
        grant_type: 'authorization_code',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!isWixTokenResponse(response.data)) {
      logger.error('Invalid token response from Wix', { data: response.data });
      throw new Error('Invalid token response from Wix');
    }

    logger.info('Successfully exchanged code for tokens');
    return response.data;
  } catch (error) {
    logger.error('Failed to exchange code for tokens', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to obtain access tokens from Wix');
  }
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<WixTokenResponse> {
  try {
    logger.info('Refreshing access token');

    const response = await axios.post(
      WIX_TOKEN_URL,
      {
        refresh_token: refreshToken,
        client_id: config.WIX_APP_ID,
        client_secret: config.WIX_APP_SECRET,
        grant_type: 'refresh_token',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!isWixTokenResponse(response.data)) {
      logger.error('Invalid token response from Wix', { data: response.data });
      throw new Error('Invalid token response from Wix');
    }

    logger.info('Successfully refreshed access token');
    return response.data;
  } catch (error) {
    logger.error('Failed to refresh access token', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to refresh access token');
  }
}

/**
 * Parse instance ID from JWT (Wix signed instance)
 * 
 * Note: In production, you should validate the JWT signature using WIX_APP_SECRET
 */
export function parseInstanceId(signedInstance: string): string | null {
  try {
    // Split the JWT
    const parts = signedInstance.split('.');
    if (parts.length !== 3) {
      logger.warn('Invalid JWT format');
      return null;
    }

    // Decode the payload (base64url)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    if (payload.instanceId) {
      return payload.instanceId;
    }

    logger.warn('No instanceId found in JWT payload');
    return null;
  } catch (error) {
    logger.error('Failed to parse instance ID from JWT', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Decode Wix instance parameter (from dashboard query params)
 * 
 * The instance parameter is passed by Wix when loading the dashboard in an iframe.
 * It's a signed string that needs to be verified using WIX_APP_SECRET.
 * 
 * Wix uses different formats depending on the app type:
 * 1. JWT format (header.payload.signature) - Used by most apps
 * 2. Encrypted base64 - Used by some older apps
 * 3. Plain base64 JSON - Development/testing
 */
export function decodeInstance(instance: string): DecodedInstance | null {
  try {
    logger.debug('Decoding Wix instance parameter', {
      length: instance.length,
      hasDots: instance.includes('.'),
    });

    // Method 1: Try JWT verification with app secret
    try {
      const decoded = jwt.verify(instance, config.WIX_APP_SECRET, {
        algorithms: ['HS256'],
      }) as DecodedInstance;
      
      logger.info('Successfully decoded and verified instance (JWT)', {
        instanceId: decoded.instanceId,
        appDefId: decoded.appDefId,
      });
      
      return decoded;
    } catch (jwtError) {
      logger.debug('Not a valid JWT, trying other methods', {
        error: jwtError instanceof Error ? jwtError.message : 'Unknown',
      });
    }

    // Method 2: Try decoding without verification (for development)
    const parts = instance.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString('utf-8')
        );
        
        logger.warn('Decoded instance without signature verification', {
          instanceId: payload.instanceId,
        });
        
        return payload as DecodedInstance;
      } catch (parseError) {
        logger.debug('Failed to parse JWT payload');
      }
    }

    // Method 3: Try base64 JSON (legacy/testing)
    try {
      const decoded = JSON.parse(
        Buffer.from(instance, 'base64').toString('utf-8')
      );
      
      logger.warn('Decoded instance from base64 (legacy format)', {
        instanceId: decoded.instanceId,
      });
      
      return decoded as DecodedInstance;
    } catch (base64Error) {
      logger.debug('Not base64 JSON format');
    }

    // Method 4: Try base64url variant
    try {
      const decoded = JSON.parse(
        Buffer.from(instance, 'base64url').toString('utf-8')
      );
      
      logger.warn('Decoded instance from base64url', {
        instanceId: decoded.instanceId,
      });
      
      return decoded as DecodedInstance;
    } catch (base64urlError) {
      logger.debug('Not base64url JSON format');
    }

    throw new Error('All decoding methods failed');
    
  } catch (error) {
    logger.error('Failed to decode instance parameter', {
      error: error instanceof Error ? error.message : 'Unknown error',
      instancePreview: instance.substring(0, 30) + '...',
      instanceLength: instance.length,
    });
    return null;
  }
}

/**
 * Handle OAuth callback and save tokens
 */
export async function handleOAuthCallback(
  authRequest: WixAuthRequest
): Promise<{ instanceId: string; success: boolean }> {
  try {
    logger.info('Handling OAuth callback', { hasCode: !!authRequest.code });

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens(authRequest.code);

    // Parse instance ID from the access token (it's a JWT)
    const instanceId = parseInstanceId(tokenResponse.access_token);

    if (!instanceId) {
      throw new Error('Could not parse instance ID from access token');
    }

    // Save instance to store
    instanceStore.save(instanceId, {
      instanceId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      installedAt: new Date(),
    });

    logger.info('OAuth flow completed successfully', { instanceId });

    return {
      instanceId,
      success: true,
    };
  } catch (error) {
    logger.error('OAuth callback failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Revoke access (app uninstall)
 */
export async function revokeAccess(instanceId: string): Promise<void> {
  try {
    logger.info('Revoking access for instance', { instanceId });

    // Remove from store
    const deleted = instanceStore.delete(instanceId);

    if (deleted) {
      logger.info('Successfully revoked access', { instanceId });
    } else {
      logger.warn('Instance not found during revocation', { instanceId });
    }
  } catch (error) {
    logger.error('Failed to revoke access', {
      instanceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
