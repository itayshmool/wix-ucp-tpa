/**
 * A2A (Agent-to-Agent) Service
 * 
 * Handles multi-agent transaction coordination and delegation.
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import {
  AgentCard,
  TransactionHandoff,
  DelegationRequest,
  DelegationResponse,
  AgentResolutionRequest,
  AgentResolutionResponse,
  HandoffAcceptance,
  HandoffCompletion,
  A2AErrorCodes,
} from './a2a.types.js';
import { config } from '../../config/env.js';

// ============================================================================
// In-Memory Storage (use Redis in production)
// ============================================================================

// Registered agents
const registeredAgents: Map<string, AgentCard> = new Map();

// Active handoffs
const activeHandoffs: Map<string, TransactionHandoff> = new Map();

// ============================================================================
// Self Agent Card
// ============================================================================

/**
 * Get this server's agent card
 */
export function getSelfAgentCard(): AgentCard {
  const baseUrl = config.BASE_URL || 'https://wix-ucp-tpa.onrender.com';
  
  return {
    id: 'ucp-wix-agent',
    name: 'Pop Stop Drink UCP Agent',
    description: 'AI commerce agent for Pop Stop Drink store powered by Wix',
    version: '1.0.0',
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
    endpoints: {
      base: baseUrl,
      mcp: `${baseUrl}/mcp`,
      a2a: `${baseUrl}/a2a`,
    },
    trust: {
      level: 'verified',
      verifiedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Agent Registration
// ============================================================================

/**
 * Register an external agent
 */
export function registerAgent(agent: AgentCard): void {
  registeredAgents.set(agent.id, agent);
  logger.info('A2A: Agent registered', { agentId: agent.id, name: agent.name });
}

/**
 * Unregister an agent
 */
export function unregisterAgent(agentId: string): boolean {
  const removed = registeredAgents.delete(agentId);
  if (removed) {
    logger.info('A2A: Agent unregistered', { agentId });
  }
  return removed;
}

/**
 * Get a registered agent
 */
export function getAgent(agentId: string): AgentCard | undefined {
  // Check if it's self
  if (agentId === 'ucp-wix-agent') {
    return getSelfAgentCard();
  }
  return registeredAgents.get(agentId);
}

/**
 * List all registered agents
 */
export function listAgents(): AgentCard[] {
  return [getSelfAgentCard(), ...Array.from(registeredAgents.values())];
}

/**
 * Resolve agents by criteria
 */
export function resolveAgents(request: AgentResolutionRequest): AgentResolutionResponse {
  let agents = listAgents();
  
  // Filter by agent ID
  if (request.agentId) {
    agents = agents.filter(a => a.id === request.agentId);
  }
  
  // Filter by capability
  if (request.capability) {
    agents = agents.filter(a => a.capabilities.includes(request.capability!));
  }
  
  // Filter by trust level
  if (request.minTrustLevel) {
    const trustOrder = ['sandbox', 'verified', 'trusted'];
    const minIndex = trustOrder.indexOf(request.minTrustLevel);
    agents = agents.filter(a => trustOrder.indexOf(a.trust.level) >= minIndex);
  }
  
  return { agents };
}

// ============================================================================
// Transaction Handoffs
// ============================================================================

/**
 * Create a delegation (handoff) to another agent
 */
export function createHandoff(
  sourceAgentId: string,
  request: DelegationRequest
): DelegationResponse {
  logger.info('A2A: Creating handoff', {
    sourceAgentId,
    targetAgentId: request.targetAgentId,
    type: request.type,
  });
  
  // Validate source agent
  const sourceAgent = getAgent(sourceAgentId);
  if (!sourceAgent) {
    return {
      success: false,
      error: 'Source agent not found',
      errorCode: A2AErrorCodes.AGENT_NOT_FOUND,
    };
  }
  
  // Validate target agent (or allow unknown for external agents)
  const targetAgent = getAgent(request.targetAgentId);
  
  // Create handoff
  const now = new Date();
  const expiresAt = new Date(now.getTime() + request.ttlSeconds * 1000);
  
  const handoff: TransactionHandoff = {
    id: `handoff_${uuidv4()}`,
    type: request.type,
    sourceAgent: {
      id: sourceAgent.id,
      name: sourceAgent.name,
    },
    targetAgent: targetAgent ? {
      id: targetAgent.id,
      name: targetAgent.name,
    } : {
      id: request.targetAgentId,
      name: 'External Agent',
    },
    context: request.context,
    intent: request.intent,
    permissions: request.permissions,
    expiresAt: expiresAt.toISOString(),
    status: 'pending',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  
  activeHandoffs.set(handoff.id, handoff);
  
  logger.info('A2A: Handoff created', { handoffId: handoff.id });
  
  return {
    success: true,
    handoff,
  };
}

/**
 * Get a handoff by ID
 */
export function getHandoff(handoffId: string): TransactionHandoff | undefined {
  return activeHandoffs.get(handoffId);
}

/**
 * List active handoffs
 */
export function listHandoffs(filters?: {
  sourceAgentId?: string;
  targetAgentId?: string;
  status?: TransactionHandoff['status'];
}): TransactionHandoff[] {
  let handoffs = Array.from(activeHandoffs.values());
  
  if (filters?.sourceAgentId) {
    handoffs = handoffs.filter(h => h.sourceAgent.id === filters.sourceAgentId);
  }
  
  if (filters?.targetAgentId) {
    handoffs = handoffs.filter(h => h.targetAgent?.id === filters.targetAgentId);
  }
  
  if (filters?.status) {
    handoffs = handoffs.filter(h => h.status === filters.status);
  }
  
  return handoffs;
}

/**
 * Accept or reject a handoff
 */
export function processHandoffAcceptance(
  agentId: string,
  acceptance: HandoffAcceptance
): DelegationResponse {
  const handoff = getHandoff(acceptance.handoffId);
  
  if (!handoff) {
    return {
      success: false,
      error: 'Handoff not found',
      errorCode: A2AErrorCodes.HANDOFF_NOT_FOUND,
    };
  }
  
  // Check if handoff is for this agent
  if (handoff.targetAgent?.id !== agentId) {
    return {
      success: false,
      error: 'Permission denied - handoff is for a different agent',
      errorCode: A2AErrorCodes.PERMISSION_DENIED,
    };
  }
  
  // Check if handoff is still pending
  if (handoff.status !== 'pending') {
    return {
      success: false,
      error: `Handoff already ${handoff.status}`,
      errorCode: A2AErrorCodes.HANDOFF_ALREADY_PROCESSED,
    };
  }
  
  // Check expiration
  if (new Date(handoff.expiresAt) < new Date()) {
    handoff.status = 'expired';
    return {
      success: false,
      error: 'Handoff has expired',
      errorCode: A2AErrorCodes.HANDOFF_EXPIRED,
    };
  }
  
  // Update status
  handoff.status = acceptance.accept ? 'accepted' : 'rejected';
  handoff.updatedAt = new Date().toISOString();
  
  logger.info('A2A: Handoff acceptance processed', {
    handoffId: handoff.id,
    accepted: acceptance.accept,
  });
  
  return {
    success: true,
    handoff,
  };
}

/**
 * Complete a handoff
 */
export function completeHandoff(
  agentId: string,
  completion: HandoffCompletion
): DelegationResponse {
  const handoff = getHandoff(completion.handoffId);
  
  if (!handoff) {
    return {
      success: false,
      error: 'Handoff not found',
      errorCode: A2AErrorCodes.HANDOFF_NOT_FOUND,
    };
  }
  
  // Check if handoff is for this agent
  if (handoff.targetAgent?.id !== agentId) {
    return {
      success: false,
      error: 'Permission denied - handoff is for a different agent',
      errorCode: A2AErrorCodes.PERMISSION_DENIED,
    };
  }
  
  // Check if handoff was accepted
  if (handoff.status !== 'accepted') {
    return {
      success: false,
      error: `Cannot complete handoff with status: ${handoff.status}`,
      errorCode: A2AErrorCodes.HANDOFF_ALREADY_PROCESSED,
    };
  }
  
  // Update status
  handoff.status = completion.status === 'completed' ? 'completed' : 'rejected';
  handoff.updatedAt = new Date().toISOString();
  
  logger.info('A2A: Handoff completed', {
    handoffId: handoff.id,
    status: completion.status,
  });
  
  return {
    success: true,
    handoff,
  };
}

// ============================================================================
// Cleanup & Utilities
// ============================================================================

/**
 * Clean up expired handoffs
 */
export function cleanupExpiredHandoffs(): number {
  const now = new Date();
  let cleaned = 0;
  
  for (const [, handoff] of activeHandoffs) {
    if (handoff.status === 'pending' && new Date(handoff.expiresAt) < now) {
      handoff.status = 'expired';
      handoff.updatedAt = now.toISOString();
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.info('A2A: Cleaned up expired handoffs', { count: cleaned });
  }
  
  return cleaned;
}

/**
 * Clear all data (for testing)
 */
export function clearA2AData(): void {
  registeredAgents.clear();
  activeHandoffs.clear();
  logger.info('A2A: Data cleared');
}

/**
 * Get A2A statistics
 */
export function getA2AStats(): {
  agents: number;
  handoffs: { total: number; pending: number; completed: number };
} {
  const handoffs = Array.from(activeHandoffs.values());
  
  return {
    agents: registeredAgents.size + 1, // +1 for self
    handoffs: {
      total: handoffs.length,
      pending: handoffs.filter(h => h.status === 'pending').length,
      completed: handoffs.filter(h => h.status === 'completed').length,
    },
  };
}
