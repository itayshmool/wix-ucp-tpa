/**
 * Validation Middleware
 * 
 * Express middleware for validating request bodies and query parameters
 * using Zod schemas. Provides consistent error handling for UCP endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger.js';

/**
 * Validation error response format (UCP compliant)
 */
interface ValidationErrorResponse {
  error: string;
  message: string;
  code: string;
  details: {
    field: string;
    message: string;
  }[];
}

/**
 * Format Zod errors into UCP-compliant error response
 */
function formatZodError(error: ZodError): ValidationErrorResponse {
  return {
    error: 'Validation Error',
    message: 'Request validation failed',
    code: 'VALIDATION_ERROR',
    details: error.errors.map((err) => ({
      field: err.path.join('.') || 'unknown',
      message: err.message,
    })),
  };
}

/**
 * Middleware factory for validating request body
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 * 
 * @example
 * router.post('/cart', validateBody(UCPCreateCartRequestSchema), handler);
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        logger.warn('Request body validation failed', {
          path: req.path,
          errors: result.error.errors,
        });
        
        res.status(400).json(formatZodError(result.error));
        return;
      }
      
      // Replace body with parsed (and potentially transformed) data
      req.body = result.data;
      next();
    } catch (err) {
      logger.error('Validation middleware error', { error: err });
      res.status(500).json({
        error: 'Internal Error',
        message: 'Validation processing failed',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Middleware factory for validating query parameters
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 * 
 * @example
 * router.get('/products', validateQuery(ProductsQuerySchema), handler);
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        logger.warn('Query params validation failed', {
          path: req.path,
          query: req.query,
          errors: result.error.errors,
        });
        
        res.status(400).json(formatZodError(result.error));
        return;
      }
      
      // Replace query with parsed (and potentially transformed) data
      // Note: We store in req.validatedQuery to avoid type issues
      (req as any).validatedQuery = result.data;
      next();
    } catch (err) {
      logger.error('Query validation middleware error', { error: err });
      res.status(500).json({
        error: 'Internal Error',
        message: 'Validation processing failed',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Middleware factory for validating URL parameters
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 * 
 * @example
 * router.get('/products/:id', validateParams(ProductIdSchema), handler);
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        logger.warn('URL params validation failed', {
          path: req.path,
          params: req.params,
          errors: result.error.errors,
        });
        
        res.status(400).json(formatZodError(result.error));
        return;
      }
      
      // Store validated params
      (req as any).validatedParams = result.data;
      next();
    } catch (err) {
      logger.error('Params validation middleware error', { error: err });
      res.status(500).json({
        error: 'Internal Error',
        message: 'Validation processing failed',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Combined validation middleware for body and query
 * 
 * @param bodySchema - Zod schema for body validation
 * @param querySchema - Zod schema for query validation
 * @returns Express middleware function
 */
export function validate<B, Q>(bodySchema?: ZodSchema<B>, querySchema?: ZodSchema<Q>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: { field: string; message: string }[] = [];
    
    // Validate body if schema provided
    if (bodySchema) {
      const bodyResult = bodySchema.safeParse(req.body);
      if (!bodyResult.success) {
        errors.push(...bodyResult.error.errors.map(err => ({
          field: `body.${err.path.join('.')}`,
          message: err.message,
        })));
      } else {
        req.body = bodyResult.data;
      }
    }
    
    // Validate query if schema provided
    if (querySchema) {
      const queryResult = querySchema.safeParse(req.query);
      if (!queryResult.success) {
        errors.push(...queryResult.error.errors.map(err => ({
          field: `query.${err.path.join('.')}`,
          message: err.message,
        })));
      } else {
        (req as any).validatedQuery = queryResult.data;
      }
    }
    
    if (errors.length > 0) {
      logger.warn('Request validation failed', {
        path: req.path,
        errorCount: errors.length,
      });
      
      res.status(400).json({
        error: 'Validation Error',
        message: 'Request validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
      return;
    }
    
    next();
  };
}
