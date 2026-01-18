/**
 * MCP (Model Context Protocol) Service
 * 
 * Handles tool execution for AI models interacting with UCP.
 * Maps MCP tool calls to UCP endpoint invocations.
 */

import { logger } from '../../utils/logger.js';
import {
  MCPToolDefinition,
  MCPToolCallRequest,
  MCPToolCallResponse,
  MCPToolsListResponse,
  UCP_MCP_TOOLS,
  TOOL_TO_ENDPOINT_MAP,
} from './mcp.types.js';

// ============================================================================
// MCP Service
// ============================================================================

/**
 * Get list of available MCP tools
 */
export function getToolsList(): MCPToolsListResponse {
  return {
    tools: UCP_MCP_TOOLS,
    version: '1.0',
    capabilities: [
      'catalog_search',
      'product_details',
      'cart_management',
      'checkout',
      'orders',
      'fulfillment',
      'discounts',
      'payment_handlers',
      'server_checkout',
    ],
  };
}

/**
 * Get a specific tool definition
 */
export function getTool(toolName: string): MCPToolDefinition | undefined {
  return UCP_MCP_TOOLS.find(t => t.name === toolName);
}

/**
 * Get endpoint mapping for a tool
 */
export function getToolEndpoint(toolName: string): { method: string; path: string } | undefined {
  return TOOL_TO_ENDPOINT_MAP[toolName];
}

/**
 * Execute an MCP tool call
 * This function routes the tool call to the appropriate UCP endpoint
 */
export async function executeToolCall(
  request: MCPToolCallRequest,
  baseUrl: string,
  fetchFn: typeof fetch = fetch
): Promise<MCPToolCallResponse> {
  const { tool, arguments: args, requestId } = request;
  
  logger.info('MCP: Executing tool call', { tool, requestId });
  
  // Validate tool exists
  const toolDef = getTool(tool);
  if (!toolDef) {
    return {
      success: false,
      requestId,
      error: {
        code: 'TOOL_NOT_FOUND',
        message: `Tool '${tool}' not found`,
      },
    };
  }
  
  // Get endpoint mapping
  const endpoint = getToolEndpoint(tool);
  if (!endpoint) {
    return {
      success: false,
      requestId,
      error: {
        code: 'ENDPOINT_NOT_MAPPED',
        message: `No endpoint mapping for tool '${tool}'`,
      },
    };
  }
  
  try {
    // Build the URL with path parameters
    let path = endpoint.path;
    const queryParams: Record<string, string> = {};
    const bodyParams: Record<string, unknown> = {};
    
    // Process arguments based on tool
    for (const [key, value] of Object.entries(args)) {
      const pathParam = `:${key}`;
      if (path.includes(pathParam)) {
        // Path parameter
        path = path.replace(pathParam, encodeURIComponent(String(value)));
      } else if (endpoint.method === 'GET') {
        // Query parameter for GET requests
        if (value !== undefined && value !== null) {
          queryParams[key] = String(value);
        }
      } else {
        // Body parameter for POST/PUT/DELETE
        bodyParams[key] = value;
      }
    }
    
    // Build full URL
    let url = `${baseUrl}${path}`;
    const queryString = new URLSearchParams(queryParams).toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    // Make the request
    const fetchOptions: RequestInit = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'X-MCP-Request-Id': requestId || '',
      },
    };
    
    if (endpoint.method !== 'GET' && Object.keys(bodyParams).length > 0) {
      fetchOptions.body = JSON.stringify(bodyParams);
    }
    
    logger.debug('MCP: Making request', { url, method: endpoint.method });
    
    const response = await fetchFn(url, fetchOptions);
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        requestId,
        error: {
          code: data.code || 'REQUEST_FAILED',
          message: data.message || data.error || 'Request failed',
          details: data.details,
        },
      };
    }
    
    return {
      success: true,
      requestId,
      result: data,
    };
    
  } catch (error) {
    logger.error('MCP: Tool execution failed', {
      tool,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      success: false,
      requestId,
      error: {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Tool execution failed',
      },
    };
  }
}

/**
 * Validate tool arguments against schema
 */
export function validateToolArguments(
  toolName: string,
  args: Record<string, unknown>
): { valid: boolean; errors?: string[] } {
  const tool = getTool(toolName);
  if (!tool) {
    return { valid: false, errors: ['Tool not found'] };
  }
  
  const errors: string[] = [];
  const schema = tool.inputSchema;
  
  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (args[field] === undefined || args[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }
  
  // Type checking
  for (const [key, value] of Object.entries(args)) {
    const propSchema = schema.properties[key];
    if (propSchema) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (propSchema.type !== actualType && value !== undefined && value !== null) {
        // Allow string-to-number coercion for numbers
        if (propSchema.type === 'number' && typeof value === 'string' && !isNaN(Number(value))) {
          continue;
        }
        errors.push(`Invalid type for ${key}: expected ${propSchema.type}, got ${actualType}`);
      }
      
      // Enum validation
      if (propSchema.enum && !propSchema.enum.includes(value as string)) {
        errors.push(`Invalid value for ${key}: must be one of ${propSchema.enum.join(', ')}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Generate OpenAPI-style schema for tools (for AI model consumption)
 */
export function generateOpenAPISchema(): object {
  const paths: Record<string, object> = {};
  
  for (const tool of UCP_MCP_TOOLS) {
    const endpoint = TOOL_TO_ENDPOINT_MAP[tool.name];
    if (!endpoint) continue;
    
    const operation = {
      operationId: tool.name,
      summary: tool.description,
      parameters: [] as object[],
      requestBody: undefined as object | undefined,
    };
    
    // Convert input schema to OpenAPI format
    const required = tool.inputSchema.required || [];
    
    for (const [name, schema] of Object.entries(tool.inputSchema.properties)) {
      if (endpoint.path.includes(`:${name}`)) {
        // Path parameter
        operation.parameters.push({
          name,
          in: 'path',
          required: true,
          schema: { type: schema.type },
          description: schema.description,
        });
      } else if (endpoint.method === 'GET') {
        // Query parameter
        operation.parameters.push({
          name,
          in: 'query',
          required: required.includes(name),
          schema: { type: schema.type, default: schema.default },
          description: schema.description,
        });
      }
    }
    
    // Request body for non-GET methods
    if (endpoint.method !== 'GET') {
      const bodyProperties: Record<string, object> = {};
      const bodyRequired: string[] = [];
      
      for (const [name, schema] of Object.entries(tool.inputSchema.properties)) {
        if (!endpoint.path.includes(`:${name}`)) {
          bodyProperties[name] = {
            type: schema.type,
            description: schema.description,
          };
          if (required.includes(name)) {
            bodyRequired.push(name);
          }
        }
      }
      
      if (Object.keys(bodyProperties).length > 0) {
        operation.requestBody = {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: bodyProperties,
                required: bodyRequired.length > 0 ? bodyRequired : undefined,
              },
            },
          },
        };
      }
    }
    
    const pathKey = endpoint.path.replace(/:(\w+)/g, '{$1}');
    if (!paths[pathKey]) {
      paths[pathKey] = {};
    }
    (paths[pathKey] as Record<string, object>)[endpoint.method.toLowerCase()] = operation;
  }
  
  return {
    openapi: '3.0.0',
    info: {
      title: 'UCP MCP Tools API',
      version: '1.0.0',
      description: 'Universal Commerce Protocol tools for AI agents',
    },
    paths,
  };
}
