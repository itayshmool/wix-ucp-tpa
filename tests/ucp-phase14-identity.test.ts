/**
 * UCP Phase 14 Tests - Identity & Consent
 * 
 * Tests for:
 * - Identity linking across platforms
 * - Consent management (GDPR)
 * - Data export and deletion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock config
vi.mock('../src/config/env.js', () => ({
  config: {
    BASE_URL: 'https://test.example.com',
    PORT: 3000,
  },
}));

// Import routes after mocking
import identityRoutes from '../src/routes/identity.routes.js';
import ucpRoutes from '../src/routes/ucp.routes.js';

// Import services for clearing test data
import { clearIdentityData } from '../src/services/identity/identity.service.js';
import { clearConsentData } from '../src/services/consent/consent.service.js';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/', identityRoutes);
  app.use('/', ucpRoutes);
  return app;
}

describe('UCP Phase 14: Identity & Consent', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    clearIdentityData();
    clearConsentData();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // Identity Linking
  // ==========================================================================
  describe('Identity Linking', () => {
    describe('POST /ucp/identity/link', () => {
      it('should create a new linked identity', async () => {
        const response = await request(app)
          .post('/ucp/identity/link')
          .send({
            primaryId: 'john@example.com',
            primaryIdType: 'email',
            platform: 'wix',
            userId: 'wix-user-123',
            displayName: 'John Doe',
            email: 'john@example.com',
            verified: true,
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.isNew).toBe(true);
        expect(response.body.identity).toBeDefined();
        expect(response.body.identity.primaryId).toBe('john@example.com');
        expect(response.body.identity.platforms).toHaveLength(1);
        expect(response.body.identity.platforms[0].platform).toBe('wix');
      });

      it('should add platform to existing identity', async () => {
        // Create first platform link
        await request(app)
          .post('/ucp/identity/link')
          .send({
            primaryId: 'john@example.com',
            platform: 'wix',
            userId: 'wix-user-123',
          })
          .expect(201);

        // Add second platform
        const response = await request(app)
          .post('/ucp/identity/link')
          .send({
            primaryId: 'john@example.com',
            platform: 'google',
            userId: 'google-user-456',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.isNew).toBe(false);
        expect(response.body.identity.platforms).toHaveLength(2);
      });

      it('should reject if platform already linked to different identity', async () => {
        // Create first identity
        await request(app)
          .post('/ucp/identity/link')
          .send({
            primaryId: 'john@example.com',
            platform: 'wix',
            userId: 'wix-user-123',
          })
          .expect(201);

        // Try to link same platform to different identity
        const response = await request(app)
          .post('/ucp/identity/link')
          .send({
            primaryId: 'jane@example.com',
            platform: 'wix',
            userId: 'wix-user-123',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('PLATFORM_ALREADY_LINKED');
      });

      it('should reject missing required fields', async () => {
        const response = await request(app)
          .post('/ucp/identity/link')
          .send({
            primaryId: 'john@example.com',
            // Missing platform and userId
          })
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /ucp/identity/:primaryId', () => {
      it('should return identity by primary ID', async () => {
        // Create identity
        await request(app)
          .post('/ucp/identity/link')
          .send({
            primaryId: 'john@example.com',
            platform: 'wix',
            userId: 'wix-user-123',
          });

        const response = await request(app)
          .get('/ucp/identity/john@example.com')
          .expect(200);

        expect(response.body.primaryId).toBe('john@example.com');
        expect(response.body.platforms).toHaveLength(1);
      });

      it('should return 404 for non-existent identity', async () => {
        const response = await request(app)
          .get('/ucp/identity/unknown@example.com')
          .expect(404);

        expect(response.body.code).toBe('IDENTITY_NOT_FOUND');
      });
    });

    describe('GET /ucp/identity/platform/:platform/:userId', () => {
      it('should return identity by platform', async () => {
        await request(app)
          .post('/ucp/identity/link')
          .send({
            primaryId: 'john@example.com',
            platform: 'wix',
            userId: 'wix-user-123',
          });

        const response = await request(app)
          .get('/ucp/identity/platform/wix/wix-user-123')
          .expect(200);

        expect(response.body.primaryId).toBe('john@example.com');
      });
    });

    describe('DELETE /ucp/identity/:primaryId/platform/:platform/:userId', () => {
      it('should unlink a platform', async () => {
        // Create identity with two platforms
        await request(app)
          .post('/ucp/identity/link')
          .send({ primaryId: 'john@example.com', platform: 'wix', userId: 'wix-123' });

        await request(app)
          .post('/ucp/identity/link')
          .send({ primaryId: 'john@example.com', platform: 'google', userId: 'google-456' });

        // Unlink one platform
        const response = await request(app)
          .delete('/ucp/identity/john@example.com/platform/wix/wix-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.identity.platforms).toHaveLength(1);
        expect(response.body.identity.platforms[0].platform).toBe('google');
      });
    });

    describe('DELETE /ucp/identity/:primaryId', () => {
      it('should delete entire identity', async () => {
        await request(app)
          .post('/ucp/identity/link')
          .send({ primaryId: 'john@example.com', platform: 'wix', userId: 'wix-123' });

        await request(app)
          .delete('/ucp/identity/john@example.com')
          .expect(200);

        // Verify deleted
        await request(app)
          .get('/ucp/identity/john@example.com')
          .expect(404);
      });
    });
  });

  // ==========================================================================
  // Consent Management
  // ==========================================================================
  describe('Consent Management', () => {
    describe('POST /ucp/consent', () => {
      it('should grant multiple consents', async () => {
        const response = await request(app)
          .post('/ucp/consent')
          .send({
            subjectId: 'john@example.com',
            subjectType: 'email',
            consents: [
              { type: 'marketing', granted: true },
              { type: 'analytics', granted: true },
              { type: 'cookies', granted: false },
            ],
            source: 'checkout_form',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.consents).toBeDefined();
        expect(response.body.consents.consents.marketing.status).toBe('granted');
        expect(response.body.consents.consents.analytics.status).toBe('granted');
        expect(response.body.consents.consents.cookies.status).toBe('denied');
      });

      it('should reject empty consents array', async () => {
        const response = await request(app)
          .post('/ucp/consent')
          .send({
            subjectId: 'john@example.com',
            consents: [],
          })
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /ucp/consent/:subjectId', () => {
      it('should return all consents for subject', async () => {
        await request(app)
          .post('/ucp/consent')
          .send({
            subjectId: 'john@example.com',
            consents: [
              { type: 'marketing', granted: true },
              { type: 'terms', granted: true },
            ],
          });

        const response = await request(app)
          .get('/ucp/consent/john@example.com')
          .expect(200);

        expect(response.body.subjectId).toBe('john@example.com');
        expect(response.body.consents.marketing).toBeDefined();
        expect(response.body.consents.terms).toBeDefined();
      });

      it('should return 404 for unknown subject', async () => {
        const response = await request(app)
          .get('/ucp/consent/unknown@example.com')
          .expect(404);

        expect(response.body.code).toBe('SUBJECT_NOT_FOUND');
      });
    });

    describe('GET /ucp/consent/:subjectId/:type', () => {
      it('should check specific consent', async () => {
        await request(app)
          .post('/ucp/consent')
          .send({
            subjectId: 'john@example.com',
            consents: [{ type: 'marketing', granted: true }],
          });

        const response = await request(app)
          .get('/ucp/consent/john@example.com/marketing')
          .expect(200);

        expect(response.body.hasConsent).toBe(true);
        expect(response.body.status).toBe('granted');
      });

      it('should return pending for non-existent consent', async () => {
        const response = await request(app)
          .get('/ucp/consent/john@example.com/marketing')
          .expect(200);

        expect(response.body.hasConsent).toBe(false);
        expect(response.body.status).toBe('pending');
      });

      it('should reject invalid consent type', async () => {
        const response = await request(app)
          .get('/ucp/consent/john@example.com/invalid_type')
          .expect(400);

        expect(response.body.code).toBe('INVALID_CONSENT_TYPE');
      });
    });

    describe('DELETE /ucp/consent/:subjectId/:type', () => {
      it('should withdraw consent', async () => {
        await request(app)
          .post('/ucp/consent')
          .send({
            subjectId: 'john@example.com',
            consents: [{ type: 'marketing', granted: true }],
          });

        const response = await request(app)
          .delete('/ucp/consent/john@example.com/marketing')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.consents.consents.marketing.status).toBe('withdrawn');
      });
    });
  });

  // ==========================================================================
  // GDPR Endpoints
  // ==========================================================================
  describe('GDPR Endpoints', () => {
    describe('GET /ucp/gdpr/export/:subjectId', () => {
      it('should export all subject data', async () => {
        // Create consent data
        await request(app)
          .post('/ucp/consent')
          .send({
            subjectId: 'john@example.com',
            consents: [
              { type: 'marketing', granted: true },
              { type: 'analytics', granted: false },
            ],
          });

        const response = await request(app)
          .get('/ucp/gdpr/export/john@example.com')
          .expect(200);

        expect(response.body.subjectId).toBe('john@example.com');
        expect(response.body.exportedAt).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.consents).toBeDefined();
      });

      it('should return 404 for unknown subject', async () => {
        const response = await request(app)
          .get('/ucp/gdpr/export/unknown@example.com')
          .expect(404);

        expect(response.body.code).toBe('SUBJECT_NOT_FOUND');
      });
    });

    describe('POST /ucp/gdpr/delete', () => {
      it('should delete all subject data', async () => {
        // Create consent data
        await request(app)
          .post('/ucp/consent')
          .send({
            subjectId: 'john@example.com',
            consents: [{ type: 'marketing', granted: true }],
          });

        const response = await request(app)
          .post('/ucp/gdpr/delete')
          .send({
            subjectId: 'john@example.com',
            confirmDeletion: true,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.deletedRecords).toBeGreaterThan(0);

        // Verify deleted
        await request(app)
          .get('/ucp/consent/john@example.com')
          .expect(404);
      });

      it('should reject without confirmation', async () => {
        const response = await request(app)
          .post('/ucp/gdpr/delete')
          .send({
            subjectId: 'john@example.com',
            // Missing confirmDeletion: true
          })
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  // ==========================================================================
  // Statistics
  // ==========================================================================
  describe('Statistics', () => {
    describe('GET /ucp/identity-stats', () => {
      it('should return identity statistics', async () => {
        await request(app)
          .post('/ucp/identity/link')
          .send({ primaryId: 'john@example.com', platform: 'wix', userId: 'wix-1' });

        await request(app)
          .post('/ucp/identity/link')
          .send({ primaryId: 'jane@example.com', platform: 'google', userId: 'google-1' });

        const response = await request(app)
          .get('/ucp/identity-stats')
          .expect(200);

        expect(response.body.total).toBe(2);
        expect(response.body.byPlatform).toBeDefined();
      });
    });

    describe('GET /ucp/consent-stats', () => {
      it('should return consent statistics', async () => {
        await request(app)
          .post('/ucp/consent')
          .send({
            subjectId: 'john@example.com',
            consents: [
              { type: 'marketing', granted: true },
              { type: 'analytics', granted: false },
            ],
          });

        const response = await request(app)
          .get('/ucp/consent-stats')
          .expect(200);

        expect(response.body.totalSubjects).toBe(1);
        expect(response.body.byType).toBeDefined();
        expect(response.body.byType.marketing.granted).toBe(1);
        expect(response.body.byType.analytics.denied).toBe(1);
      });
    });
  });

  // ==========================================================================
  // Discovery Integration
  // ==========================================================================
  describe('Discovery Integration', () => {
    it('should include identity_linking capability', async () => {
      const response = await request(app)
        .get('/.well-known/ucp')
        .expect(200);

      expect(response.body.capabilities).toContain('identity_linking');
    });

    it('should include identity bindings', async () => {
      const response = await request(app)
        .get('/.well-known/ucp')
        .expect(200);

      expect(response.body.bindings.identity).toBeDefined();
      expect(response.body.bindings.identity.link).toContain('/ucp/identity/link');
      expect(response.body.bindings.identity.consent).toContain('/ucp/consent');
      expect(response.body.bindings.identity.gdprExport).toContain('/ucp/gdpr/export');
    });
  });
});
