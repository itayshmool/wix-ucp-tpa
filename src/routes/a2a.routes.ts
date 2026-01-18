/**
 * A2A (Agent-to-Agent) Routes
 * 
 * Handles multi-agent transaction coordination and delegation.
 */

import { Router, Request, Response } from 'express';
import {
  getSelfAgentCard,
  registerAgent,
  unregisterAgent,
  getAgent,
  listAgents,
  resolveAgents,
  createHandoff,
  getHandoff,
  listHandoffs,
  processHandoffAcceptance,
  completeHandoff,
  getA2AStats,
} from '../services/a2a/a2a.service.js';
import {
  DelegationRequestSchema,
  HandoffAcceptanceSchema,
  HandoffCompletionSchema,
  AgentCard,
} from '../services/a2a/a2a.types.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================================================
// Agent Card & Discovery
// ============================================================================

/**
 * Get this server's agent card
 * GET /a2a/agent
 */
router.get('/a2a/agent', (_req: Request, res: Response) => {
  const agentCard = getSelfAgentCard();
  res.json(agentCard);
});

/**
 * List all known agents
 * GET /a2a/agents
 */
router.get('/a2a/agents', (_req: Request, res: Response) => {
  const agents = listAgents();
  res.json({ agents });
});

/**
 * Get a specific agent by ID
 * GET /a2a/agents/:agentId
 */
router.get('/a2a/agents/:agentId', (req: Request, res: Response) => {
  const { agentId } = req.params;
  const agent = getAgent(agentId);
  
  if (!agent) {
    res.status(404).json({
      error: 'Agent not found',
      code: 'AGENT_NOT_FOUND',
    });
    return;
  }
  
  res.json(agent);
});

/**
 * Resolve agents by capability
 * POST /a2a/resolve
 */
router.post('/a2a/resolve', (req: Request, res: Response) => {
  const result = resolveAgents(req.body);
  res.json(result);
});

/**
 * Register an external agent
 * POST /a2a/agents
 */
router.post('/a2a/agents', (req: Request, res: Response) => {
  const agentCard = req.body as AgentCard;
  
  // Basic validation
  if (!agentCard.id || !agentCard.name || !agentCard.version) {
    res.status(400).json({
      error: 'Invalid agent card',
      code: 'VALIDATION_ERROR',
      details: 'Agent card must include id, name, and version',
    });
    return;
  }
  
  registerAgent(agentCard);
  
  res.status(201).json({
    success: true,
    message: 'Agent registered',
    agentId: agentCard.id,
  });
});

/**
 * Unregister an agent
 * DELETE /a2a/agents/:agentId
 */
router.delete('/a2a/agents/:agentId', (req: Request, res: Response) => {
  const { agentId } = req.params;
  const removed = unregisterAgent(agentId);
  
  if (!removed) {
    res.status(404).json({
      error: 'Agent not found',
      code: 'AGENT_NOT_FOUND',
    });
    return;
  }
  
  res.json({ success: true, message: 'Agent unregistered' });
});

// ============================================================================
// Transaction Handoffs
// ============================================================================

/**
 * Create a delegation/handoff to another agent
 * POST /a2a/handoff
 */
router.post('/a2a/handoff', (req: Request, res: Response) => {
  // Validate request
  const parseResult = DelegationRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: parseResult.error.errors,
    });
    return;
  }
  
  // Get source agent from header or default to self
  const sourceAgentId = req.headers['x-agent-id'] as string || 'ucp-wix-agent';
  
  logger.info('A2A: Creating handoff', {
    sourceAgentId,
    targetAgentId: parseResult.data.targetAgentId,
  });
  
  const result = createHandoff(sourceAgentId, parseResult.data);
  
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  
  res.status(201).json(result);
});

/**
 * Get a handoff by ID
 * GET /a2a/handoff/:handoffId
 */
router.get('/a2a/handoff/:handoffId', (req: Request, res: Response) => {
  const { handoffId } = req.params;
  const handoff = getHandoff(handoffId);
  
  if (!handoff) {
    res.status(404).json({
      error: 'Handoff not found',
      code: 'HANDOFF_NOT_FOUND',
    });
    return;
  }
  
  res.json(handoff);
});

/**
 * List handoffs with optional filters
 * GET /a2a/handoffs
 */
router.get('/a2a/handoffs', (req: Request, res: Response) => {
  const { sourceAgentId, targetAgentId, status } = req.query;
  
  const handoffs = listHandoffs({
    sourceAgentId: sourceAgentId as string,
    targetAgentId: targetAgentId as string,
    status: status as 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired',
  });
  
  res.json({ handoffs });
});

/**
 * Accept or reject a handoff
 * POST /a2a/handoff/:handoffId/accept
 */
router.post('/a2a/handoff/:handoffId/accept', (req: Request, res: Response) => {
  const { handoffId } = req.params;
  
  // Get accepting agent from header
  const agentId = req.headers['x-agent-id'] as string;
  if (!agentId) {
    res.status(401).json({
      error: 'Agent ID required',
      code: 'UNAUTHORIZED',
      details: 'Include X-Agent-Id header',
    });
    return;
  }
  
  const parseResult = HandoffAcceptanceSchema.safeParse({
    handoffId,
    accept: req.body.accept ?? true,
    reason: req.body.reason,
  });
  
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: parseResult.error.errors,
    });
    return;
  }
  
  const result = processHandoffAcceptance(agentId, parseResult.data);
  
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  
  res.json(result);
});

/**
 * Complete a handoff
 * POST /a2a/handoff/:handoffId/complete
 */
router.post('/a2a/handoff/:handoffId/complete', (req: Request, res: Response) => {
  const { handoffId } = req.params;
  
  // Get completing agent from header
  const agentId = req.headers['x-agent-id'] as string;
  if (!agentId) {
    res.status(401).json({
      error: 'Agent ID required',
      code: 'UNAUTHORIZED',
      details: 'Include X-Agent-Id header',
    });
    return;
  }
  
  const parseResult = HandoffCompletionSchema.safeParse({
    handoffId,
    status: req.body.status || 'completed',
    result: req.body.result,
    error: req.body.error,
  });
  
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: parseResult.error.errors,
    });
    return;
  }
  
  const result = completeHandoff(agentId, parseResult.data);
  
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  
  res.json(result);
});

// ============================================================================
// Stats & Health
// ============================================================================

/**
 * Get A2A statistics
 * GET /a2a/stats
 */
router.get('/a2a/stats', (_req: Request, res: Response) => {
  const stats = getA2AStats();
  res.json(stats);
});

export default router;
