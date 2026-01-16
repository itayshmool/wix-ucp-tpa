# Phase 2.1: Products & Catalog Service

## Context
Access and manage the merchant's product catalog. Wix is migrating from Catalog V1 to V3 (Q4 2025), so we'll implement support for both with version detection.

## Reference Documentation
- Catalog V3: https://dev.wix.com/docs/rest/business-solutions/stores/catalog-v3
- Catalog V1: https://dev.wix.com/docs/rest/business-solutions/stores/catalog-v1

## Goal
Create a products service that abstracts catalog operations and handles API versioning.

---

## Tasks

### 1. Product Types (src/services/types/product.types.ts)

Unified Product interface (abstracts V1/V3 differences):
- id, name, slug, description, sku
- price: { amount, currency, formatted }
- compareAtPrice: { amount, currency }
- media: ProductMedia[]
- inventory: { trackInventory, inStock, quantity }
- productType: 'physical' | 'digital'
- visible, variants, options, collections
- createdAt, updatedAt

ProductMedia: id, url, type, altText, width, height
ProductVariant: id, sku, price, compareAtPrice, weight, inventory, choices
ProductOption: name, values[]
ProductQuery: limit, offset, collectionId, includeHidden, search
ProductListResult: products[], totalCount, hasMore

### 2. Catalog Version Detection (src/services/products/version.ts)
- Cache version per instance
- GET /stores/v1/catalog/version
- Return 'V1' or 'V3'

### 3. Products Service (src/services/products/products.service.ts)
ProductsService class with methods:
- getVersion(): Promise<CatalogVersion>
- listProducts(query?): Promise<ProductListResult>
- getProduct(productId): Promise<Product>
- searchProducts(searchTerm, limit?): Promise<Product[]>
- getProductsByCollection(collectionId): Promise<Product[]>
- updateProductPrice(productId, price): Promise<Product>
- updateProductInventory(productId, quantity): Promise<void>
- normalizeProduct(raw, version): Product (private helper)

### 4. API Endpoints by Version

Catalog V3:
- List: POST /stores/v3/products/query
- Get: GET /stores/v3/products/{productId}
- Update: PATCH /stores/v3/products/{productId}

Catalog V1:
- List: POST /stores/v1/products/query
- Get: GET /stores/v1/products/{productId}
- Update: PATCH /stores/v1/products/{productId}

### 5. Collections Service (src/services/products/collections.service.ts)
Collection interface: id, name, slug, description, media, productCount, visible

CollectionsService class:
- listCollections(): Promise<Collection[]>
- getCollection(collectionId): Promise<Collection>
- getCollectionProducts(collectionId): Promise<Product[]>

### 6. Product Webhooks (update src/wix/webhooks.ts)
Add handlers:
- wix.stores.v1.product_created
- wix.stores.v1.product_updated
- wix.stores.v1.product_deleted

### 7. Dashboard API Endpoints
- GET /api/:instanceId/products
- GET /api/:instanceId/products/:productId

---

## Permissions Required
- WIX_STORES.READ_PRODUCTS
- WIX_STORES.WRITE_PRODUCTS
- WIX_STORES.READ_COLLECTIONS

---

## Acceptance Criteria
- [ ] Catalog version is detected correctly
- [ ] Products can be listed with pagination
- [ ] Single product can be retrieved by ID
- [ ] Product search works
- [ ] Products by collection works
- [ ] Both V1 and V3 APIs return unified Product type
- [ ] Product webhooks are processed
- [ ] Dashboard can display product list
