# Phase 8: Schema Validation

## Context
UCP spec requires strict JSON schema validation at each protocol step. Requests and responses must conform to published schemas, and errors must follow the `message.json` format.

## Reference Documentation
- Schema Authoring: https://ucp.dev/specification/schema-authoring
- Error Format: UCP message.json schema
- Validation Library: https://ajv.js.org/

## Goal
Add comprehensive schema validation to all UCP endpoints with spec-compliant error responses.

## Priority: 🟡 Medium | Complexity: 🟢 Low | Duration: 2-3 days

---

## Tasks

### 1. Install Validation Library

```bash
npm install ajv ajv-formats
# OR for TypeScript-first approach
npm install zod
```

Recommendation: Use **Zod** for TypeScript projects (better DX, type inference).

### 2. Create UCP Request Schemas (src/schemas/ucp/)

#### CreateCartRequest Schema
```typescript
// src/schemas/ucp/cart.schema.ts
import { z } from 'zod';

export const UCPAddToCartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  variantId: z.string().optional(),
});

export const UCPCreateCartRequestSchema = z.object({
  items: z.array(UCPAddToCartItemSchema).min(1, 'At least one item required'),
});

export type UCPCreateCartRequest = z.infer<typeof UCPCreateCartRequestSchema>;
```

#### CreateCheckoutRequest Schema
```typescript
// src/schemas/ucp/checkout.schema.ts
import { z } from 'zod';

export const UCPBuyerInfoSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export const UCPAddressSchema = z.object({
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().length(2, 'Country must be ISO 3166-1 alpha-2'),
});

export const UCPCreateCheckoutRequestSchema = z.object({
  cartId: z.string().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  buyerInfo: UCPBuyerInfoSchema.optional(),
  shippingAddress: UCPAddressSchema.optional(),
});

export const UCPUpdateCheckoutRequestSchema = z.object({
  buyerInfo: UCPBuyerInfoSchema.optional(),
  shippingAddress: UCPAddressSchema.optional(),
  billingAddress: UCPAddressSchema.optional(),
  discountCodes: z.array(z.string()).optional(),
});
```

#### Products Query Schema
```typescript
// src/schemas/ucp/products.schema.ts
import { z } from 'zod';

export const UCPProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
  category: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
});
```

### 3. Create Validation Middleware (src/middleware/schema-validator.ts)

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export interface UCPValidationError {
  error: {
    type: 'validation_error';
    message: string;
    field?: string;
    code: string;
    details?: unknown;
  };
}

/**
 * Create validation middleware for request body
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0];
        const response: UCPValidationError = {
          error: {
            type: 'validation_error',
            message: firstError.message,
            field: firstError.path.join('.'),
            code: mapZodErrorToCode(firstError),
            details: error.errors,
          },
        };
        
        logger.warn('UCP validation error', { 
          path: req.path, 
          errors: error.errors 
        });
        
        return res.status(400).json(response);
      }
      next(error);
    }
  };
}

/**
 * Create validation middleware for query params
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0];
        const response: UCPValidationError = {
          error: {
            type: 'validation_error',
            message: `Invalid query parameter: ${firstError.message}`,
            field: firstError.path.join('.'),
            code: 'INVALID_QUERY_PARAM',
          },
        };
        
        return res.status(400).json(response);
      }
      next(error);
    }
  };
}

/**
 * Map Zod error codes to UCP error codes
 */
function mapZodErrorToCode(error: z.ZodIssue): string {
  const codeMap: Record<string, string> = {
    'invalid_type': 'INVALID_TYPE',
    'invalid_string': 'INVALID_STRING',
    'too_small': 'VALUE_TOO_SMALL',
    'too_big': 'VALUE_TOO_LARGE',
    'invalid_enum_value': 'INVALID_ENUM',
    'custom': 'VALIDATION_ERROR',
  };
  
  // Add field-specific codes
  const field = error.path.join('.');
  if (field === 'items' && error.code === 'too_small') {
    return 'EMPTY_CART';
  }
  if (field.includes('email')) {
    return 'INVALID_EMAIL';
  }
  if (field.includes('productId')) {
    return 'INVALID_PRODUCT_ID';
  }
  
  return codeMap[error.code] || 'VALIDATION_ERROR';
}
```

### 4. Apply Validation to UCP Routes

Update `src/routes/ucp.routes.ts`:

```typescript
import { validateBody, validateQuery } from '../middleware/schema-validator.js';
import { 
  UCPCreateCartRequestSchema,
  UCPProductsQuerySchema,
  UCPCreateCheckoutRequestSchema,
  UCPUpdateCheckoutRequestSchema,
} from '../schemas/ucp/index.js';

// Products - validate query params
router.get('/ucp/products', 
  validateQuery(UCPProductsQuerySchema),
  async (req: Request, res: Response) => {
    // ... existing handler
  }
);

// Cart - validate body
router.post('/ucp/cart',
  validateBody(UCPCreateCartRequestSchema),
  async (req: Request, res: Response) => {
    // ... existing handler
  }
);

// Checkout - validate body
router.post('/ucp/checkout',
  validateBody(UCPCreateCheckoutRequestSchema),
  async (req: Request, res: Response) => {
    // ... existing handler
  }
);
```

### 5. Create Response Schemas (Optional - for documentation)

```typescript
// src/schemas/ucp/responses.schema.ts
import { z } from 'zod';

export const UCPPriceSchema = z.object({
  amount: z.number(),
  currency: z.string(),
  formatted: z.string(),
});

export const UCPProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: UCPPriceSchema,
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
  })),
  available: z.boolean(),
  stock: z.number().optional(),
  category: z.string().optional(),
});

export const UCPProductsResponseSchema = z.object({
  products: z.array(UCPProductSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});
```

### 6. Add Schema Version Header

```typescript
// src/middleware/ucp-headers.ts
import { Request, Response, NextFunction } from 'express';

const UCP_SCHEMA_VERSION = '2026-01-11';

export function ucpHeaders(req: Request, res: Response, next: NextFunction) {
  // Set UCP headers on response
  res.setHeader('UCP-Schema-Version', UCP_SCHEMA_VERSION);
  res.setHeader('Content-Type', 'application/json');
  
  // Parse UCP headers from request
  const agentHeader = req.headers['ucp-agent'];
  const platformHeader = req.headers['ucp-platform'];
  
  if (agentHeader) {
    (req as any).ucpAgent = agentHeader;
  }
  if (platformHeader) {
    (req as any).ucpPlatform = platformHeader;
  }
  
  next();
}

// Apply to all UCP routes
router.use('/ucp', ucpHeaders);
```

### 7. Create Schema Index (src/schemas/ucp/index.ts)

```typescript
// Re-export all schemas
export * from './cart.schema.js';
export * from './checkout.schema.js';
export * from './products.schema.js';
export * from './responses.schema.js';

// Schema version
export const UCP_SCHEMA_VERSION = '2026-01-11';
```

### 8. Add Tests (tests/schema-validation.test.ts)

```typescript
import { describe, it, expect } from 'vitest';
import { UCPCreateCartRequestSchema } from '../src/schemas/ucp/cart.schema.js';

describe('UCP Schema Validation', () => {
  describe('CreateCartRequest', () => {
    it('should accept valid cart request', () => {
      const valid = {
        items: [{ productId: 'prod-123', quantity: 2 }],
      };
      
      expect(() => UCPCreateCartRequestSchema.parse(valid)).not.toThrow();
    });
    
    it('should reject empty items array', () => {
      const invalid = { items: [] };
      
      expect(() => UCPCreateCartRequestSchema.parse(invalid)).toThrow();
    });
    
    it('should reject negative quantity', () => {
      const invalid = {
        items: [{ productId: 'prod-123', quantity: -1 }],
      };
      
      expect(() => UCPCreateCartRequestSchema.parse(invalid)).toThrow();
    });
    
    it('should reject missing productId', () => {
      const invalid = {
        items: [{ quantity: 1 }],
      };
      
      expect(() => UCPCreateCartRequestSchema.parse(invalid)).toThrow();
    });
  });
});
```

---

## Error Code Mapping

| Validation Error | UCP Code | HTTP |
|------------------|----------|------|
| Missing required field | MISSING_FIELD | 400 |
| Invalid email format | INVALID_EMAIL | 400 |
| Invalid product ID | INVALID_PRODUCT_ID | 400 |
| Quantity < 1 | VALUE_TOO_SMALL | 400 |
| Limit > 100 | VALUE_TOO_LARGE | 400 |
| Empty cart | EMPTY_CART | 400 |
| Invalid country code | INVALID_COUNTRY | 400 |
| Invalid URL format | INVALID_URL | 400 |

---

## File Structure

```
src/
├── schemas/
│   └── ucp/
│       ├── index.ts           # Re-exports all schemas
│       ├── cart.schema.ts     # Cart request schemas
│       ├── checkout.schema.ts # Checkout request schemas
│       ├── products.schema.ts # Product query schemas
│       └── responses.schema.ts# Response schemas (docs)
├── middleware/
│   ├── schema-validator.ts    # Validation middleware
│   └── ucp-headers.ts         # UCP header handling
└── routes/
    └── ucp.routes.ts          # Updated with validation
```

---

## Acceptance Criteria

- [ ] Zod (or ajv) installed and configured
- [ ] All UCP request bodies validated
- [ ] Query parameters validated with defaults
- [ ] Validation errors return UCP error format
- [ ] UCP-Schema-Version header on all responses
- [ ] Error codes follow UCP naming convention
- [ ] Validation tests pass
- [ ] No breaking changes to valid requests

---

## Notes

### Why Zod over ajv?
- Native TypeScript integration
- Infers types from schemas (DRY)
- Cleaner error messages
- Better composability
- Smaller bundle for this use case

### Future Enhancements
- OpenAPI spec generation from Zod schemas
- Response validation in development mode
- Schema versioning for backward compatibility
