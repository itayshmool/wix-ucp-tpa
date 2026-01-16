# Phase 2.3: Inventory Service

## Context
Manage product inventory levels. Critical for preventing overselling.

## Reference Documentation
- Inventory API: https://dev.wix.com/docs/rest/business-solutions/stores/inventory

## Goal
Create an inventory service for reading and updating stock levels.

---

## Tasks

### 1. Inventory Types (src/services/types/inventory.types.ts)

InventoryItem: id, productId, variantId, sku, trackInventory, inStock, quantity, preorderEnabled, preorderLimit, lastUpdated

InventoryUpdate: productId, variantId, setQuantity?, incrementBy?, trackInventory?

BulkInventoryUpdate: items[]

InventoryQuery: productIds[], variantIds[], inStock?, trackingEnabled?, limit, offset

InventoryListResult: items[], totalCount, hasMore

LowStockItem extends InventoryItem: productName, threshold

### 2. Inventory Service (src/services/inventory/inventory.service.ts)

InventoryService class:
- getProductInventory(productId): Promise<InventoryItem[]>
- getVariantInventory(variantId): Promise<InventoryItem>
- listInventory(query?): Promise<InventoryListResult>
- updateInventory(update): Promise<InventoryItem>
- bulkUpdateInventory(updates): Promise<InventoryItem[]>
- decrementInventory(productId, quantity, variantId?): Promise<InventoryItem>
- incrementInventory(productId, quantity, variantId?): Promise<InventoryItem>
- getLowStockItems(threshold): Promise<LowStockItem[]>
- setTrackingEnabled(productId, enabled, variantId?): Promise<InventoryItem>

### 3. API Endpoints
- POST /stores/v2/inventoryItems/query
- GET /stores/v2/inventoryItems/{inventoryItemId}
- POST /stores/v2/inventoryItems/{inventoryItemId}/updateQuantity
- POST /stores/v2/inventoryItems/bulkUpdate

### 4. Inventory Webhooks
- wix.stores.v2.inventory_item_updated
- wix.stores.v2.inventory_item_quantity_updated

Handle low stock alerts when quantity drops below threshold.

### 5. Inventory Sync Utility (src/services/inventory/sync.ts)
For syncing with external systems:

ExternalInventory: sku, quantity

InventorySyncService class:
- syncFromExternal(externalItems): Promise<{ updated, failed, notFound }>
- exportInventory(): Promise<ExternalInventory[]>

### 6. Dashboard API Endpoints
- GET /api/:instanceId/inventory
- PATCH /api/:instanceId/inventory
- GET /api/:instanceId/inventory/low-stock

---

## Permissions Required
- WIX_STORES.READ_INVENTORY
- WIX_STORES.WRITE_INVENTORY

---

## Acceptance Criteria
- [ ] Inventory can be queried by product/variant
- [ ] Inventory quantity can be set absolutely
- [ ] Inventory can be incremented/decremented
- [ ] Bulk updates work correctly
- [ ] Low stock detection works
- [ ] Inventory webhooks are processed
- [ ] Dashboard shows inventory status
