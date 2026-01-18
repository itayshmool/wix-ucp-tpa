# Phase 14: Identity & Consent ✅ COMPLETE

## Overview

Implemented cross-platform identity linking and GDPR-compliant consent management.

## Identity Linking

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ucp/identity/link` | Link platform identity |
| GET | `/ucp/identity/:primaryId` | Get by primary ID |
| GET | `/ucp/identity/platform/:platform/:userId` | Get by platform |
| DELETE | `/ucp/identity/:primaryId/platform/:platform/:userId` | Unlink platform |
| DELETE | `/ucp/identity/:primaryId` | Delete identity |
| GET | `/ucp/identities` | List all (admin) |
| GET | `/ucp/identity-stats` | Statistics |

### Link Identity

```bash
POST /ucp/identity/link
{
  "primaryId": "john@example.com",
  "primaryIdType": "email",
  "platform": "wix",
  "userId": "wix-user-123",
  "displayName": "John Doe",
  "verified": true
}
```

Response:
```json
{
  "success": true,
  "isNew": true,
  "identity": {
    "id": "identity_abc123",
    "primaryId": "john@example.com",
    "platforms": [
      { "platform": "wix", "userId": "wix-user-123", "verified": true }
    ],
    "profile": { "displayName": "John Doe", "email": "john@example.com" }
  }
}
```

### Multi-Platform Support

One identity can have multiple platforms:

```
john@example.com
  ├── wix: wix-user-123
  ├── google: google-456
  └── apple: apple-789
```

## Consent Management

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ucp/consent` | Grant/deny consents |
| GET | `/ucp/consent/:subjectId` | Get all consents |
| GET | `/ucp/consent/:subjectId/:type` | Check specific |
| DELETE | `/ucp/consent/:subjectId/:type` | Withdraw consent |
| GET | `/ucp/consent-stats` | Statistics |

### Consent Types

| Type | Description |
|------|-------------|
| `marketing` | Marketing emails/communications |
| `analytics` | Analytics and tracking |
| `personalization` | Personalized recommendations |
| `third_party` | Sharing with third parties |
| `cookies` | Cookie usage |
| `terms` | Terms of service |
| `privacy` | Privacy policy |

### Grant Consents

```bash
POST /ucp/consent
{
  "subjectId": "john@example.com",
  "subjectType": "email",
  "consents": [
    { "type": "marketing", "granted": true },
    { "type": "analytics", "granted": false },
    { "type": "terms", "granted": true }
  ],
  "source": "checkout_form"
}
```

## GDPR Compliance

### Data Export (Portability)

```bash
GET /ucp/gdpr/export/john@example.com
```

Response:
```json
{
  "subjectId": "john@example.com",
  "exportedAt": "2026-01-18T22:00:00Z",
  "data": {
    "consents": { ... },
    "orders": [ ... ],
    "activity": [ ... ]
  }
}
```

### Data Deletion (Right to Erasure)

```bash
POST /ucp/gdpr/delete
{
  "subjectId": "john@example.com",
  "confirmDeletion": true,
  "reason": "user_request"
}
```

Response:
```json
{
  "success": true,
  "deletedRecords": 3
}
```

## Discovery Integration

UCP discovery now includes:
- `identity_linking` capability
- Identity bindings in discovery response

```json
{
  "capabilities": [..., "identity_linking"],
  "bindings": {
    "identity": {
      "link": "/ucp/identity/link",
      "lookup": "/ucp/identity/{primaryId}",
      "consent": "/ucp/consent",
      "gdprExport": "/ucp/gdpr/export/{subjectId}",
      "gdprDelete": "/ucp/gdpr/delete"
    }
  }
}
```

## Files

- `src/services/identity/identity.types.ts` - Identity types
- `src/services/identity/identity.service.ts` - Identity service
- `src/services/consent/consent.types.ts` - Consent types
- `src/services/consent/consent.service.ts` - Consent service
- `src/routes/identity.routes.ts` - API endpoints
- `tests/ucp-phase14-identity.test.ts` - 25 tests

## Tests

25 comprehensive tests covering:
- Identity creation and linking
- Multi-platform support
- Platform unlinking
- Consent granting
- Consent withdrawal
- GDPR export
- GDPR deletion
- Statistics
- Discovery integration
