# Wix UCP TPA

A Wix Third-Party Application with Universal Commerce Protocol integration for AI-powered commerce.

## Status

✅ **Phase 1.1 Complete** - OAuth & Webhooks Integration

- OAuth 2.0 flow for Wix app installation
- Webhook handling with signature validation
- Instance store for OAuth tokens
- Merchant dashboard (basic)
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
