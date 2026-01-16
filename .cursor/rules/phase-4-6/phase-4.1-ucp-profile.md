# Phase 4.1: UCP Business Profile & Discovery

## Context
Google's Universal Commerce Protocol (UCP) is an open standard for agentic commerce (announced January 11, 2026). Our Wix TPA will expose a UCP Business Profile making Wix stores discoverable by AI agents.

## Reference Documentation
- UCP Specification: https://ucp.dev/specification/overview
- UCP GitHub: https://github.com/Universal-Commerce-Protocol/ucp
- Google UCP Guide: https://developers.google.com/merchant/ucp

## Goal
Make the Wix TPA a UCP-compliant Business that AI agents can discover.

---

## UCP Core Concepts

### Actors
- Platform: AI agent orchestrating shopping (Google AI Mode, Gemini)
- Business: Merchant selling goods (our TPA represents Wix merchants)
- Credential Provider: Manages payment instruments
- PSP: Processes payments

### Key Structures
- Profile: JSON at `/.well-known/ucp` declaring capabilities
- Service: API surface with transport bindings
- Capability: Core feature (Checkout, Order)
- Extension: Augments capability (Discounts, Fulfillment)
- Payment Handler: Spec for processing payments

### Naming Convention
Reverse-domain format: dev.ucp.shopping.checkout, dev.ucp.shopping.order

---

## Tasks

### 1. UCP Core Types (src/ucp/types/core.types.ts)

UCPVersion: '2026-01-11'

UCPCapability: name, version, spec, schema, extends?, config?

UCPService: version, spec, rest?, mcp?, a2a?, embedded?
- rest: { schema, endpoint }
- mcp: { schema, endpoint }
- a2a: { endpoint }

UCPPaymentHandler: id, name, version, spec, config_schema, instrument_schemas[], config

UCPSigningKey: kid, kty, crv, x, y, use, alg

UCPBusinessProfile: ucp { version, services, capabilities }, payment { handlers }, signing_keys[]

UCPPlatformProfile: ucp { version, capabilities }, payment { handlers }, signing_keys[]

UCPResponse<T>: ucp { version, capabilities[] }, ...T

UCPErrorResponse: status ('requires_escalation'), messages[]

UCPMoney: amount (number, minor units), currency

UCPAddress: street_address, extended_address, address_locality, address_region, postal_code, address_country, first_name, last_name

### 2. Profile Builder (src/ucp/profile/profile.builder.ts)

UCPProfileBuilder class:
- buildProfile(instanceId): Promise<UCPBusinessProfile>
- buildServices(): Record<string, UCPService>
- buildCapabilities(): UCPCapability[]
- buildPaymentConfig(instanceId): Promise<{ handlers }>
- getSigningKeys(): UCPSigningKey[]

Services: dev.ucp.shopping with REST binding to /ucp/v1

Capabilities:
- dev.ucp.shopping.checkout
- dev.ucp.shopping.order
- dev.ucp.shopping.fulfillment (extends checkout)
- dev.ucp.shopping.discount (extends checkout)

Payment Handler: Wix hosted checkout (REDIRECT type)

### 3. Profile Endpoint (src/ucp/routes/well-known.routes.ts)

GET /.well-known/ucp
- Resolve instance ID from request
- Build profile
- Set Cache-Control: public, max-age=3600
- Return JSON

### 4. UCP Request Middleware (src/ucp/middleware/ucp-request.ts)

Parse UCP-Agent header (RFC 8941): profile="https://..."

Fetch platform profile (with caching)

Capability Negotiation:
1. Compute intersection of platform & business capabilities
2. Prune orphaned extensions (no parent in intersection)
3. Repeat until stable

Attach to request: platformProfile, negotiatedCapabilities, ucpVersion

### 5. Response Helpers (src/ucp/utils/response.ts)

ucpResponse<T>(req, data): Wrap with UCP envelope
ucpError(code, message, severity?): Create error response

---

## Directory Structure
```
src/ucp/
├── types/
│   ├── core.types.ts
│   ├── checkout.types.ts
│   ├── order.types.ts
│   └── product.types.ts
├── profile/
│   └── profile.builder.ts
├── middleware/
│   ├── ucp-request.ts
│   └── ucp-auth.ts
├── services/
│   ├── checkout.service.ts
│   ├── order.service.ts
│   └── product.service.ts
├── routes/
│   ├── well-known.routes.ts
│   ├── checkout.routes.ts
│   ├── order.routes.ts
│   └── product.routes.ts
└── utils/
    ├── response.ts
    └── negotiation.ts
```

---

## Acceptance Criteria
- [ ] Business Profile served at /.well-known/ucp
- [ ] Profile includes UCP version 2026-01-11
- [ ] Shopping service declared with REST transport
- [ ] All capabilities declared with proper names/versions
- [ ] Extensions reference parent capability
- [ ] Payment handlers include Wix hosted checkout
- [ ] UCP-Agent header parsed correctly
- [ ] Platform profiles fetched and cached
- [ ] Capability negotiation produces correct intersection
- [ ] Orphaned extensions pruned
- [ ] Responses include UCP envelope
- [ ] Errors follow UCP format
