# Phase 14: Identity Linking & Buyer Consent

## Context
Identity Linking connects platform accounts (e.g., a user on an AI shopping assistant) to business accounts (e.g., a returning customer on the Wix store). Buyer Consent captures explicit consent for terms, marketing, and data usage - required for GDPR compliance.

## Reference Documentation
- Identity Linking Capability: https://ucp.dev/specification/identity-linking
- Buyer Consent Extension: https://ucp.dev/specification/checkout/buyer-consent-extension

## Goal
Enable identity linking across platforms and capture auditable buyer consent.

## Priority: 🟢 Low | Complexity: 🟡 Medium | Duration: 1 week

---

## Part A: Identity Linking

### Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Identity Linking Flow                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Platform                    UCP TPA                    Wix Store       │
│  (AI Assistant)              (Identity Service)         (Business)      │
│      │                           │                          │           │
│      │  POST /identity/link      │                          │           │
│      │  { platformUserId,        │                          │           │
│      │    email, consent }       │                          │           │
│      ├──────────────────────────►│                          │           │
│      │                           │  Lookup/Create Contact   │           │
│      │                           ├─────────────────────────►│           │
│      │                           │◄─────────────────────────┤           │
│      │                           │  { contactId }           │           │
│      │◄──────────────────────────┤                          │           │
│      │  { linkedId,              │                          │           │
│      │    contactId }            │                          │           │
│                                                                         │
│  Benefits:                                                              │
│  - Order history across platforms                                       │
│  - Personalized recommendations                                         │
│  - Saved addresses/payment methods                                      │
│  - Loyalty points                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tasks

#### 1. Create Identity Types (src/services/identity/types.ts)

```typescript
export interface IdentityLink {
  id: string;
  platformId: string;      // e.g., "claude-assistant"
  platformUserId: string;  // User ID on the platform
  businessContactId?: string;  // Wix Contact ID
  email?: string;
  status: 'pending' | 'linked' | 'unlinked';
  consent: IdentityConsent;
  createdAt: string;
  updatedAt: string;
  linkedAt?: string;
}

export interface IdentityConsent {
  dataSharing: boolean;     // Share data between platform and business
  orderHistory: boolean;    // Access past orders
  personalInfo: boolean;    // Access name, email, phone
  consentedAt: string;
}

export interface LinkIdentityRequest {
  platformId: string;
  platformUserId: string;
  email?: string;
  phone?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
  consent: {
    dataSharing: boolean;
    orderHistory: boolean;
    personalInfo: boolean;
  };
}

export interface LinkIdentityResponse {
  linkId: string;
  status: 'linked' | 'pending_verification';
  businessContactId?: string;
  capabilities: string[];  // What the link enables
}

export interface UnlinkIdentityRequest {
  platformId: string;
  platformUserId: string;
  reason?: string;
}
```

#### 2. Create Identity Store (src/store/identity-store.ts)

```typescript
import { IdentityLink } from '../services/identity/types.js';
import { logger } from '../utils/logger.js';

// In-memory for POC (use database in production)
const links = new Map<string, IdentityLink>();

// Index by platform+user for lookups
const platformIndex = new Map<string, string>(); // "platform:userId" -> linkId

export const identityStore = {
  async create(link: IdentityLink): Promise<void> {
    links.set(link.id, link);
    platformIndex.set(`${link.platformId}:${link.platformUserId}`, link.id);
    logger.info('Identity link created', { linkId: link.id });
  },
  
  async get(id: string): Promise<IdentityLink | undefined> {
    return links.get(id);
  },
  
  async getByPlatformUser(platformId: string, platformUserId: string): Promise<IdentityLink | undefined> {
    const linkId = platformIndex.get(`${platformId}:${platformUserId}`);
    return linkId ? links.get(linkId) : undefined;
  },
  
  async getByEmail(email: string): Promise<IdentityLink[]> {
    return Array.from(links.values()).filter(l => l.email === email);
  },
  
  async update(id: string, updates: Partial<IdentityLink>): Promise<void> {
    const link = links.get(id);
    if (link) {
      links.set(id, { ...link, ...updates, updatedAt: new Date().toISOString() });
    }
  },
  
  async delete(id: string): Promise<void> {
    const link = links.get(id);
    if (link) {
      platformIndex.delete(`${link.platformId}:${link.platformUserId}`);
      links.delete(id);
      logger.info('Identity link deleted', { linkId: id });
    }
  },
};
```

#### 3. Create Identity Service (src/services/identity/identity.service.ts)

```typescript
import { v4 as uuid } from 'uuid';
import { 
  IdentityLink, 
  LinkIdentityRequest, 
  LinkIdentityResponse 
} from './types.js';
import { identityStore } from '../../store/identity-store.js';
import { getWixSdkClient } from '../../wix/sdk-client.js';
import { logger } from '../../utils/logger.js';

export class IdentityService {
  
  /**
   * Link a platform identity to business identity
   */
  async linkIdentity(request: LinkIdentityRequest): Promise<LinkIdentityResponse> {
    logger.info('Linking identity', { 
      platformId: request.platformId, 
      platformUserId: request.platformUserId,
      hasEmail: !!request.email,
    });
    
    // Check for existing link
    const existing = await identityStore.getByPlatformUser(
      request.platformId, 
      request.platformUserId
    );
    
    if (existing && existing.status === 'linked') {
      return {
        linkId: existing.id,
        status: 'linked',
        businessContactId: existing.businessContactId,
        capabilities: this.getCapabilities(existing),
      };
    }
    
    // Try to find or create Wix contact
    let contactId: string | undefined;
    if (request.email) {
      contactId = await this.findOrCreateWixContact(request);
    }
    
    // Create identity link
    const link: IdentityLink = {
      id: uuid(),
      platformId: request.platformId,
      platformUserId: request.platformUserId,
      businessContactId: contactId,
      email: request.email,
      status: contactId ? 'linked' : 'pending',
      consent: {
        dataSharing: request.consent.dataSharing,
        orderHistory: request.consent.orderHistory,
        personalInfo: request.consent.personalInfo,
        consentedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedAt: contactId ? new Date().toISOString() : undefined,
    };
    
    await identityStore.create(link);
    
    logger.info('Identity linked', { 
      linkId: link.id, 
      status: link.status,
      hasContact: !!contactId,
    });
    
    return {
      linkId: link.id,
      status: link.status,
      businessContactId: link.businessContactId,
      capabilities: this.getCapabilities(link),
    };
  }
  
  /**
   * Get identity by platform user
   */
  async getIdentity(platformId: string, platformUserId: string): Promise<IdentityLink | null> {
    const link = await identityStore.getByPlatformUser(platformId, platformUserId);
    return link || null;
  }
  
  /**
   * Unlink identity
   */
  async unlinkIdentity(platformId: string, platformUserId: string, reason?: string): Promise<boolean> {
    const link = await identityStore.getByPlatformUser(platformId, platformUserId);
    
    if (!link) {
      return false;
    }
    
    // Log for audit
    logger.info('Identity unlinked', { 
      linkId: link.id, 
      reason,
      previousStatus: link.status,
    });
    
    // Update status instead of deleting (for audit trail)
    await identityStore.update(link.id, { 
      status: 'unlinked',
      businessContactId: undefined,
    });
    
    return true;
  }
  
  /**
   * Get order history for linked identity
   */
  async getOrderHistory(linkId: string): Promise<any[]> {
    const link = await identityStore.get(linkId);
    
    if (!link || link.status !== 'linked' || !link.consent.orderHistory) {
      return [];
    }
    
    if (!link.email) {
      return [];
    }
    
    // Query orders by email
    const client = getWixSdkClient();
    try {
      const response = await client.post('/ecom/v1/orders/query', {
        query: {
          filter: { 'buyerInfo.email': { $eq: link.email } },
          paging: { limit: 50 },
          sort: [{ fieldName: '_createdDate', order: 'DESC' }],
        },
      });
      
      return response.orders || [];
    } catch (error) {
      logger.error('Failed to fetch order history', { linkId, error });
      return [];
    }
  }
  
  /**
   * Find or create Wix contact
   */
  private async findOrCreateWixContact(request: LinkIdentityRequest): Promise<string | undefined> {
    const client = getWixSdkClient();
    
    try {
      // Search for existing contact by email
      const searchResponse = await client.post('/contacts/v4/contacts/query', {
        query: {
          filter: { 'info.emails.email': { $eq: request.email } },
          paging: { limit: 1 },
        },
      });
      
      if (searchResponse.contacts?.length > 0) {
        return searchResponse.contacts[0].id;
      }
      
      // Create new contact
      const createResponse = await client.post('/contacts/v4/contacts', {
        info: {
          name: request.name || {},
          emails: request.email ? [{ email: request.email, primary: true }] : [],
          phones: request.phone ? [{ phone: request.phone, primary: true }] : [],
        },
      });
      
      return createResponse.contact?.id;
    } catch (error) {
      logger.error('Failed to find/create Wix contact', { error });
      return undefined;
    }
  }
  
  /**
   * Get capabilities enabled by this link
   */
  private getCapabilities(link: IdentityLink): string[] {
    const caps: string[] = [];
    
    if (link.status === 'linked') {
      caps.push('personalization');
      
      if (link.consent.orderHistory) {
        caps.push('order_history');
      }
      if (link.consent.personalInfo) {
        caps.push('saved_addresses');
        caps.push('saved_payment_methods');
      }
      if (link.consent.dataSharing) {
        caps.push('recommendations');
      }
    }
    
    return caps;
  }
}

export const identityService = new IdentityService();
```

#### 4. Create Identity Endpoints (src/routes/ucp.routes.ts)

```typescript
import { identityService } from '../services/identity/identity.service.js';

/**
 * Link platform identity to business
 * POST /ucp/identity/link
 */
router.post('/ucp/identity/link', async (req: Request, res: Response) => {
  try {
    const request = req.body;
    
    if (!request.platformId || !request.platformUserId) {
      return sendError(res, 400, 'platformId and platformUserId are required', 'INVALID_REQUEST');
    }
    
    if (!request.consent) {
      return sendError(res, 400, 'consent is required', 'CONSENT_REQUIRED');
    }
    
    const result = await identityService.linkIdentity(request);
    
    res.status(201).json(result);
  } catch (error: any) {
    logger.error('UCP: Identity link failed', { error: error.message });
    sendError(res, 500, 'Failed to link identity', 'IDENTITY_ERROR');
  }
});

/**
 * Get identity by platform user
 * GET /ucp/identity/:platformId/:platformUserId
 */
router.get('/ucp/identity/:platformId/:platformUserId', async (req: Request, res: Response) => {
  try {
    const { platformId, platformUserId } = req.params;
    
    const identity = await identityService.getIdentity(platformId, platformUserId);
    
    if (!identity) {
      return sendError(res, 404, 'Identity not found', 'NOT_FOUND');
    }
    
    res.json({
      linkId: identity.id,
      status: identity.status,
      capabilities: identity.status === 'linked' ? [
        ...(identity.consent.orderHistory ? ['order_history'] : []),
        ...(identity.consent.personalInfo ? ['saved_addresses'] : []),
      ] : [],
    });
  } catch (error: any) {
    logger.error('UCP: Get identity failed', { error: error.message });
    sendError(res, 500, 'Failed to get identity', 'IDENTITY_ERROR');
  }
});

/**
 * Unlink identity
 * DELETE /ucp/identity/:platformId/:platformUserId
 */
router.delete('/ucp/identity/:platformId/:platformUserId', async (req: Request, res: Response) => {
  try {
    const { platformId, platformUserId } = req.params;
    const { reason } = req.body || {};
    
    const success = await identityService.unlinkIdentity(platformId, platformUserId, reason);
    
    if (!success) {
      return sendError(res, 404, 'Identity not found', 'NOT_FOUND');
    }
    
    res.json({ success: true, message: 'Identity unlinked' });
  } catch (error: any) {
    logger.error('UCP: Unlink identity failed', { error: error.message });
    sendError(res, 500, 'Failed to unlink identity', 'IDENTITY_ERROR');
  }
});

/**
 * Get order history for linked identity
 * GET /ucp/identity/:linkId/orders
 */
router.get('/ucp/identity/:linkId/orders', async (req: Request, res: Response) => {
  try {
    const { linkId } = req.params;
    
    const orders = await identityService.getOrderHistory(linkId);
    
    res.json({
      orders: orders.map((o: any) => ({
        id: o._id,
        number: o.number,
        status: o.status,
        total: o.priceSummary?.total,
        createdAt: o._createdDate,
      })),
    });
  } catch (error: any) {
    logger.error('UCP: Get order history failed', { error: error.message });
    sendError(res, 500, 'Failed to get order history', 'IDENTITY_ERROR');
  }
});
```

---

## Part B: Buyer Consent

### Tasks

#### 1. Create Consent Types (src/services/consent/types.ts)

```typescript
export interface BuyerConsent {
  id: string;
  checkoutId?: string;
  orderId?: string;
  email: string;
  consents: ConsentItem[];
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface ConsentItem {
  type: ConsentType;
  granted: boolean;
  version: string;     // Policy version consented to
  documentUrl?: string; // Link to the policy
  timestamp: string;
}

export type ConsentType = 
  | 'terms_of_service'
  | 'privacy_policy'
  | 'marketing_email'
  | 'marketing_sms'
  | 'data_sharing'
  | 'third_party_sharing';

export interface CaptureConsentRequest {
  email: string;
  checkoutId?: string;
  consents: {
    type: ConsentType;
    granted: boolean;
    version?: string;
  }[];
}

export interface ConsentAuditLog {
  id: string;
  email: string;
  action: 'granted' | 'revoked' | 'updated';
  consentType: ConsentType;
  previousValue?: boolean;
  newValue: boolean;
  timestamp: string;
  source: string;  // Where consent was captured
  metadata?: Record<string, string>;
}
```

#### 2. Create Consent Service (src/services/consent/consent.service.ts)

```typescript
import { v4 as uuid } from 'uuid';
import { 
  BuyerConsent, 
  CaptureConsentRequest, 
  ConsentItem,
  ConsentAuditLog 
} from './types.js';
import { logger } from '../../utils/logger.js';

// In-memory stores for POC
const consents = new Map<string, BuyerConsent>();
const auditLogs: ConsentAuditLog[] = [];

export class ConsentService {
  
  private readonly POLICY_VERSIONS = {
    terms_of_service: '2026-01-01',
    privacy_policy: '2026-01-01',
    marketing_email: '2026-01-01',
    marketing_sms: '2026-01-01',
    data_sharing: '2026-01-01',
    third_party_sharing: '2026-01-01',
  };
  
  /**
   * Capture consent at checkout
   */
  async captureConsent(request: CaptureConsentRequest, metadata?: { ip?: string; userAgent?: string }): Promise<BuyerConsent> {
    logger.info('Capturing consent', { 
      email: request.email, 
      checkoutId: request.checkoutId,
      consentCount: request.consents.length,
    });
    
    // Get existing consent for this email
    const existing = await this.getConsentByEmail(request.email);
    
    const consent: BuyerConsent = {
      id: existing?.id || uuid(),
      checkoutId: request.checkoutId,
      email: request.email,
      consents: request.consents.map(c => ({
        type: c.type,
        granted: c.granted,
        version: c.version || this.POLICY_VERSIONS[c.type],
        documentUrl: this.getPolicyUrl(c.type),
        timestamp: new Date().toISOString(),
      })),
      ipAddress: metadata?.ip,
      userAgent: metadata?.userAgent,
      timestamp: new Date().toISOString(),
    };
    
    // Log changes for audit
    for (const newConsent of consent.consents) {
      const oldConsent = existing?.consents.find(c => c.type === newConsent.type);
      
      if (!oldConsent || oldConsent.granted !== newConsent.granted) {
        this.logAudit({
          id: uuid(),
          email: request.email,
          action: newConsent.granted ? 'granted' : 'revoked',
          consentType: newConsent.type,
          previousValue: oldConsent?.granted,
          newValue: newConsent.granted,
          timestamp: new Date().toISOString(),
          source: request.checkoutId ? 'checkout' : 'api',
        });
      }
    }
    
    // Save
    consents.set(consent.email, consent);
    
    logger.info('Consent captured', { consentId: consent.id, email: consent.email });
    
    return consent;
  }
  
  /**
   * Get consent by email
   */
  async getConsentByEmail(email: string): Promise<BuyerConsent | null> {
    return consents.get(email) || null;
  }
  
  /**
   * Revoke specific consent
   */
  async revokeConsent(email: string, consentType: string): Promise<boolean> {
    const consent = await this.getConsentByEmail(email);
    
    if (!consent) {
      return false;
    }
    
    const item = consent.consents.find(c => c.type === consentType);
    if (item) {
      const previousValue = item.granted;
      item.granted = false;
      item.timestamp = new Date().toISOString();
      
      this.logAudit({
        id: uuid(),
        email,
        action: 'revoked',
        consentType: consentType as any,
        previousValue,
        newValue: false,
        timestamp: new Date().toISOString(),
        source: 'withdrawal',
      });
      
      consents.set(email, consent);
      logger.info('Consent revoked', { email, consentType });
    }
    
    return true;
  }
  
  /**
   * Get audit log for email
   */
  async getAuditLog(email: string): Promise<ConsentAuditLog[]> {
    return auditLogs.filter(log => log.email === email);
  }
  
  /**
   * Check if required consents are present
   */
  hasRequiredConsents(consent: BuyerConsent | null): { valid: boolean; missing: string[] } {
    const required = ['terms_of_service', 'privacy_policy'];
    const missing: string[] = [];
    
    if (!consent) {
      return { valid: false, missing: required };
    }
    
    for (const type of required) {
      const item = consent.consents.find(c => c.type === type);
      if (!item || !item.granted) {
        missing.push(type);
      }
    }
    
    return { valid: missing.length === 0, missing };
  }
  
  private getPolicyUrl(type: string): string {
    const baseUrl = process.env.BASE_URL || 'https://wix-ucp-tpa.onrender.com';
    const urls: Record<string, string> = {
      terms_of_service: 'https://www.popstopdrink.com/terms',
      privacy_policy: 'https://www.popstopdrink.com/privacy-policy',
      marketing_email: 'https://www.popstopdrink.com/marketing-preferences',
      marketing_sms: 'https://www.popstopdrink.com/marketing-preferences',
      data_sharing: 'https://www.popstopdrink.com/data-sharing',
      third_party_sharing: 'https://www.popstopdrink.com/third-party',
    };
    return urls[type] || `${baseUrl}/policies/${type}`;
  }
  
  private logAudit(log: ConsentAuditLog): void {
    auditLogs.push(log);
    logger.info('Consent audit log', log);
  }
}

export const consentService = new ConsentService();
```

#### 3. Create Consent Endpoints

```typescript
import { consentService } from '../services/consent/consent.service.js';

/**
 * Capture buyer consent
 * POST /ucp/consent
 */
router.post('/ucp/consent', async (req: Request, res: Response) => {
  try {
    const request = req.body;
    
    if (!request.email) {
      return sendError(res, 400, 'email is required', 'INVALID_REQUEST');
    }
    
    if (!request.consents || request.consents.length === 0) {
      return sendError(res, 400, 'consents array is required', 'INVALID_REQUEST');
    }
    
    const consent = await consentService.captureConsent(request, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(201).json({
      consentId: consent.id,
      email: consent.email,
      consents: consent.consents.map(c => ({
        type: c.type,
        granted: c.granted,
        version: c.version,
      })),
      timestamp: consent.timestamp,
    });
  } catch (error: any) {
    logger.error('UCP: Capture consent failed', { error: error.message });
    sendError(res, 500, 'Failed to capture consent', 'CONSENT_ERROR');
  }
});

/**
 * Get consent status
 * GET /ucp/consent/:email
 */
router.get('/ucp/consent/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    const consent = await consentService.getConsentByEmail(email);
    
    if (!consent) {
      return res.json({ email, consents: [], hasConsent: false });
    }
    
    res.json({
      email: consent.email,
      consents: consent.consents.map(c => ({
        type: c.type,
        granted: c.granted,
        version: c.version,
        grantedAt: c.timestamp,
      })),
      hasConsent: true,
      lastUpdated: consent.timestamp,
    });
  } catch (error: any) {
    logger.error('UCP: Get consent failed', { error: error.message });
    sendError(res, 500, 'Failed to get consent', 'CONSENT_ERROR');
  }
});

/**
 * Revoke consent (GDPR right to withdraw)
 * DELETE /ucp/consent/:email/:type
 */
router.delete('/ucp/consent/:email/:type', async (req: Request, res: Response) => {
  try {
    const { email, type } = req.params;
    
    const success = await consentService.revokeConsent(email, type);
    
    if (!success) {
      return sendError(res, 404, 'Consent not found', 'NOT_FOUND');
    }
    
    res.json({ success: true, message: `${type} consent revoked` });
  } catch (error: any) {
    logger.error('UCP: Revoke consent failed', { error: error.message });
    sendError(res, 500, 'Failed to revoke consent', 'CONSENT_ERROR');
  }
});

/**
 * Get consent audit log
 * GET /ucp/consent/:email/audit
 */
router.get('/ucp/consent/:email/audit', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    const logs = await consentService.getAuditLog(email);
    
    res.json({ email, auditLog: logs });
  } catch (error: any) {
    logger.error('UCP: Get audit log failed', { error: error.message });
    sendError(res, 500, 'Failed to get audit log', 'CONSENT_ERROR');
  }
});
```

---

## API Reference

### Link Identity
```
POST /ucp/identity/link
{
  "platformId": "claude-assistant",
  "platformUserId": "user_abc123",
  "email": "buyer@example.com",
  "name": { "firstName": "John", "lastName": "Doe" },
  "consent": {
    "dataSharing": true,
    "orderHistory": true,
    "personalInfo": true
  }
}

Response 201:
{
  "linkId": "link_xyz789",
  "status": "linked",
  "businessContactId": "contact_456",
  "capabilities": ["order_history", "saved_addresses", "recommendations"]
}
```

### Capture Consent
```
POST /ucp/consent
{
  "email": "buyer@example.com",
  "checkoutId": "checkout_123",
  "consents": [
    { "type": "terms_of_service", "granted": true },
    { "type": "privacy_policy", "granted": true },
    { "type": "marketing_email", "granted": false }
  ]
}

Response 201:
{
  "consentId": "consent_abc",
  "email": "buyer@example.com",
  "consents": [...],
  "timestamp": "2026-01-18T12:00:00Z"
}
```

---

## Acceptance Criteria

### Identity Linking
- [ ] POST /ucp/identity/link creates identity link
- [ ] GET /ucp/identity/:platform/:user returns link status
- [ ] DELETE /ucp/identity/:platform/:user unlinks identity
- [ ] Order history accessible for linked identities
- [ ] Wix contact created/linked automatically

### Buyer Consent
- [ ] POST /ucp/consent captures consent
- [ ] GET /ucp/consent/:email returns consent status
- [ ] DELETE /ucp/consent/:email/:type revokes consent
- [ ] Audit log tracks all consent changes
- [ ] Required consents enforced at checkout

---

## GDPR Compliance Notes

- **Right to Access**: GET /ucp/consent/:email
- **Right to Rectification**: POST /ucp/consent (update)
- **Right to Erasure**: DELETE /ucp/identity + revoke all consents
- **Right to Withdraw**: DELETE /ucp/consent/:email/:type
- **Data Portability**: GET /ucp/identity/:linkId/orders

All consent changes must be logged with timestamp, IP, and source for audit purposes.
