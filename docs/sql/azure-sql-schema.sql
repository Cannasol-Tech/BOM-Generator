-- Azure SQL Database Schema for BOM Generator
-- Converted from Firebase Firestore schema
-- Optimized for Azure SQL Database with real-time capabilities

-- Enable Change Data Capture for real-time updates
-- Run after database creation: EXEC sys.sp_cdc_enable_db;

-- =====================================================
-- 1. INVENTORY ITEMS TABLE
-- =====================================================
CREATE TABLE inventory_items (
    part_number NVARCHAR(50) PRIMARY KEY,
    component_name NVARCHAR(255) NOT NULL,
    current_stock INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    inventory_value AS (current_stock * unit_cost) PERSISTED, -- Computed column
    digikey_pn NVARCHAR(100),
    lead_time INT, -- Lead time in days
    status NVARCHAR(50) NOT NULL DEFAULT 'Unknown',
    supplier NVARCHAR(100),
    category NVARCHAR(100),
    last_updated DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Constraints
    CONSTRAINT CK_inventory_current_stock CHECK (current_stock >= 0),
    CONSTRAINT CK_inventory_min_stock CHECK (min_stock >= 0),
    CONSTRAINT CK_inventory_unit_cost CHECK (unit_cost >= 0),
    CONSTRAINT CK_inventory_lead_time CHECK (lead_time >= 0),
    CONSTRAINT CK_inventory_status CHECK (status IN ('Available', 'Low Stock', 'Out of Stock', 'Discontinued', 'Unknown'))
);

-- =====================================================
-- 2. BOM TEMPLATES TABLE
-- =====================================================
CREATE TABLE bom_templates (
    bom_id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(1000),
    version NVARCHAR(20) NOT NULL DEFAULT '1.0',
    status NVARCHAR(20) NOT NULL DEFAULT 'draft',
    total_estimated_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_by NVARCHAR(100) NOT NULL DEFAULT 'system',
    
    -- Constraints
    CONSTRAINT CK_bom_status CHECK (status IN ('active', 'draft', 'archived')),
    CONSTRAINT CK_bom_total_cost CHECK (total_estimated_cost >= 0)
);

-- =====================================================
-- 3. BOM TEMPLATE PARTS TABLE (Normalized from Firebase array)
-- =====================================================
CREATE TABLE bom_template_parts (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    bom_id NVARCHAR(50) NOT NULL,
    part_number NVARCHAR(50) NOT NULL,
    description NVARCHAR(255),
    category NVARCHAR(100),
    quantity_required INT NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_cost AS (quantity_required * unit_cost) PERSISTED, -- Computed column
    supplier NVARCHAR(100),
    digikey_pn NVARCHAR(100),
    availability NVARCHAR(20) DEFAULT 'unknown',
    
    -- Foreign Keys
    CONSTRAINT FK_bom_parts_template FOREIGN KEY (bom_id) REFERENCES bom_templates(bom_id) ON DELETE CASCADE,
    CONSTRAINT FK_bom_parts_inventory FOREIGN KEY (part_number) REFERENCES inventory_items(part_number),
    
    -- Constraints
    CONSTRAINT CK_bom_parts_quantity CHECK (quantity_required > 0),
    CONSTRAINT CK_bom_parts_unit_cost CHECK (unit_cost >= 0),
    CONSTRAINT CK_bom_parts_availability CHECK (availability IN ('available', 'low_stock', 'out_of_stock', 'unknown'))
);

-- =====================================================
-- 4. BOM EXECUTIONS TABLE
-- =====================================================
CREATE TABLE bom_executions (
    execution_id NVARCHAR(50) PRIMARY KEY,
    bom_template_id NVARCHAR(50) NOT NULL,
    bom_template_name NVARCHAR(255) NOT NULL,
    executed_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    status NVARCHAR(20) NOT NULL DEFAULT 'running',
    
    -- Results (flattened from Firebase nested object)
    total_parts_required INT,
    parts_available INT,
    parts_missing INT,
    total_cost DECIMAL(12,2),
    estimated_cost DECIMAL(12,2),
    cost_variance DECIMAL(12,2),
    
    -- Output files
    sharepoint_url NVARCHAR(500),
    file_name NVARCHAR(255),
    
    -- Processing info
    processing_time DECIMAL(8,2), -- seconds
    n8n_execution_id NVARCHAR(100),
    
    -- Foreign Key
    CONSTRAINT FK_bom_exec_template FOREIGN KEY (bom_template_id) REFERENCES bom_templates(bom_id),
    
    -- Constraints
    CONSTRAINT CK_bom_exec_status CHECK (status IN ('running', 'completed', 'failed', 'partial')),
    CONSTRAINT CK_bom_exec_parts_required CHECK (total_parts_required >= 0),
    CONSTRAINT CK_bom_exec_parts_available CHECK (parts_available >= 0),
    CONSTRAINT CK_bom_exec_parts_missing CHECK (parts_missing >= 0),
    CONSTRAINT CK_bom_exec_processing_time CHECK (processing_time >= 0)
);

-- =====================================================
-- 5. BOM EXECUTION MISSING PARTS TABLE
-- =====================================================
CREATE TABLE bom_execution_missing_parts (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    execution_id NVARCHAR(50) NOT NULL,
    part_number NVARCHAR(50) NOT NULL,
    description NVARCHAR(255),
    quantity_required INT NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    shortage INT NOT NULL,
    
    -- Foreign Keys
    CONSTRAINT FK_missing_parts_execution FOREIGN KEY (execution_id) REFERENCES bom_executions(execution_id) ON DELETE CASCADE,
    CONSTRAINT FK_missing_parts_inventory FOREIGN KEY (part_number) REFERENCES inventory_items(part_number),
    
    -- Constraints
    CONSTRAINT CK_missing_parts_qty_required CHECK (quantity_required > 0),
    CONSTRAINT CK_missing_parts_qty_available CHECK (quantity_available >= 0),
    CONSTRAINT CK_missing_parts_shortage CHECK (shortage > 0)
);

-- =====================================================
-- 6. BOM EXECUTION LOW STOCK WARNINGS TABLE
-- =====================================================
CREATE TABLE bom_execution_low_stock_warnings (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    execution_id NVARCHAR(50) NOT NULL,
    part_number NVARCHAR(50) NOT NULL,
    description NVARCHAR(255),
    current_stock INT NOT NULL,
    min_stock INT NOT NULL,
    quantity_required INT NOT NULL,
    
    -- Foreign Keys
    CONSTRAINT FK_low_stock_execution FOREIGN KEY (execution_id) REFERENCES bom_executions(execution_id) ON DELETE CASCADE,
    CONSTRAINT FK_low_stock_inventory FOREIGN KEY (part_number) REFERENCES inventory_items(part_number),
    
    -- Constraints
    CONSTRAINT CK_low_stock_current CHECK (current_stock >= 0),
    CONSTRAINT CK_low_stock_min CHECK (min_stock >= 0),
    CONSTRAINT CK_low_stock_required CHECK (quantity_required > 0)
);

-- =====================================================
-- 7. AUDIT LOG TABLE
-- =====================================================
CREATE TABLE audit_log (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    action NVARCHAR(50) NOT NULL,
    entity_type NVARCHAR(20) NOT NULL,
    entity_id NVARCHAR(50),
    
    -- Details (JSON for flexibility like Firebase)
    details NVARCHAR(MAX), -- JSON string for complex data
    
    source NVARCHAR(100),
    user_id NVARCHAR(100),
    ip_address NVARCHAR(45), -- IPv6 compatible
    success BIT NOT NULL DEFAULT 1,
    error_message NVARCHAR(1000),
    
    -- Constraints
    CONSTRAINT CK_audit_entity_type CHECK (entity_type IN ('bom', 'inventory', 'system')),
    CONSTRAINT CK_audit_action CHECK (action IN ('bom_generated', 'inventory_updated', 'file_uploaded', 'system_initialized', 'template_created', 'template_updated', 'template_deleted'))
);

-- =====================================================
-- 8. CONFIGURATION TABLE
-- =====================================================
CREATE TABLE configuration (
    config_id NVARCHAR(50) PRIMARY KEY,

    -- Settings (JSON for flexibility)
    settings NVARCHAR(MAX), -- JSON string
    field_mappings NVARCHAR(MAX), -- JSON string

    last_updated DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    -- Constraints
    CONSTRAINT CK_config_settings_json CHECK (ISJSON(settings) = 1),
    CONSTRAINT CK_config_mappings_json CHECK (ISJSON(field_mappings) = 1)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Inventory Items Indexes
CREATE INDEX IX_inventory_status_updated ON inventory_items (status, last_updated);
CREATE INDEX IX_inventory_category_stock ON inventory_items (category, current_stock);
CREATE INDEX IX_inventory_supplier ON inventory_items (supplier);
CREATE INDEX IX_inventory_digikey ON inventory_items (digikey_pn);

-- BOM Templates Indexes
CREATE INDEX IX_bom_templates_status ON bom_templates (status);
CREATE INDEX IX_bom_templates_created ON bom_templates (created_at);
CREATE INDEX IX_bom_templates_updated ON bom_templates (updated_at);

-- BOM Template Parts Indexes
CREATE INDEX IX_bom_parts_bom_id ON bom_template_parts (bom_id);
CREATE INDEX IX_bom_parts_part_number ON bom_template_parts (part_number);
CREATE INDEX IX_bom_parts_category ON bom_template_parts (category);

-- BOM Executions Indexes
CREATE INDEX IX_bom_exec_status_executed ON bom_executions (status, executed_at);
CREATE INDEX IX_bom_exec_template ON bom_executions (bom_template_id);
CREATE INDEX IX_bom_exec_executed_at ON bom_executions (executed_at);

-- Audit Log Indexes
CREATE INDEX IX_audit_action_timestamp ON audit_log (action, timestamp);
CREATE INDEX IX_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IX_audit_timestamp ON audit_log (timestamp);
CREATE INDEX IX_audit_user ON audit_log (user_id);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update inventory_items.last_updated on changes
CREATE TRIGGER TR_inventory_items_update
ON inventory_items
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE inventory_items
    SET last_updated = GETUTCDATE()
    FROM inventory_items i
    INNER JOIN inserted ins ON i.part_number = ins.part_number;
END;

-- Update bom_templates.updated_at on changes
CREATE TRIGGER TR_bom_templates_update
ON bom_templates
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE bom_templates
    SET updated_at = GETUTCDATE()
    FROM bom_templates b
    INNER JOIN inserted ins ON b.bom_id = ins.bom_id;
END;

-- Update bom_templates.total_estimated_cost when parts change
CREATE TRIGGER TR_bom_parts_cost_update
ON bom_template_parts
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Update for inserted/updated records
    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        UPDATE bom_templates
        SET total_estimated_cost = (
            SELECT ISNULL(SUM(quantity_required * unit_cost), 0)
            FROM bom_template_parts
            WHERE bom_id = bom_templates.bom_id
        ),
        updated_at = GETUTCDATE()
        WHERE bom_id IN (SELECT DISTINCT bom_id FROM inserted);
    END

    -- Update for deleted records
    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        UPDATE bom_templates
        SET total_estimated_cost = (
            SELECT ISNULL(SUM(quantity_required * unit_cost), 0)
            FROM bom_template_parts
            WHERE bom_id = bom_templates.bom_id
        ),
        updated_at = GETUTCDATE()
        WHERE bom_id IN (SELECT DISTINCT bom_id FROM deleted);
    END
END;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Low stock items view
CREATE VIEW vw_low_stock_items AS
SELECT
    part_number,
    component_name,
    current_stock,
    min_stock,
    (min_stock - current_stock) AS shortage,
    unit_cost,
    supplier,
    category,
    status
FROM inventory_items
WHERE current_stock < min_stock;

-- BOM template summary view
CREATE VIEW vw_bom_template_summary AS
SELECT
    bt.bom_id,
    bt.name,
    bt.description,
    bt.version,
    bt.status,
    bt.total_estimated_cost,
    COUNT(btp.id) AS total_parts,
    SUM(CASE WHEN ii.current_stock >= btp.quantity_required THEN 1 ELSE 0 END) AS available_parts,
    SUM(CASE WHEN ii.current_stock < btp.quantity_required THEN 1 ELSE 0 END) AS missing_parts,
    bt.created_at,
    bt.updated_at
FROM bom_templates bt
LEFT JOIN bom_template_parts btp ON bt.bom_id = btp.bom_id
LEFT JOIN inventory_items ii ON btp.part_number = ii.part_number
GROUP BY bt.bom_id, bt.name, bt.description, bt.version, bt.status,
         bt.total_estimated_cost, bt.created_at, bt.updated_at;

-- Recent executions view
CREATE VIEW vw_recent_executions AS
SELECT TOP 100
    execution_id,
    bom_template_name,
    executed_at,
    status,
    total_parts_required,
    parts_available,
    parts_missing,
    total_cost,
    cost_variance,
    processing_time
FROM bom_executions
ORDER BY executed_at DESC;

-- =====================================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- =====================================================

-- Procedure to check BOM availability
CREATE PROCEDURE sp_check_bom_availability
    @bom_id NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        btp.part_number,
        btp.description,
        btp.quantity_required,
        ISNULL(ii.current_stock, 0) AS current_stock,
        CASE
            WHEN ii.current_stock >= btp.quantity_required THEN 'Available'
            WHEN ii.current_stock > 0 THEN 'Partial'
            ELSE 'Out of Stock'
        END AS availability_status,
        CASE
            WHEN ii.current_stock < btp.quantity_required
            THEN btp.quantity_required - ISNULL(ii.current_stock, 0)
            ELSE 0
        END AS shortage
    FROM bom_template_parts btp
    LEFT JOIN inventory_items ii ON btp.part_number = ii.part_number
    WHERE btp.bom_id = @bom_id
    ORDER BY btp.part_number;
END;

-- Procedure to update inventory stock
CREATE PROCEDURE sp_update_inventory_stock
    @part_number NVARCHAR(50),
    @new_stock INT,
    @user_id NVARCHAR(100) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    DECLARE @old_stock INT;
    SELECT @old_stock = current_stock FROM inventory_items WHERE part_number = @part_number;

    UPDATE inventory_items
    SET current_stock = @new_stock,
        last_updated = GETUTCDATE()
    WHERE part_number = @part_number;

    -- Log the change
    INSERT INTO audit_log (action, entity_type, entity_id, details, user_id, success)
    VALUES (
        'inventory_updated',
        'inventory',
        @part_number,
        JSON_OBJECT('old_stock', @old_stock, 'new_stock', @new_stock),
        @user_id,
        1
    );

    COMMIT TRANSACTION;
END;

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample configuration
INSERT INTO configuration (config_id, settings, field_mappings, last_updated)
VALUES (
    'system_settings',
    JSON_OBJECT(
        'sharepointLibrary', 'BOM_Files',
        'inventoryFileFormat', 'csv',
        'bomOutputFormat', 'xlsx',
        'emailNotifications', CAST(1 AS BIT),
        'lowStockThreshold', 0.5,
        'costVarianceThreshold', 0.1,
        'autoBackup', CAST(1 AS BIT),
        'backupFrequency', 'daily'
    ),
    JSON_OBJECT(
        'inventory', JSON_OBJECT(
            'partNumber', 'Inventory ID',
            'componentName', 'Component Name',
            'currentStock', 'Current Stock',
            'minStock', 'Min.',
            'unitCost', 'Unit Cost',
            'digikeyPN', 'Digikey #',
            'leadTime', 'Lead Time',
            'status', 'Status'
        ),
        'bom', JSON_OBJECT(
            'partNumber', 'Part Number',
            'description', 'Description',
            'category', 'Category',
            'quantity', 'Quantity',
            'unitCost', 'Unit Cost',
            'supplier', 'Supplier',
            'digikeyPN', 'DigiKey PN'
        )
    ),
    GETUTCDATE()
);

-- =====================================================
-- ENABLE CHANGE DATA CAPTURE FOR REAL-TIME FEATURES
-- =====================================================

-- Enable CDC on key tables for real-time monitoring
-- Run these after database is created and CDC is enabled:

/*
-- Enable CDC on inventory_items for real-time stock monitoring
EXEC sys.sp_cdc_enable_table
    @source_schema = N'dbo',
    @source_name = N'inventory_items',
    @role_name = NULL;

-- Enable CDC on bom_executions for real-time execution monitoring
EXEC sys.sp_cdc_enable_table
    @source_schema = N'dbo',
    @source_name = N'bom_executions',
    @role_name = NULL;

-- Enable CDC on audit_log for real-time activity monitoring
EXEC sys.sp_cdc_enable_table
    @source_schema = N'dbo',
    @source_name = N'audit_log',
    @role_name = NULL;
*/

-- =====================================================
-- NOTES FOR AZURE DEPLOYMENT
-- =====================================================

/*
DEPLOYMENT NOTES:

1. Create Azure SQL Database:
   - Choose appropriate service tier (Standard S2 recommended for development)
   - Enable Advanced Data Security if needed

2. Run this script in order:
   - Tables first
   - Indexes
   - Triggers
   - Views
   - Stored Procedures
   - Sample data

3. Enable Change Data Capture:
   EXEC sys.sp_cdc_enable_db;
   Then run the CDC commands above

4. Configure firewall rules for your application

5. Update connection strings in your application

6. For real-time features, consider:
   - Azure SignalR Service for web real-time updates
   - Azure Service Bus for message queuing
   - Azure Functions for CDC processing

7. Performance considerations:
   - Monitor query performance with Query Store
   - Consider columnstore indexes for large datasets
   - Use Azure SQL Database Advisor recommendations
*/
