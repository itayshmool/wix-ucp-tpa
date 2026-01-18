/**
 * UCP Phase 13 Tests - Protocol Bindings (MCP + A2A)
 * 
 * Tests for:
 * - MCP tool discovery and execution
 * - A2A agent registration and handoffs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the Wix SDK client before importing routes
vi.mock('../src/wix/sdk-client.js', () => ({
  getWixSdkClient: vi.fn(() => mockWixClient),
}));

// Mock logger to avoid console output in tests
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock config
vi.mock('../src/config/env.js', () => ({
  config: {
    BASE_URL: 'https://test.example.com',
    PORT: 3000,
  },
}));

// Create mock Wix client
const mockWixClient = {
  products: {
    queryProducts: vi.fn(() => ({
      limit: vi.fn(() => ({
        skip: vi.fn(() => ({
          find: vi.fn().mockResolvedValue({
            items: [
              { _id: 'prod-1', name: 'Test Product', price: { price: 9.99 } }
            ],
            totalCount: 1,
          }),
        })),
      })),
    })),
    getProduct: vi.fn().mockResolvedValue({
      _id: 'prod-1',
      name: 'Test Product',
      price: { price: 9.99 },
    }),
  },
};

// Import routes after mocking
import mcpRoutes from '../src/routes/mcp.routes.js';
import a2aRoutes from '../src/routes/a2a.routes.js';
import ucpRoutes from '../src/routes/ucp.routes.js';

// Import services for testing
import { clearA2AData } from '../src/services/a2a/a2a.service.js';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/', mcpRoutes);
  app.use('/', a2aRoutes);
  app.use('/', ucpRoutes);
  return app;
}

describe('UCP Phase 13: Protocol Bindings', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    clearA2AData();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // MCP Tool Discovery
  // ==========================================================================
  describe('MCP Tool Discovery', () => {
    describe('GET /mcp/tools', () => {
      it('should return list of available tools', async () => {
        const response = await request(app)
          .get('/mcp/tools')
          .expect(200);

        expect(response.body.tools).toBeDefined();
        expect(Array.isArray(response.body.tools)).toBe(true);
        expect(response.body.tools.length).toBeGreaterThan(0);
        expect(response.body.version).toBe('1.0');
        expect(response.body.capabilities).toBeDefined();
      });

      it('should include expected UCP tools', async () => {
        const response = await request(app)
          .get('/mcp/tools')
          .expect(200);

        const toolNames = response.body.tools.map((t: { name: string }) => t.name);
        
        expect(toolNames).toContain('ucp_discover');
        expect(toolNames).toContain('ucp_search_products');
        expect(toolNames).toContain('ucp_create_cart');
        expect(toolNames).toContain('ucp_complete_checkout');
        expect(toolNames).toContain('ucp_mint_instrument');
      });

      it('should include input schema for each tool', async () => {
        const response = await request(app)
          .get('/mcp/tools')
          .expect(200);

        for (const tool of response.body.tools) {
          expect(tool.name).toBeDefined();
          expect(tool.description).toBeDefined();
          expect(tool.inputSchema).toBeDefined();
          expect(tool.inputSchema.type).toBe('object');
        }
      });
    });

    describe('GET /mcp/tools/:toolName', () => {
      it('should return specific tool definition', async () => {
        const response = await request(app)
          .get('/mcp/tools/ucp_search_products')
          .expect(200);

        expect(response.body.name).toBe('ucp_search_products');
        expect(response.body.description).toBeDefined();
        expect(response.body.inputSchema.properties).toBeDefined();
      });

      it('should return 404 for unknown tool', async () => {
        const response = await request(app)
          .get('/mcp/tools/unknown_tool')
          .expect(404);

        expect(response.body.code).toBe('TOOL_NOT_FOUND');
      });
    });

    describe('GET /mcp/openapi', () => {
      it('should return OpenAPI schema', async () => {
        const response = await request(app)
          .get('/mcp/openapi')
          .expect(200);

        expect(response.body.openapi).toBe('3.0.0');
        expect(response.body.info).toBeDefined();
        expect(response.body.info.title).toContain('UCP');
        expect(response.body.paths).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // MCP Tool Execution
  // ==========================================================================
  describe('MCP Tool Execution', () => {
    describe('POST /mcp/call', () => {
      it('should reject unknown tool', async () => {
        const response = await request(app)
          .post('/mcp/call')
          .send({
            tool: 'unknown_tool',
            arguments: {},
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TOOL_NOT_FOUND');
      });

      it('should validate required arguments', async () => {
        const response = await request(app)
          .post('/mcp/call')
          .send({
            tool: 'ucp_get_product',
            arguments: {}, // Missing required productId
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_ARGUMENTS');
      });

      it('should reject missing tool name', async () => {
        const response = await request(app)
          .post('/mcp/call')
          .send({
            arguments: {},
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should accept valid tool call request format', async () => {
        // Note: Full execution requires running server, testing format validation only
        const response = await request(app)
          .post('/mcp/call')
          .send({
            tool: 'ucp_discover',
            arguments: {},
            requestId: 'test-123',
          });

        // Either succeeds (if fetch works) or fails with execution error (not validation error)
        if (response.status === 200) {
          expect(response.body.success).toBe(true);
        } else {
          // Execution error (fetch failed), not a validation error
          expect(response.body.error.code).not.toBe('VALIDATION_ERROR');
          expect(response.body.error.code).not.toBe('TOOL_NOT_FOUND');
          expect(response.body.error.code).not.toBe('INVALID_ARGUMENTS');
        }
      });
    });

    describe('POST /mcp/batch', () => {
      it('should execute multiple tools in batch', async () => {
        const response = await request(app)
          .post('/mcp/batch')
          .send({
            calls: [
              { tool: 'ucp_discover', arguments: {}, requestId: 'req-1' },
              { tool: 'ucp_list_payment_handlers', arguments: {}, requestId: 'req-2' },
            ],
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.results).toHaveLength(2);
        expect(response.body.results[0].requestId).toBe('req-1');
        expect(response.body.results[1].requestId).toBe('req-2');
      });

      it('should reject empty batch', async () => {
        const response = await request(app)
          .post('/mcp/batch')
          .send({ calls: [] })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should reject batch with too many calls', async () => {
        const calls = Array(11).fill({ tool: 'ucp_discover', arguments: {} });
        
        const response = await request(app)
          .post('/mcp/batch')
          .send({ calls })
          .expect(400);

        expect(response.body.error.code).toBe('TOO_MANY_CALLS');
      });
    });

    describe('POST /mcp/validate', () => {
      it('should validate correct arguments', async () => {
        const response = await request(app)
          .post('/mcp/validate')
          .send({
            tool: 'ucp_search_products',
            arguments: { query: 'test', limit: 10 },
          })
          .expect(200);

        expect(response.body.valid).toBe(true);
      });

      it('should report missing required arguments', async () => {
        const response = await request(app)
          .post('/mcp/validate')
          .send({
            tool: 'ucp_get_product',
            arguments: {},
          })
          .expect(200);

        expect(response.body.valid).toBe(false);
        expect(response.body.errors).toContain('Missing required field: productId');
      });
    });
  });

  // ==========================================================================
  // A2A Agent Discovery
  // ==========================================================================
  describe('A2A Agent Discovery', () => {
    describe('GET /a2a/agent', () => {
      it('should return self agent card', async () => {
        const response = await request(app)
          .get('/a2a/agent')
          .expect(200);

        expect(response.body.id).toBeDefined();
        expect(response.body.name).toBeDefined();
        expect(response.body.version).toBeDefined();
        expect(response.body.capabilities).toBeDefined();
        expect(response.body.endpoints).toBeDefined();
        expect(response.body.trust).toBeDefined();
      });
    });

    describe('GET /a2a/agents', () => {
      it('should list all agents', async () => {
        const response = await request(app)
          .get('/a2a/agents')
          .expect(200);

        expect(response.body.agents).toBeDefined();
        expect(Array.isArray(response.body.agents)).toBe(true);
        expect(response.body.agents.length).toBeGreaterThanOrEqual(1); // At least self
      });
    });

    describe('POST /a2a/agents', () => {
      it('should register external agent', async () => {
        const response = await request(app)
          .post('/a2a/agents')
          .send({
            id: 'external-agent-1',
            name: 'External Test Agent',
            version: '1.0.0',
            capabilities: ['checkout'],
            endpoints: { base: 'https://external.example.com' },
            trust: { level: 'sandbox' },
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.agentId).toBe('external-agent-1');
      });

      it('should reject invalid agent card', async () => {
        const response = await request(app)
          .post('/a2a/agents')
          .send({
            // Missing required fields
            capabilities: ['checkout'],
          })
          .expect(400);

        expect(response.body.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /a2a/resolve', () => {
      it('should resolve agents by capability', async () => {
        // Register an agent with specific capability
        await request(app)
          .post('/a2a/agents')
          .send({
            id: 'payment-agent',
            name: 'Payment Agent',
            version: '1.0.0',
            capabilities: ['payment_processing'],
            endpoints: { base: 'https://payment.example.com' },
            trust: { level: 'verified' },
          });

        const response = await request(app)
          .post('/a2a/resolve')
          .send({ capability: 'payment_processing' })
          .expect(200);

        expect(response.body.agents).toBeDefined();
        const paymentAgent = response.body.agents.find(
          (a: { id: string }) => a.id === 'payment-agent'
        );
        expect(paymentAgent).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // A2A Transaction Handoffs
  // ==========================================================================
  describe('A2A Transaction Handoffs', () => {
    beforeEach(async () => {
      // Register a target agent for handoff tests
      await request(app)
        .post('/a2a/agents')
        .send({
          id: 'target-agent',
          name: 'Target Agent',
          version: '1.0.0',
          capabilities: ['checkout'],
          endpoints: { base: 'https://target.example.com' },
          trust: { level: 'verified' },
        });
    });

    describe('POST /a2a/handoff', () => {
      it('should create a handoff', async () => {
        const response = await request(app)
          .post('/a2a/handoff')
          .send({
            targetAgentId: 'target-agent',
            type: 'checkout',
            context: { checkoutId: 'checkout-123' },
            intent: 'Complete the checkout process',
            permissions: ['read', 'execute'],
            ttlSeconds: 3600,
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.handoff).toBeDefined();
        expect(response.body.handoff.id).toBeDefined();
        expect(response.body.handoff.status).toBe('pending');
        expect(response.body.handoff.targetAgent.id).toBe('target-agent');
      });

      it('should reject handoff with missing fields', async () => {
        const response = await request(app)
          .post('/a2a/handoff')
          .send({
            targetAgentId: 'target-agent',
            // Missing type, context, intent
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /a2a/handoff/:handoffId', () => {
      it('should retrieve a handoff', async () => {
        // Create a handoff
        const createResponse = await request(app)
          .post('/a2a/handoff')
          .send({
            targetAgentId: 'target-agent',
            type: 'checkout',
            context: { checkoutId: 'checkout-123' },
            intent: 'Complete checkout',
            permissions: ['read'],
          })
          .expect(201);

        const handoffId = createResponse.body.handoff.id;

        // Retrieve it
        const response = await request(app)
          .get(`/a2a/handoff/${handoffId}`)
          .expect(200);

        expect(response.body.id).toBe(handoffId);
        expect(response.body.status).toBe('pending');
      });

      it('should return 404 for unknown handoff', async () => {
        const response = await request(app)
          .get('/a2a/handoff/unknown-handoff-id')
          .expect(404);

        expect(response.body.code).toBe('HANDOFF_NOT_FOUND');
      });
    });

    describe('POST /a2a/handoff/:handoffId/accept', () => {
      it('should accept a handoff', async () => {
        // Create a handoff
        const createResponse = await request(app)
          .post('/a2a/handoff')
          .send({
            targetAgentId: 'target-agent',
            type: 'checkout',
            context: { checkoutId: 'checkout-123' },
            intent: 'Complete checkout',
            permissions: ['read', 'execute'],
          })
          .expect(201);

        const handoffId = createResponse.body.handoff.id;

        // Accept it
        const response = await request(app)
          .post(`/a2a/handoff/${handoffId}/accept`)
          .set('X-Agent-Id', 'target-agent')
          .send({ accept: true })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.handoff.status).toBe('accepted');
      });

      it('should reject without agent ID header', async () => {
        const response = await request(app)
          .post('/a2a/handoff/some-id/accept')
          .send({ accept: true })
          .expect(401);

        expect(response.body.code).toBe('UNAUTHORIZED');
      });

      it('should reject if wrong agent tries to accept', async () => {
        // Create a handoff
        const createResponse = await request(app)
          .post('/a2a/handoff')
          .send({
            targetAgentId: 'target-agent',
            type: 'checkout',
            context: { checkoutId: 'checkout-123' },
            intent: 'Complete checkout',
            permissions: ['read'],
          })
          .expect(201);

        const handoffId = createResponse.body.handoff.id;

        // Try to accept with wrong agent
        const response = await request(app)
          .post(`/a2a/handoff/${handoffId}/accept`)
          .set('X-Agent-Id', 'wrong-agent')
          .send({ accept: true })
          .expect(400);

        expect(response.body.errorCode).toBe('PERMISSION_DENIED');
      });
    });

    describe('POST /a2a/handoff/:handoffId/complete', () => {
      it('should complete a handoff', async () => {
        // Create and accept a handoff
        const createResponse = await request(app)
          .post('/a2a/handoff')
          .send({
            targetAgentId: 'target-agent',
            type: 'checkout',
            context: { checkoutId: 'checkout-123' },
            intent: 'Complete checkout',
            permissions: ['read', 'execute'],
          })
          .expect(201);

        const handoffId = createResponse.body.handoff.id;

        await request(app)
          .post(`/a2a/handoff/${handoffId}/accept`)
          .set('X-Agent-Id', 'target-agent')
          .send({ accept: true })
          .expect(200);

        // Complete it
        const response = await request(app)
          .post(`/a2a/handoff/${handoffId}/complete`)
          .set('X-Agent-Id', 'target-agent')
          .send({
            status: 'completed',
            result: { orderId: 'order-456' },
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.handoff.status).toBe('completed');
      });
    });

    describe('GET /a2a/handoffs', () => {
      it('should list handoffs with filters', async () => {
        // Create a handoff
        await request(app)
          .post('/a2a/handoff')
          .send({
            targetAgentId: 'target-agent',
            type: 'checkout',
            context: { checkoutId: 'checkout-123' },
            intent: 'Complete checkout',
            permissions: ['read'],
          })
          .expect(201);

        const response = await request(app)
          .get('/a2a/handoffs')
          .query({ status: 'pending' })
          .expect(200);

        expect(response.body.handoffs).toBeDefined();
        expect(response.body.handoffs.length).toBeGreaterThan(0);
        expect(response.body.handoffs[0].status).toBe('pending');
      });
    });
  });

  // ==========================================================================
  // A2A Stats
  // ==========================================================================
  describe('A2A Stats', () => {
    describe('GET /a2a/stats', () => {
      it('should return statistics', async () => {
        const response = await request(app)
          .get('/a2a/stats')
          .expect(200);

        expect(response.body.agents).toBeDefined();
        expect(response.body.handoffs).toBeDefined();
        expect(response.body.handoffs.total).toBeDefined();
        expect(response.body.handoffs.pending).toBeDefined();
        expect(response.body.handoffs.completed).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Discovery Integration
  // ==========================================================================
  describe('Discovery Integration', () => {
    it('should include bindings in UCP discovery', async () => {
      const response = await request(app)
        .get('/.well-known/ucp')
        .expect(200);

      expect(response.body.bindings).toBeDefined();
      expect(response.body.bindings.mcp).toBeDefined();
      expect(response.body.bindings.mcp.tools).toContain('/mcp/tools');
      expect(response.body.bindings.a2a).toBeDefined();
      expect(response.body.bindings.a2a.agent).toContain('/a2a/agent');
    });
  });
});
