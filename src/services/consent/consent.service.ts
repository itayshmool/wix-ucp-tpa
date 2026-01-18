/**
 * Consent Management Service
 * 
 * GDPR-compliant consent tracking (Phase 14)
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import {
  ConsentType,
  ConsentStatus,
  ConsentRecord,
  SubjectConsent,
  GrantConsentRequest,
  GrantConsentResponse,
  WithdrawConsentRequest,
  ConsentCheck,
  GDPRExport,
  GDPRDeletionRequest,
  ConsentErrorCodes,
} from './consent.types.js';

// ============================================================================
// In-Memory Storage (use database in production)
// ============================================================================

// Map of subjectId -> SubjectConsent
const subjectConsents: Map<string, SubjectConsent> = new Map();

// Audit log
const auditLog: Array<{
  timestamp: string;
  action: string;
  subjectId: string;
  type?: ConsentType;
  status?: ConsentStatus;
  source: string;
  ipAddress?: string;
}> = [];

// ============================================================================
// Consent Management
// ============================================================================

/**
 * Grant or update consents for a subject
 */
export function grantConsent(request: GrantConsentRequest): GrantConsentResponse {
  const { subjectId, subjectType, consents: consentRequests, source, ipAddress, userAgent, policyVersion } = request;
  
  logger.info('Consent: Granting consents', { subjectId, count: consentRequests.length });
  
  const now = new Date().toISOString();
  
  // Get or create subject consent
  let subjectConsent = subjectConsents.get(subjectId);
  if (!subjectConsent) {
    subjectConsent = {
      subjectId,
      subjectType,
      consents: {} as Record<ConsentType, ConsentRecord>,
      lastUpdated: now,
    };
    subjectConsents.set(subjectId, subjectConsent);
  }
  
  // Process each consent
  for (const consentRequest of consentRequests) {
    const { type, granted } = consentRequest;
    
    const existingConsent = subjectConsent.consents[type];
    
    const consentRecord: ConsentRecord = {
      id: existingConsent?.id || `consent_${uuidv4()}`,
      subjectId,
      subjectType,
      type,
      status: granted ? 'granted' : 'denied',
      grantedAt: granted ? now : existingConsent?.grantedAt,
      withdrawnAt: !granted && existingConsent?.status === 'granted' ? now : undefined,
      source,
      ipAddress,
      userAgent,
      policyVersion,
      createdAt: existingConsent?.createdAt || now,
      updatedAt: now,
    };
    
    subjectConsent.consents[type] = consentRecord;
    
    // Audit log
    auditLog.push({
      timestamp: now,
      action: granted ? 'CONSENT_GRANTED' : 'CONSENT_DENIED',
      subjectId,
      type,
      status: consentRecord.status,
      source,
      ipAddress,
    });
  }
  
  subjectConsent.lastUpdated = now;
  
  logger.info('Consent: Consents updated', { subjectId });
  
  return {
    success: true,
    consents: subjectConsent,
  };
}

/**
 * Withdraw a specific consent
 */
export function withdrawConsent(request: WithdrawConsentRequest): GrantConsentResponse {
  const { subjectId, type, reason } = request;
  
  logger.info('Consent: Withdrawing consent', { subjectId, type });
  
  const subjectConsent = subjectConsents.get(subjectId);
  if (!subjectConsent) {
    return {
      success: false,
      error: 'Subject not found',
      errorCode: ConsentErrorCodes.SUBJECT_NOT_FOUND,
    };
  }
  
  const consent = subjectConsent.consents[type];
  if (!consent) {
    return {
      success: false,
      error: 'Consent record not found',
      errorCode: ConsentErrorCodes.CONSENT_NOT_FOUND,
    };
  }
  
  const now = new Date().toISOString();
  
  consent.status = 'withdrawn';
  consent.withdrawnAt = now;
  consent.updatedAt = now;
  
  subjectConsent.lastUpdated = now;
  
  // Audit log
  auditLog.push({
    timestamp: now,
    action: 'CONSENT_WITHDRAWN',
    subjectId,
    type,
    status: 'withdrawn',
    source: reason || 'user_request',
  });
  
  logger.info('Consent: Consent withdrawn', { subjectId, type });
  
  return {
    success: true,
    consents: subjectConsent,
  };
}

/**
 * Check if a subject has consent for a specific type
 */
export function checkConsent(subjectId: string, type: ConsentType): ConsentCheck {
  const subjectConsent = subjectConsents.get(subjectId);
  
  if (!subjectConsent || !subjectConsent.consents[type]) {
    return {
      subjectId,
      type,
      hasConsent: false,
      status: 'pending',
    };
  }
  
  const consent = subjectConsent.consents[type];
  
  // Check if expired
  if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
    return {
      subjectId,
      type,
      hasConsent: false,
      status: 'pending',
      expiresAt: consent.expiresAt,
    };
  }
  
  return {
    subjectId,
    type,
    hasConsent: consent.status === 'granted',
    status: consent.status,
    grantedAt: consent.grantedAt,
    expiresAt: consent.expiresAt,
  };
}

/**
 * Get all consents for a subject
 */
export function getSubjectConsents(subjectId: string): SubjectConsent | undefined {
  return subjectConsents.get(subjectId);
}

/**
 * Check multiple consent types at once
 */
export function checkMultipleConsents(
  subjectId: string,
  types: ConsentType[]
): Record<ConsentType, ConsentCheck> {
  const results: Record<string, ConsentCheck> = {};
  
  for (const type of types) {
    results[type] = checkConsent(subjectId, type);
  }
  
  return results as Record<ConsentType, ConsentCheck>;
}

// ============================================================================
// GDPR Functions
// ============================================================================

/**
 * Export all data for a subject (GDPR data portability)
 */
export function exportSubjectData(subjectId: string): GDPRExport | undefined {
  const consents = subjectConsents.get(subjectId);
  
  if (!consents) {
    return undefined;
  }
  
  logger.info('GDPR: Exporting data', { subjectId });
  
  // Audit log
  auditLog.push({
    timestamp: new Date().toISOString(),
    action: 'GDPR_DATA_EXPORT',
    subjectId,
    source: 'api',
  });
  
  return {
    subjectId,
    exportedAt: new Date().toISOString(),
    data: {
      consents,
      // In production, include orders, activity, etc.
      orders: [],
      activity: auditLog.filter(a => a.subjectId === subjectId),
    },
  };
}

/**
 * Delete all data for a subject (GDPR right to erasure)
 */
export function deleteSubjectData(request: GDPRDeletionRequest): {
  success: boolean;
  deletedRecords?: number;
  error?: string;
  errorCode?: string;
} {
  const { subjectId, reason } = request;
  
  logger.info('GDPR: Deleting subject data', { subjectId });
  
  const consents = subjectConsents.get(subjectId);
  if (!consents) {
    return {
      success: false,
      error: 'Subject not found',
      errorCode: ConsentErrorCodes.SUBJECT_NOT_FOUND,
    };
  }
  
  const deletedRecords = Object.keys(consents.consents).length;
  
  // Delete consents
  subjectConsents.delete(subjectId);
  
  // Audit log (keep minimal record of deletion for compliance)
  auditLog.push({
    timestamp: new Date().toISOString(),
    action: 'GDPR_DATA_DELETED',
    subjectId: 'REDACTED', // Don't store the actual ID after deletion
    source: reason || 'user_request',
  });
  
  logger.info('GDPR: Data deleted', { deletedRecords });
  
  return {
    success: true,
    deletedRecords,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all consent data (for testing)
 */
export function clearConsentData(): void {
  subjectConsents.clear();
  auditLog.length = 0;
  logger.info('Consent: Data cleared');
}

/**
 * Get consent statistics
 */
export function getConsentStats(): {
  totalSubjects: number;
  byType: Record<ConsentType, { granted: number; denied: number; withdrawn: number }>;
  recentActivity: number;
} {
  const byType: Record<string, { granted: number; denied: number; withdrawn: number }> = {};
  
  const consentTypes: ConsentType[] = ['marketing', 'analytics', 'personalization', 'third_party', 'cookies', 'terms', 'privacy'];
  
  for (const type of consentTypes) {
    byType[type] = { granted: 0, denied: 0, withdrawn: 0 };
  }
  
  for (const subject of subjectConsents.values()) {
    for (const [type, consent] of Object.entries(subject.consents)) {
      if (byType[type]) {
        byType[type][consent.status as 'granted' | 'denied' | 'withdrawn']++;
      }
    }
  }
  
  // Count recent activity (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentActivity = auditLog.filter(a => a.timestamp > oneDayAgo).length;
  
  return {
    totalSubjects: subjectConsents.size,
    byType: byType as Record<ConsentType, { granted: number; denied: number; withdrawn: number }>,
    recentActivity,
  };
}

/**
 * Get audit log for a subject
 */
export function getAuditLog(subjectId?: string): typeof auditLog {
  if (subjectId) {
    return auditLog.filter(a => a.subjectId === subjectId);
  }
  return [...auditLog];
}
