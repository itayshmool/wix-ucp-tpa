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
    version: '0.6.0',
    description: 'Wix Third-Party Application with UCP integration',
    status: 'phase-3-complete-with-instance-auth',
    phase: 'Phase 3 Complete: Public Storefront Ready',
    endpoints: {
      health: '/health',
      liveness: '/health/live',
      readiness: '/health/ready',
      install: '/auth/install',
      authCallback: '/auth/callback',
      webhooks: '/webhooks',
      dashboard: '/dashboard',
      dashboardAPI: '/dashboard/api',
      productsAPI: '/api/:instanceId/products',
      collectionsAPI: '/api/:instanceId/collections',
      ordersAPI: '/api/:instanceId/orders',
      inventoryAPI: '/api/:instanceId/inventory',
      cartAPI: '/api/:instanceId/cart',
      checkoutAPI: '/api/:instanceId/checkout',
      quickCheckout: '/api/:instanceId/checkout/quick',
      storefront: '/storefront/*',
      storefrontProducts: '/storefront/products',
      storefrontQuickCheckout: '/storefront/checkout/quick',
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
