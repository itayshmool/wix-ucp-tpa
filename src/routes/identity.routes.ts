/**
 * Identity & Consent Routes
 * 
 * Endpoints for identity linking and GDPR consent management (Phase 14)
 */

import { Router, Request, Response } from 'express';
import {
  linkIdentity,
  getIdentity,
  getIdentityByPlatform,
  unlinkPlatform,
  deleteIdentity,
  listIdentities,
  getIdentityStats,
} from '../services/identity/identity.service.js';
import {
  LinkIdentityRequestSchema,
  UnlinkIdentityRequestSchema,
} from '../services/identity/identity.types.js';
import {
  grantConsent,
  withdrawConsent,
  checkConsent,
  getSubjectConsents,
  exportSubjectData,
  deleteSubjectData,
  getConsentStats,
} from '../services/consent/consent.service.js';
import {
  GrantConsentRequestSchema,
  WithdrawConsentRequestSchema,
  GDPRDeletionRequestSchema,
  ConsentType,
} from '../services/consent/consent.types.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================================================
// Identity Linking
// ============================================================================

/**
 * Link a platform identity
 * POST /ucp/identity/link
 */
router.post('/ucp/identity/link', (req: Request, res: Response) => {
  const parseResult = LinkIdentityRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: parseResult.error.errors,
    });
    return;
  }

  const result = linkIdentity(parseResult.data);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.status(result.isNew ? 201 : 200).json(result);
});

/**
 * Get identity by primary ID
 * GET /ucp/identity/:primaryId
 */
router.get('/ucp/identity/:primaryId', (req: Request, res: Response) => {
  const { primaryId } = req.params;

  const identity = getIdentity({ primaryId });

  if (!identity) {
    res.status(404).json({
      error: 'Identity not found',
      code: 'IDENTITY_NOT_FOUND',
    });
    return;
  }

  res.json(identity);
});

/**
 * Get identity by platform
 * GET /ucp/identity/platform/:platform/:userId
 */
router.get('/ucp/identity/platform/:platform/:userId', (req: Request, res: Response) => {
  const { platform, userId } = req.params;

  const identity = getIdentityByPlatform(platform, userId);

  if (!identity) {
    res.status(404).json({
      error: 'Identity not found for this platform',
      code: 'IDENTITY_NOT_FOUND',
    });
    return;
  }

  res.json(identity);
});

/**
 * Unlink a platform from an identity
 * DELETE /ucp/identity/:primaryId/platform/:platform/:userId
 */
router.delete('/ucp/identity/:primaryId/platform/:platform/:userId', (req: Request, res: Response) => {
  const { primaryId, platform, userId } = req.params;

  const parseResult = UnlinkIdentityRequestSchema.safeParse({ platform, userId });
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: parseResult.error.errors,
    });
    return;
  }

  const result = unlinkPlatform(primaryId, parseResult.data);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

/**
 * Delete an entire identity
 * DELETE /ucp/identity/:primaryId
 */
router.delete('/ucp/identity/:primaryId', (req: Request, res: Response) => {
  const { primaryId } = req.params;

  const deleted = deleteIdentity(primaryId);

  if (!deleted) {
    res.status(404).json({
      error: 'Identity not found',
      code: 'IDENTITY_NOT_FOUND',
    });
    return;
  }

  res.json({ success: true, message: 'Identity deleted' });
});

/**
 * List all identities (admin)
 * GET /ucp/identities
 */
router.get('/ucp/identities', (_req: Request, res: Response) => {
  const identities = listIdentities();
  res.json({ identities, total: identities.length });
});

/**
 * Get identity statistics
 * GET /ucp/identity/stats
 */
router.get('/ucp/identity-stats', (_req: Request, res: Response) => {
  const stats = getIdentityStats();
  res.json(stats);
});

// ============================================================================
// Consent Management
// ============================================================================

/**
 * Grant or update consents
 * POST /ucp/consent
 */
router.post('/ucp/consent', (req: Request, res: Response) => {
  const parseResult = GrantConsentRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: parseResult.error.errors,
    });
    return;
  }

  logger.info('Consent: Processing consent grant', {
    subjectId: parseResult.data.subjectId,
    count: parseResult.data.consents.length,
  });

  const result = grantConsent(parseResult.data);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

/**
 * Get all consents for a subject
 * GET /ucp/consent/:subjectId
 */
router.get('/ucp/consent/:subjectId', (req: Request, res: Response) => {
  const { subjectId } = req.params;

  const consents = getSubjectConsents(subjectId);

  if (!consents) {
    res.status(404).json({
      error: 'Subject not found',
      code: 'SUBJECT_NOT_FOUND',
    });
    return;
  }

  res.json(consents);
});

/**
 * Check specific consent
 * GET /ucp/consent/:subjectId/:type
 */
router.get('/ucp/consent/:subjectId/:type', (req: Request, res: Response) => {
  const { subjectId, type } = req.params;

  const validTypes = ['marketing', 'analytics', 'personalization', 'third_party', 'cookies', 'terms', 'privacy'];
  if (!validTypes.includes(type)) {
    res.status(400).json({
      error: 'Invalid consent type',
      code: 'INVALID_CONSENT_TYPE',
      validTypes,
    });
    return;
  }

  const check = checkConsent(subjectId, type as ConsentType);
  res.json(check);
});

/**
 * Withdraw a specific consent
 * DELETE /ucp/consent/:subjectId/:type
 */
router.delete('/ucp/consent/:subjectId/:type', (req: Request, res: Response) => {
  const { subjectId, type } = req.params;
  const { reason } = req.body || {};

  const parseResult = WithdrawConsentRequestSchema.safeParse({ subjectId, type, reason });
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: parseResult.error.errors,
    });
    return;
  }

  const result = withdrawConsent(parseResult.data);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

/**
 * Get consent statistics
 * GET /ucp/consent-stats
 */
router.get('/ucp/consent-stats', (_req: Request, res: Response) => {
  const stats = getConsentStats();
  res.json(stats);
});

// ============================================================================
// GDPR Endpoints
// ============================================================================

/**
 * Export all data for a subject (GDPR data portability)
 * GET /ucp/gdpr/export/:subjectId
 */
router.get('/ucp/gdpr/export/:subjectId', (req: Request, res: Response) => {
  const { subjectId } = req.params;

  logger.info('GDPR: Export requested', { subjectId });

  const data = exportSubjectData(subjectId);

  if (!data) {
    res.status(404).json({
      error: 'Subject not found',
      code: 'SUBJECT_NOT_FOUND',
    });
    return;
  }

  res.json(data);
});

/**
 * Delete all data for a subject (GDPR right to erasure)
 * POST /ucp/gdpr/delete
 */
router.post('/ucp/gdpr/delete', (req: Request, res: Response) => {
  const parseResult = GDPRDeletionRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: parseResult.error.errors,
    });
    return;
  }

  logger.info('GDPR: Deletion requested', { subjectId: parseResult.data.subjectId });

  const result = deleteSubjectData(parseResult.data);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

export default router;
