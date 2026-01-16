import express from 'express';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { preserveRawBody } from './middleware/validate-webhook.js';
import authRoutes from './routes/auth.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import productsRoutes from './routes/products.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import cartRoutes from './routes/cart.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import storefrontRoutes from './routes/storefront.routes.js';
import ucpRoutes from './routes/ucp.routes.js';
import testUiRoutes from './routes/test-ui.routes.js';

const app = express();

// Middleware
// Preserve raw body for webhook signature validation
app.use('/webhooks', express.json({ verify: preserveRawBody }));
// Regular JSON parsing for other routes
app.use(express.json());

// Health check endpoints for Render.com
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
  });
});

app.get('/health/live', (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

app.get('/health/ready', (_req, res) => {
  res.status(200).json({ status: 'ready' });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Wix UCP TPA',
    version: '1.1.0-sdk',
    description: 'Wix Third-Party Application with UCP integration (using Wix SDK)',
    status: 'poc-sdk',
    phase: 'POC: UCP Layer + Test UI (Wix SDK)',
    endpoints: {
      // Health
      health: '/health',
      liveness: '/health/live',
      readiness: '/health/ready',
      // UCP Protocol (POC)
      ucpDiscovery: '/.well-known/ucp',
      ucpProducts: '/ucp/products',
      ucpCart: '/ucp/cart',
      ucpCheckout: '/ucp/checkout',
      ucpOrders: '/ucp/orders/:id',
      // Test UI
      testStorefront: '/test/storefront',
      // Legacy (from previous phases)
      dashboard: '/dashboard',
      storefront: '/storefront/*',
    },
  });
});

// Application routes
app.use('/auth', authRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', productsRoutes);
app.use('/api', ordersRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', cartRoutes);
app.use('/api', checkoutRoutes);
app.use('/storefront', storefrontRoutes);

// UCP Routes (POC) - mounted at root for standard UCP paths
app.use('/', ucpRoutes);

// Test UI Routes (POC)
app.use('/test', testUiRoutes);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(config.PORT, () => {
  logger.info('Server started', {
    port: config.PORT,
    environment: config.NODE_ENV,
    node_version: process.version,
  });
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutdown signal received, closing server...');
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
