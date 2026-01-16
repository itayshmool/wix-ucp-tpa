# Phase 1.1: Project Setup & Configuration

## Context
Building a Wix Third-Party Application (TPA) that will connect to Wix merchant stores. This is a self-hosted Node.js application using Express and TypeScript.

## Goal
Set up the foundational project structure, configuration, and environment handling.

## Tech Stack
- Runtime: Node.js 20+
- Language: TypeScript 5+
- Framework: Express.js
- HTTP Client: axios
- Environment: dotenv
- Validation: zod

## Tasks

### 1. Initialize Project
Create a new Node.js project with TypeScript support:
- Initialize npm project
- Install dependencies: express, axios, dotenv, zod, uuid
- Install dev dependencies: typescript, ts-node, nodemon, @types/express, @types/node
- Configure tsconfig.json for ES2022, strict mode, ESM modules

### 2. Project Structure
Create the following directory structure:
```
src/
├── config/
│   └── env.ts
├── wix/
│   ├── auth.ts
│   ├── client.ts
│   ├── webhooks.ts
│   └── types.ts
├── middleware/
│   ├── error-handler.ts
│   └── validate-webhook.ts
├── routes/
│   ├── auth.routes.ts
│   ├── webhook.routes.ts
│   └── dashboard.routes.ts
├── store/
│   └── instances.ts
├── utils/
│   └── logger.ts
└── index.ts
```

### 3. Environment Configuration (src/config/env.ts)
Create a validated configuration module using Zod:

Required environment variables:
- `PORT` - Server port (default: 3000)
- `WIX_APP_ID` - From Wix app dashboard
- `WIX_APP_SECRET` - From Wix app dashboard (keep secure!)
- `WIX_WEBHOOK_PUBLIC_KEY` - For webhook signature verification
- `BASE_URL` - Your app's public URL (e.g., https://your-app.com)
- `NODE_ENV` - development | production

Export a typed config object that validates on startup and throws if invalid.

### 4. Logger Utility (src/utils/logger.ts)
Create a simple logger that:
- Outputs JSON in production
- Outputs formatted text in development
- Includes timestamp, level, message, and optional metadata
- Levels: debug, info, warn, error

### 5. Main Entry Point (src/index.ts)
Create Express application that:
- Loads and validates environment config
- Sets up JSON body parser (with raw body preservation for webhooks)
- Mounts route modules
- Includes error handling middleware
- Starts server and logs startup info

### 6. Instance Store (src/store/instances.ts)
Create an in-memory store for app instances (will be replaced with DB later):
- Map of instanceId → { accessToken, refreshToken, installedAt, siteId }
- Methods: save, get, delete, getAll
- Add TODO comments for database migration

## File Templates

### package.json scripts
```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### .env.example
```
PORT=3000
NODE_ENV=development
WIX_APP_ID=your-app-id
WIX_APP_SECRET=your-app-secret
WIX_WEBHOOK_PUBLIC_KEY=your-webhook-public-key
BASE_URL=https://your-ngrok-url.ngrok.io
```

## Acceptance Criteria
- [ ] Server starts without errors
- [ ] Environment validation fails gracefully with clear error messages
- [ ] Logger outputs correctly in both environments
- [ ] TypeScript compiles with no errors
- [ ] All imports use ES module syntax
