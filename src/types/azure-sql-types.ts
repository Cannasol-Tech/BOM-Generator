/**
 * TypeScript interfaces for Azure SQL Database schema
 * Converted from Firebase Firestore types
 */

// =====================================================
// CORE ENTITY INTERFACES
// =====================================================

export interface InventoryItem {
  part_number: string;
  component_name: string;
  current_stock: number;
  min_stock: number;
  unit_cost: number;
  inventory_value?: number; // Computed column
  digikey_pn?: string;
  lead_time?: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock' | 'Discontinued' | 'Unknown';
  supplier?: string;
  category?: string;
  last_updated: Date;
  created_at: Date;
}

export interface BOMTemplate {
  bom_id: string;
  name: string;
  description?: string;
  version: string;
  status: 'active' | 'draft' | 'archived';
  total_estimated_cost: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface BOMTemplatePart {
  id: number;
  bom_id: string;
  part_number: string;
  description?: string;
  category?: string;
  quantity_required: number;
  unit_cost: number;
  total_cost?: number; // Computed column
  supplier?: string;
  digikey_pn?: string;
  availability: 'available' | 'low_stock' | 'out_of_stock' | 'unknown';
}

export interface BOMExecution {
  execution_id: string;
  bom_template_id: string;
  bom_template_name: string;
  executed_at: Date;
  status: 'running' | 'completed' | 'failed' | 'partial';
  
  // Results
  total_parts_required?: number;
  parts_available?: number;
  parts_missing?: number;
  total_cost?: number;
  estimated_cost?: number;
  cost_variance?: number;
  
  // Output files
  sharepoint_url?: string;
  file_name?: string;
  
  // Processing info
  processing_time?: number;
  n8n_execution_id?: string;
}

export interface BOMExecutionMissingPart {
  id: number;
  execution_id: string;
  part_number: string;
  description?: string;
  quantity_required: number;
  quantity_available: number;
  shortage: number;
}

export interface BOMExecutionLowStockWarning {
  id: number;
  execution_id: string;
  part_number: string;
  description?: string;
  current_stock: number;
  min_stock: number;
  quantity_required: number;
}

export interface AuditLog {
  id: number;
  timestamp: Date;
  action: 'bom_generated' | 'inventory_updated' | 'file_uploaded' | 'system_initialized' | 'template_created' | 'template_updated' | 'template_deleted';
  entity_type: 'bom' | 'inventory' | 'system';
  entity_id?: string;
  details?: string; // JSON string
  source?: string;
  user_id?: string;
  ip_address?: string;
  success: boolean;
  error_message?: string;
}

export interface Configuration {
  config_id: string;
  settings: string; // JSON string
  field_mappings: string; // JSON string
  last_updated: Date;
}

// =====================================================
// PARSED CONFIGURATION INTERFACES
// =====================================================

export interface SystemSettings {
  sharepointLibrary: string;
  inventoryFileFormat: string;
  bomOutputFormat: string;
  emailNotifications: boolean;
  lowStockThreshold: number;
  costVarianceThreshold: number;
  autoBackup: boolean;
  backupFrequency: string;
}

export interface FieldMappings {
  inventory: {
    partNumber: string;
    componentName: string;
    currentStock: string;
    minStock: string;
    unitCost: string;
    digikeyPN: string;
    leadTime: string;
    status: string;
  };
  bom: {
    partNumber: string;
    description: string;
    category: string;
    quantity: string;
    unitCost: string;
    supplier: string;
    digikeyPN: string;
  };
}

// =====================================================
// VIEW INTERFACES (for SQL views)
// =====================================================

export interface LowStockItem {
  part_number: string;
  component_name: string;
  current_stock: number;
  min_stock: number;
  shortage: number;
  unit_cost: number;
  supplier?: string;
  category?: string;
  status: string;
}

export interface BOMTemplateSummary {
  bom_id: string;
  name: string;
  description?: string;
  version: string;
  status: string;
  total_estimated_cost: number;
  total_parts: number;
  available_parts: number;
  missing_parts: number;
  created_at: Date;
  updated_at: Date;
}

export interface RecentExecution {
  execution_id: string;
  bom_template_name: string;
  executed_at: Date;
  status: string;
  total_parts_required?: number;
  parts_available?: number;
  parts_missing?: number;
  total_cost?: number;
  cost_variance?: number;
  processing_time?: number;
}

// =====================================================
// COMPOSITE INTERFACES (for complex operations)
// =====================================================

export interface BOMTemplateWithParts extends BOMTemplate {
  parts: BOMTemplatePart[];
}

export interface BOMExecutionWithDetails extends BOMExecution {
  missing_parts: BOMExecutionMissingPart[];
  low_stock_warnings: BOMExecutionLowStockWarning[];
}

export interface BOMAvailabilityCheck {
  part_number: string;
  description?: string;
  quantity_required: number;
  current_stock: number;
  availability_status: 'Available' | 'Partial' | 'Out of Stock';
  shortage: number;
}

// =====================================================
// API REQUEST/RESPONSE INTERFACES
// =====================================================

export interface CreateInventoryItemRequest {
  part_number: string;
  component_name: string;
  current_stock: number;
  min_stock: number;
  unit_cost: number;
  digikey_pn?: string;
  lead_time?: number;
  status: string;
  supplier?: string;
  category?: string;
}

export interface UpdateInventoryStockRequest {
  part_number: string;
  new_stock: number;
  user_id?: string;
}

export interface CreateBOMTemplateRequest {
  name: string;
  description?: string;
  parts: Omit<BOMTemplatePart, 'id' | 'bom_id' | 'total_cost'>[];
  custom_id?: string;
}

export interface BOMExecutionRequest {
  bom_template_id: string;
  user_id?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type InventoryStatus = InventoryItem['status'];
export type BOMTemplateStatus = BOMTemplate['status'];
export type BOMExecutionStatus = BOMExecution['status'];
export type AuditAction = AuditLog['action'];
export type EntityType = AuditLog['entity_type'];

// =====================================================
// DATABASE OPERATION RESULT TYPES
// =====================================================

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rowsAffected?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =====================================================
// MIGRATION HELPER TYPES
// =====================================================

// For mapping Firebase documents to SQL records
export interface FirebaseToSQLMapping {
  firebase_collection: string;
  sql_table: string;
  field_mappings: Record<string, string>;
  transformation_required: boolean;
}

// For tracking migration progress
export interface MigrationStatus {
  collection: string;
  total_documents: number;
  migrated_documents: number;
  failed_documents: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error_details?: string[];
}
