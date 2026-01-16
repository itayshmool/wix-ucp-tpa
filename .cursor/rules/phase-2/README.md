# Phase 2: Wix Store Integration

Integrate with Wix eCommerce APIs to access store data.

## Goals
- Access merchant product catalog
- Retrieve and manage orders
- Track inventory levels
- Handle catalog/order webhooks

## Guides in This Phase

### 2.1 Products & Catalog Service
- Support both Catalog V1 and V3 APIs
- List and search products
- Get product details with variants
- Access collections
- Handle product webhooks

### 2.2 Orders Service
- List orders with filters
- Get order details
- Create fulfillments
- Update tracking information
- Handle order webhooks (created, paid, fulfilled)

### 2.3 Inventory Service
- Query inventory by product/variant
- Update inventory quantities
- Bulk inventory operations
- Low stock alerts
- Handle inventory webhooks

## Prerequisites
- Phase 1 completed (OAuth working)
- Wix Stores API permissions configured

## Order of Implementation
2.1 → 2.2 → 2.3

## Required Wix Permissions
- `WIX_STORES.READ_PRODUCTS`
- `WIX_STORES.READ_COLLECTIONS`
- `WIX_STORES.READ_ORDERS`
- `WIX_STORES.WRITE_ORDERS`
- `WIX_STORES.READ_INVENTORY`
- `WIX_STORES.WRITE_INVENTORY`

## Key Deliverables
- ✅ Products can be listed and searched
- ✅ Orders can be retrieved and managed
- ✅ Inventory can be tracked and updated
- ✅ Webhooks update data in real-time
- ✅ Dashboard displays store data
