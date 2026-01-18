/**
 * MCP (Model Context Protocol) Routes
 * 
 * Exposes UCP operations as MCP tools for AI models.
 */

import { Router, Request, Response } from 'express';
import {
  getToolsList,
  getTool,
  executeToolCall,
  validateToolArguments,
  generateOpenAPISchema,
} from '../services/mcp/mcp.service.js';
import { MCPToolCallRequestSchema } from '../services/mcp/mcp.types.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

const router = Router();

// ============================================================================
// MCP Discovery
// ============================================================================

/**
 * List all available MCP tools
 * GET /mcp/tools
 */
router.get('/mcp/tools', (_req: Request, res: Response) => {
  const tools = getToolsList();
  res.json(tools);
});

/**
 * Get a specific tool definition
 * GET /mcp/tools/:toolName
 */
router.get('/mcp/tools/:toolName', (req: Request, res: Response) => {
  const { toolName } = req.params;
  const tool = getTool(toolName);
  
  if (!tool) {
    res.status(404).json({
      error: 'Tool not found',
      code: 'TOOL_NOT_FOUND',
    });
    return;
  }
  
  res.json(tool);
});

/**
 * Get OpenAPI schema for all tools
 * GET /mcp/openapi
 */
router.get('/mcp/openapi', (_req: Request, res: Response) => {
  const schema = generateOpenAPISchema();
  res.json(schema);
});

// ============================================================================
// MCP Tool Execution
// ============================================================================

/**
 * Execute an MCP tool call
 * POST /mcp/call
 * 
 * Body: {
 *   tool: string,       // Tool name (e.g., "ucp_search_products")
 *   arguments: object,  // Tool arguments
 *   requestId?: string  // Optional request ID for tracking
 * }
 */
router.post('/mcp/call', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const parseResult = MCPToolCallRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid tool call request',
          details: parseResult.error.errors,
        },
      });
      return;
    }
    
    const request = parseResult.data;
    
    logger.info('MCP: Tool call received', {
      tool: request.tool,
      requestId: request.requestId,
    });
    
    // Check if tool exists
    const tool = getTool(request.tool);
    if (!tool) {
      res.status(400).json({
        success: false,
        requestId: request.requestId,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool '${request.tool}' not found`,
        },
      });
      return;
    }
    
    // Validate arguments
    const validation = validateToolArguments(request.tool, request.arguments);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        requestId: request.requestId,
        error: {
          code: 'INVALID_ARGUMENTS',
          message: 'Invalid tool arguments',
          details: validation.errors,
        },
      });
      return;
    }
    
    // Execute the tool call
    const baseUrl = config.BASE_URL || `http://localhost:${config.PORT}`;
    const result = await executeToolCall(request, baseUrl);
    
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    
    res.json(result);
  } catch (error) {
    logger.error('MCP: Tool call failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Tool call failed',
      },
    });
  }
});

/**
 * Batch execute multiple MCP tool calls
 * POST /mcp/batch
 * 
 * Body: {
 *   calls: Array<{ tool: string, arguments: object, requestId?: string }>
 * }
 */
router.post('/mcp/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { calls } = req.body;
    
    if (!Array.isArray(calls) || calls.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request must include an array of tool calls',
        },
      });
      return;
    }
    
    if (calls.length > 10) {
      res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_CALLS',
          message: 'Maximum 10 tool calls per batch',
        },
      });
      return;
    }
    
    logger.info('MCP: Batch call received', { count: calls.length });
    
    const baseUrl = config.BASE_URL || `http://localhost:${config.PORT}`;
    
    // Execute all calls in parallel
    const results = await Promise.all(
      calls.map(async (call: { tool: string; arguments: Record<string, unknown>; requestId?: string }) => {
        const parseResult = MCPToolCallRequestSchema.safeParse(call);
        if (!parseResult.success) {
          return {
            success: false,
            requestId: call.requestId,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid tool call',
            },
          };
        }
        return executeToolCall(parseResult.data, baseUrl);
      })
    );
    
    res.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.error('MCP: Batch call failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Batch call failed',
      },
    });
  }
});

// ============================================================================
// MCP Validation
// ============================================================================

/**
 * Validate tool arguments without executing
 * POST /mcp/validate
 */
router.post('/mcp/validate', (req: Request, res: Response) => {
  const { tool, arguments: args } = req.body;
  
  if (!tool) {
    res.status(400).json({
      valid: false,
      errors: ['Tool name is required'],
    });
    return;
  }
  
  const validation = validateToolArguments(tool, args || {});
  res.json(validation);
});

export default router;
