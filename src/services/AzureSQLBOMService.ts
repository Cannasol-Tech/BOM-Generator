/**
 * Azure SQL Database Service for BOM Generator
 * Replaces HybridFirebaseBOMService with SQL-based operations
 */

import { ConnectionPool, sql, config as SQLConfig } from;
import {
  AuditLog,
  BOMTemplate,
  BOMExecution,
  Configuration,
  SystemSettings,
  FieldMappings,
  LowStockItem,
  InventoryItem,
  DatabaseResult,
  BOMTemplatePart,
  BOMTemplateSummary,
  BOMTemplateWithParts,  
  BOMAvailabilityCheck,
  BOMExecutionWithDetails,
  CreateBOMTemplateRequest,
  CreateInventoryItemRequest,
  UpdateInventoryStockRequest,
} from '../types/azure-sql-types';

export class AzureSQLBOMService {
  private pool: ConnectionPool;
  private isConnected: boolean = false;

  constructor(private config: SQLConfig) {
    this.pool = new ConnectionPool(config);
  }

  // =====================================================
  // CONNECTION MANAGEMENT
  // =====================================================

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.pool.connect();
      this.isConnected = true;
      console.log('✅ Connected to Azure SQL Database');
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.pool.close();
      this.isConnected = false;
      console.log('🔌 Disconnected from Azure SQL Database');
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  // =====================================================
  // INVENTORY MANAGEMENT
  // =====================================================

  async getInventoryItems(): Promise<DatabaseResult<InventoryItem[]>> {
    try {
      await this.ensureConnection();
      const result = await this.pool.request()
        .query(`
          SELECT part_number, component_name, current_stock, min_stock, 
                 unit_cost, inventory_value, digikey_pn, lead_time, 
                 status, supplier, category, last_updated, created_at
          FROM inventory_items 
          ORDER BY part_number
        `);
      
      return {
        success: true,
        data: result.recordset
      };
    } catch (error) {
      console.error('❌ Error fetching inventory items:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getInventoryItem(partNumber: string): Promise<DatabaseResult<InventoryItem | null>> {
    try {
      await this.ensureConnection();
      const result = await this.pool.request()
        .input('partNumber', sql.NVarChar(50), partNumber)
        .query(`
          SELECT part_number, component_name, current_stock, min_stock, 
                 unit_cost, inventory_value, digikey_pn, lead_time, 
                 status, supplier, category, last_updated, created_at
          FROM inventory_items 
          WHERE part_number = @partNumber
        `);
      
      return {
        success: true,
        data: result.recordset.length > 0 ? result.recordset[0] : null
      };
    } catch (error) {
      console.error(`❌ Error fetching inventory item ${partNumber}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createInventoryItem(item: CreateInventoryItemRequest): Promise<DatabaseResult<void>> {
    try {
      await this.ensureConnection();
      const result = await this.pool.request()
        .input('partNumber', sql.NVarChar(50), item.part_number)
        .input('componentName', sql.NVarChar(255), item.component_name)
        .input('currentStock', sql.Int, item.current_stock)
        .input('minStock', sql.Int, item.min_stock)
        .input('unitCost', sql.Decimal(10, 2), item.unit_cost)
        .input('digikeyPN', sql.NVarChar(100), item.digikey_pn)
        .input('leadTime', sql.Int, item.lead_time)
        .input('status', sql.NVarChar(50), item.status)
        .input('supplier', sql.NVarChar(100), item.supplier)
        .input('category', sql.NVarChar(100), item.category)
        .query(`
          INSERT INTO inventory_items 
          (part_number, component_name, current_stock, min_stock, unit_cost, 
           digikey_pn, lead_time, status, supplier, category)
          VALUES 
          (@partNumber, @componentName, @currentStock, @minStock, @unitCost, 
           @digikeyPN, @leadTime, @status, @supplier, @category)
        `);

      return {
        success: true,
        rowsAffected: result.rowsAffected[0]
      };
    } catch (error) {
      console.error(`❌ Error creating inventory item ${item.part_number}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateInventoryStock(request: UpdateInventoryStockRequest): Promise<DatabaseResult<void>> {
    try {
      await this.ensureConnection();
      const result = await this.pool.request()
        .input('partNumber', sql.NVarChar(50), request.part_number)
        .input('newStock', sql.Int, request.new_stock)
        .input('userId', sql.NVarChar(100), request.user_id || 'system')
        .execute('sp_update_inventory_stock');

      return {
        success: true,
        rowsAffected: result.rowsAffected[0]
      };
    } catch (error) {
      console.error(`❌ Error updating inventory stock for ${request.part_number}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getLowStockItems(): Promise<DatabaseResult<LowStockItem[]>> {
    try {
      await this.ensureConnection();
      const result = await this.pool.request()
        .query('SELECT * FROM vw_low_stock_items ORDER BY shortage DESC');
      
      return {
        success: true,
        data: result.recordset
      };
    } catch (error) {
      console.error('❌ Error fetching low stock items:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =====================================================
  // BOM TEMPLATE MANAGEMENT
  // =====================================================

  async getBOMTemplates(): Promise<DatabaseResult<BOMTemplateSummary[]>> {
    try {
      await this.ensureConnection();
      const result = await this.pool.request()
        .query('SELECT * FROM vw_bom_template_summary ORDER BY updated_at DESC');
      
      return {
        success: true,
        data: result.recordset
      };
    } catch (error) {
      console.error('❌ Error fetching BOM templates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getBOMTemplate(bomId: string): Promise<DatabaseResult<BOMTemplateWithParts | null>> {
    try {
      await this.ensureConnection();
      
      // Get template
      const templateResult = await this.pool.request()
        .input('bomId', sql.NVarChar(50), bomId)
        .query(`
          SELECT bom_id, name, description, version, status, 
                 total_estimated_cost, created_at, updated_at, created_by
          FROM bom_templates 
          WHERE bom_id = @bomId
        `);

      if (templateResult.recordset.length === 0) {
        return { success: true, data: null };
      }

      // Get parts
      const partsResult = await this.pool.request()
        .input('bomId', sql.NVarChar(50), bomId)
        .query(`
          SELECT id, bom_id, part_number, description, category, 
                 quantity_required, unit_cost, total_cost, supplier, 
                 digikey_pn, availability
          FROM bom_template_parts 
          WHERE bom_id = @bomId
          ORDER BY part_number
        `);

      const template: BOMTemplateWithParts = {
        ...templateResult.recordset[0],
        parts: partsResult.recordset
      };

      return {
        success: true,
        data: template
      };
    } catch (error) {
      console.error(`❌ Error fetching BOM template ${bomId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createBOMTemplate(request: CreateBOMTemplateRequest): Promise<DatabaseResult<string>> {
    try {
      await this.ensureConnection();
      const transaction = this.pool.transaction();
      await transaction.begin();

      try {
        const bomId = request.custom_id || `bom-${Date.now()}`;
        
        // Create template
        await transaction.request()
          .input('bomId', sql.NVarChar(50), bomId)
          .input('name', sql.NVarChar(255), request.name)
          .input('description', sql.NVarChar(1000), request.description)
          .query(`
            INSERT INTO bom_templates (bom_id, name, description, version, status, created_by)
            VALUES (@bomId, @name, @description, '1.0', 'draft', 'bom-generator')
          `);

        // Create parts
        for (const part of request.parts) {
          await transaction.request()
            .input('bomId', sql.NVarChar(50), bomId)
            .input('partNumber', sql.NVarChar(50), part.part_number)
            .input('description', sql.NVarChar(255), part.description)
            .input('category', sql.NVarChar(100), part.category)
            .input('quantityRequired', sql.Int, part.quantity_required)
            .input('unitCost', sql.Decimal(10, 2), part.unit_cost)
            .input('supplier', sql.NVarChar(100), part.supplier)
            .input('digikeyPN', sql.NVarChar(100), part.digikey_pn)
            .input('availability', sql.NVarChar(20), part.availability)
            .query(`
              INSERT INTO bom_template_parts 
              (bom_id, part_number, description, category, quantity_required, 
               unit_cost, supplier, digikey_pn, availability)
              VALUES 
              (@bomId, @partNumber, @description, @category, @quantityRequired, 
               @unitCost, @supplier, @digikeyPN, @availability)
            `);
        }

        await transaction.commit();
        
        return {
          success: true,
          data: bomId
        };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('❌ Error creating BOM template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkBOMAvailability(bomId: string): Promise<DatabaseResult<BOMAvailabilityCheck[]>> {
    try {
      await this.ensureConnection();
      const result = await this.pool.request()
        .input('bomId', sql.NVarChar(50), bomId)
        .execute('sp_check_bom_availability');
      
      return {
        success: true,
        data: result.recordset
      };
    } catch (error) {
      console.error(`❌ Error checking BOM availability for ${bomId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =====================================================
  // CONFIGURATION MANAGEMENT
  // =====================================================

  async getSystemConfiguration(): Promise<DatabaseResult<{ settings: SystemSettings; fieldMappings: FieldMappings } | null>> {
    try {
      await this.ensureConnection();
      const result = await this.pool.request()
        .query(`
          SELECT settings, field_mappings 
          FROM configuration 
          WHERE config_id = 'system_settings'
        `);
      
      if (result.recordset.length === 0) {
        return { success: true, data: null };
      }

      const config = result.recordset[0];
      return {
        success: true,
        data: {
          settings: JSON.parse(config.settings),
          fieldMappings: JSON.parse(config.field_mappings)
        }
      };
    } catch (error) {
      console.error('❌ Error fetching system configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =====================================================
  // AUDIT LOG
  // =====================================================

  async logAction(action: string, entityType: string, entityId: string, details: any, userId: string = 'system'): Promise<void> {
    try {
      await this.ensureConnection();
      await this.pool.request()
        .input('action', sql.NVarChar(50), action)
        .input('entityType', sql.NVarChar(20), entityType)
        .input('entityId', sql.NVarChar(50), entityId)
        .input('details', sql.NVarChar(sql.MAX), JSON.stringify(details))
        .input('userId', sql.NVarChar(100), userId)
        .query(`
          INSERT INTO audit_log (action, entity_type, entity_id, details, user_id, success)
          VALUES (@action, @entityType, @entityId, @details, @userId, 1)
        `);
    } catch (error) {
      console.error('❌ Error logging action:', error);
      // Don't throw - logging failures shouldn't break main operations
    }
  }
}
