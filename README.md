# Wix UCP TPA

A Wix Third-Party Application with Universal Commerce Protocol integration for AI-powered commerce.

## 🚨 Critical Documentation

**⚠️ READ FIRST**: [.cursor/rules/CRITICAL-ARCHITECTURE.md](./.cursor/rules/CRITICAL-ARCHITECTURE.md)

This document explains:
- **The real architecture**: AI-first commerce via LLM agents + UCP protocol
- **Who the users are**: Buyers (via AI) are primary, merchants are secondary
- **Why authentication was confusing**: Two different flows for two different users
- **What to focus on next**: Phase 3 (Checkout) → Phase 4-6 (UCP endpoints)

---

## Status

✅ **Phase 3.1-3.2 Complete** - Cart & Checkout Integration

- ✅ Phase 1: OAuth, Webhooks, Dashboard
- ✅ Phase 2: Products, Orders, Inventory APIs
- ✅ Phase 3.1: Cart Management (create, update, delete carts)
- ✅ Phase 3.2: Checkout & Hosted Checkout URL Generation
- 🎯 **LLM agents can now complete purchases!**

### Recent Additions (v0.3.0)

- Cart creation and management APIs
- Checkout generation from carts
- **Wix hosted checkout URL generation** (critical feature)
- **Quick checkout endpoint** - One-call cart + checkout + URL
- Checkout status polling for payment confirmation
- Pre-fill buyer info and shipping address
- Full TypeScript implementation with strict typing

## Tech Stack

- Node.js 20+
- TypeScript 5+
- Express.js
- Zod for validation

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Deployment

Deployed on Render.com using the `render.yaml` configuration.

### Endpoints

#### Health Checks
- `GET /health` - Full health status
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

#### OAuth & Installation
- `GET /auth/install` - App installation endpoint
- `GET /auth/callback` - OAuth callback
- `GET /auth/status` - Check instance authentication status

#### Webhooks
- `POST /webhooks` - Webhook receiver (with signature validation)
- `GET /webhooks/health` - Webhook endpoint health check

#### Dashboard
- `GET /dashboard` - Merchant dashboard
- `GET /dashboard/instances` - List all connected instances
- `GET /dashboard/instance/:id` - Get instance details

## Environment Variables

Required environment variables:

```bash
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Wix App Configuration
WIX_APP_ID=your-app-id              # From Wix Developer Console
WIX_APP_SECRET=your-app-secret      # From Wix Developer Console
WIX_WEBHOOK_PUBLIC_KEY=your-key     # For webhook signature validation
BASE_URL=http://localhost:3000      # Your app's public URL
```

See `.env.example` for a template.

## Architecture

See `.cursor/rules/` for complete implementation guides.

## License

MIT
