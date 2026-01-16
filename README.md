# Wix UCP TPA

A Wix Third-Party Application with Universal Commerce Protocol integration for AI-powered commerce.

## Status

🚧 **Bootstrap Phase** - Minimal deployment to validate pipeline

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

### Health Checks

- `GET /health` - Full health status
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

## Environment Variables

See `.env.example` for required variables.

## Architecture

See `.cursor/rules/` for complete implementation guides.

## License

MIT
