/**
 * A2A (Agent-to-Agent) Binding Types
 * 
 * Types for multi-agent transaction coordination and delegation.
 */

import { z } from 'zod';

// ============================================================================
// Agent Card (Agent Identity)
// ============================================================================

export interface AgentCard {
  id: string;
  name: string;
  description?: string;
  version: string;
  capabilities: string[];
  endpoints: {
    base: string;
    mcp?: string;
    a2a?: string;
  };
  trust: {
    level: 'sandbox' | 'verified' | 'trusted';
    verifiedAt?: string;
    certifications?: string[];
  };
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Transaction Handoff
// ============================================================================

export interface TransactionHandoff {
  id: string;
  type: 'checkout' | 'order' | 'fulfillment' | 'support';
  
  // Source agent (initiating handoff)
  sourceAgent: {
    id: string;
    name: string;
  };
  
  // Target agent (receiving handoff)
  targetAgent?: {
    id: string;
    name: string;
  };
  
  // Transaction context
  context: {
    checkoutId?: string;
    orderId?: string;
    cartId?: string;
    customerId?: string;
    sessionId?: string;
  };
  
  // What the target agent should do
  intent: string;
  
  // Permissions granted to target agent
  permissions: Array<'read' | 'write' | 'execute' | 'delegate'>;
  
  // Handoff validity
  expiresAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired';
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Delegation Request
// ============================================================================

export const DelegationRequestSchema = z.object({
  // Target agent to delegate to
  targetAgentId: z.string().min(1, 'Target agent ID is required'),
  
  // Type of delegation
  type: z.enum(['checkout', 'order', 'fulfillment', 'support']),
  
  // Context to pass
  context: z.object({
    checkoutId: z.string().optional(),
    orderId: z.string().optional(),
    cartId: z.string().optional(),
    customerId: z.string().optional(),
    sessionId: z.string().optional(),
  }),
  
  // What the target agent should do
  intent: z.string().min(1, 'Intent is required'),
  
  // Permissions to grant
  permissions: z.array(z.enum(['read', 'write', 'execute', 'delegate'])).default(['read']),
  
  // How long the delegation is valid (in seconds)
  ttlSeconds: z.number().min(60).max(86400).default(3600),
  
  // Callback URL for status updates
  callbackUrl: z.string().url().optional(),
});

export type DelegationRequest = z.infer<typeof DelegationRequestSchema>;

// ============================================================================
// Delegation Response
// ============================================================================

export interface DelegationResponse {
  success: boolean;
  handoff?: TransactionHandoff;
  error?: string;
  errorCode?: string;
}

// ============================================================================
// Agent Resolution
// ============================================================================

export interface AgentResolutionRequest {
  // Find agent by capability
  capability?: string;
  
  // Find agent by ID
  agentId?: string;
  
  // Trust level required
  minTrustLevel?: 'sandbox' | 'verified' | 'trusted';
}

export interface AgentResolutionResponse {
  agents: AgentCard[];
}

// ============================================================================
// Handoff Acceptance
// ============================================================================

export const HandoffAcceptanceSchema = z.object({
  handoffId: z.string().min(1, 'Handoff ID is required'),
  accept: z.boolean(),
  reason: z.string().optional(),
});

export type HandoffAcceptance = z.infer<typeof HandoffAcceptanceSchema>;

// ============================================================================
// Handoff Completion
// ============================================================================

export const HandoffCompletionSchema = z.object({
  handoffId: z.string().min(1, 'Handoff ID is required'),
  status: z.enum(['completed', 'failed', 'cancelled']),
  result: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});

export type HandoffCompletion = z.infer<typeof HandoffCompletionSchema>;

// ============================================================================
// Error Codes
// ============================================================================

export const A2AErrorCodes = {
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  HANDOFF_NOT_FOUND: 'HANDOFF_NOT_FOUND',
  HANDOFF_EXPIRED: 'HANDOFF_EXPIRED',
  HANDOFF_ALREADY_PROCESSED: 'HANDOFF_ALREADY_PROCESSED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_CONTEXT: 'INVALID_CONTEXT',
  TRUST_LEVEL_INSUFFICIENT: 'TRUST_LEVEL_INSUFFICIENT',
} as const;

export type A2AErrorCode = keyof typeof A2AErrorCodes;
