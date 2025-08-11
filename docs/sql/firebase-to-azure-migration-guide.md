# Firebase to Azure SQL Migration Guide

## Overview
This guide provides step-by-step instructions for migrating from Firebase Firestore to Azure SQL Database for the BOM Generator project.

## Schema Conversion Summary

### 1. Collections → Tables Mapping

| Firebase Collection | Azure SQL Table | Notes |
|-------------------|-----------------|-------|
| `inventory_items` | `inventory_items` | Direct mapping with computed columns |
| `bom_templates` | `bom_templates` + `bom_template_parts` | Normalized array into separate table |
| `bom_executions` | `bom_executions` + `bom_execution_missing_parts` + `bom_execution_low_stock_warnings` | Normalized nested objects |
| `audit_log` | `audit_log` | Direct mapping with JSON details |
| `configuration` | `configuration` | JSON fields for flexibility |

### 2. Data Type Conversions

| Firebase Type | Azure SQL Type | Example |
|--------------|----------------|---------|
| `string` | `NVARCHAR(n)` | `partNumber: "CT-IAS-001"` → `part_number NVARCHAR(50)` |
| `number` | `INT` or `DECIMAL(p,s)` | `currentStock: 5` → `current_stock INT` |
| `number` (currency) | `DECIMAL(10,2)` | `unitCost: 95.00` → `unit_cost DECIMAL(10,2)` |
| `timestamp` | `DATETIME2` | `createdAt` → `created_at DATETIME2` |
| `boolean` | `BIT` | `emailNotifications: true` → `BIT` |
| `array` | Separate table | `parts: [...]` → `bom_template_parts` table |
| `object` | `NVARCHAR(MAX)` (JSON) | `details: {...}` → `details NVARCHAR(MAX)` |

### 3. Key Improvements in SQL Schema

#### Referential Integrity
- Foreign key constraints between related tables
- Cascade deletes for dependent records
- Check constraints for data validation

#### Performance Optimizations
- Computed columns for calculated values (inventory_value, total_cost)
- Comprehensive indexing strategy
- Views for common queries

#### Real-time Capabilities
- Change Data Capture (CDC) for real-time monitoring
- Triggers for automatic timestamp updates
- Stored procedures for common operations

## Migration Steps

### Phase 1: Azure Setup (30 minutes)

1. **Create Azure SQL Database**
   ```bash
   # Using Azure CLI
   az sql server create --name cannasol-bom-server --resource-group your-rg --location eastus --admin-user bomadmin --admin-password YourSecurePassword123!
   
   az sql db create --resource-group your-rg --server cannasol-bom-server --name bom-generator --service-objective S2
   ```

2. **Configure Firewall**
   ```bash
   # Allow your IP
   az sql server firewall-rule create --resource-group your-rg --server cannasol-bom-server --name AllowMyIP --start-ip-address YOUR_IP --end-ip-address YOUR_IP
   
   # Allow Azure services
   az sql server firewall-rule create --resource-group your-rg --server cannasol-bom-server --name AllowAzureServices --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
   ```

3. **Run Schema Script**
   - Connect to database using Azure Data Studio or SSMS
   - Execute `azure-sql-schema.sql`

### Phase 2: Data Migration (2-3 hours)

#### Option A: Manual Export/Import (Recommended for small datasets)

1. **Export Firebase Data**
   ```javascript
   // Create export script
   const admin = require('firebase-admin');
   const fs = require('fs');
   
   // Export each collection to JSON
   async function exportCollection(collectionName) {
     const snapshot = await db.collection(collectionName).get();
     const data = [];
     snapshot.forEach(doc => {
       data.push({ id: doc.id, ...doc.data() });
     });
     fs.writeFileSync(`${collectionName}.json`, JSON.stringify(data, null, 2));
   }
   ```

2. **Transform and Import Data**
   ```sql
   -- Example: Import inventory items
   INSERT INTO inventory_items (
     part_number, component_name, current_stock, min_stock, 
     unit_cost, digikey_pn, lead_time, status, supplier, category
   )
   VALUES 
   ('CT-IAS-001', 'ACE 1630c PLC', 2, 4, 95.00, 'ABC123-ND', 7, 'Low Stock', 'DigiKey', 'Controls'),
   -- ... more data
   ```

#### Option B: Azure Data Factory (For large datasets)

1. **Create Data Factory Pipeline**
   - Source: Firebase (via REST API)
   - Sink: Azure SQL Database
   - Transform: Map Firebase fields to SQL columns

### Phase 3: Application Updates (4-6 hours)

1. **Update Connection Configuration**
   ```typescript
   // Replace Firebase config with SQL config
   const sqlConfig = {
     server: 'cannasol-bom-server.database.windows.net',
     database: 'bom-generator',
     authentication: {
       type: 'default',
       options: {
         userName: 'bomadmin',
         password: 'YourSecurePassword123!'
       }
     },
     options: {
       encrypt: true,
       enableArithAbort: true
     }
   };
   ```

2. **Create New Service Layer**
   ```typescript
   // New Azure SQL service to replace HybridFirebaseBOMService
   import { ConnectionPool, sql } from 'mssql';
   
   export class AzureSQLBOMService {
     private pool: ConnectionPool;
     
     async getInventoryItems(): Promise<InventoryItem[]> {
       const result = await this.pool.request()
         .query('SELECT * FROM inventory_items ORDER BY part_number');
       return result.recordset;
     }
     
     // ... other methods
   }
   ```

### Phase 4: Real-time Features (2-3 hours)

1. **Enable Change Data Capture**
   ```sql
   EXEC sys.sp_cdc_enable_db;
   EXEC sys.sp_cdc_enable_table @source_schema = N'dbo', @source_name = N'inventory_items', @role_name = NULL;
   ```

2. **Implement SignalR for Real-time Updates**
   ```typescript
   // Azure SignalR integration
   import { HubConnectionBuilder } from '@microsoft/signalr';
   
   const connection = new HubConnectionBuilder()
     .withUrl('/bomHub')
     .build();
   
   connection.on('InventoryUpdated', (data) => {
     // Update UI with real-time inventory changes
   });
   ```

## Testing Strategy

### 1. Data Validation
```sql
-- Verify record counts match
SELECT 'inventory_items' as table_name, COUNT(*) as record_count FROM inventory_items
UNION ALL
SELECT 'bom_templates', COUNT(*) FROM bom_templates
UNION ALL
SELECT 'bom_template_parts', COUNT(*) FROM bom_template_parts;
```

### 2. Functional Testing
- Test all CRUD operations
- Verify computed columns calculate correctly
- Test foreign key constraints
- Validate triggers fire properly

### 3. Performance Testing
```sql
-- Test query performance
SET STATISTICS IO ON;
SELECT * FROM vw_low_stock_items;
SELECT * FROM vw_bom_template_summary WHERE status = 'active';
```

## Rollback Plan

1. **Keep Firebase Active** during migration
2. **Parallel Testing** - run both systems simultaneously
3. **Feature Flags** - toggle between Firebase and SQL
4. **Data Sync** - maintain sync until confident in SQL version

## Post-Migration Optimizations

1. **Monitor Performance**
   - Use Query Store for query analysis
   - Monitor wait statistics
   - Review execution plans

2. **Security Hardening**
   - Enable Advanced Threat Protection
   - Configure audit logging
   - Implement row-level security if needed

3. **Backup Strategy**
   - Configure automated backups
   - Test restore procedures
   - Set up geo-replication if needed

## Benefits After Migration

✅ **Better Structure** - Normalized data with proper relationships  
✅ **Data Integrity** - Foreign keys and constraints prevent bad data  
✅ **Performance** - Optimized indexes and computed columns  
✅ **Familiar Syntax** - Standard SQL instead of NoSQL queries  
✅ **Azure Integration** - Native integration with Azure AI services  
✅ **Real-time Capable** - CDC and SignalR for live updates  
✅ **Better Reporting** - Standard SQL reporting tools  
✅ **Cost Effective** - Predictable pricing model  

## Next Steps

1. Review and approve this migration plan
2. Set up Azure SQL Database
3. Run schema creation script
4. Begin data migration
5. Update application code
6. Test thoroughly
7. Go live with SQL version
