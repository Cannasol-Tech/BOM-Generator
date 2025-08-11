"""
Azure SQL Database Service for BOM Generator API
"""

import asyncio
import aioodbc
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from ..models.bom_models import (
    InventoryItem,
    CreateInventoryItemRequest,
    UpdateInventoryStockRequest,
    LowStockItem,
    BOMTemplate,
    BOMTemplatePart,
    BOMTemplateSummary,
    BOMTemplateWithParts,
    CreateBOMTemplateRequest,
    BOMAvailabilityCheck,
    DatabaseResult,
    SystemSettings,
    FieldMappings
)

logger = logging.getLogger(__name__)

class AzureSQLBOMService:
    """Azure SQL Database service for BOM operations"""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.pool: Optional[aioodbc.Pool] = None
        self.is_connected = False

    async def connect(self) -> None:
        """Connect to Azure SQL Database"""
        try:
            self.pool = await aioodbc.create_pool(
                dsn=self.connection_string,
                minsize=1,
                maxsize=10,
                echo=True
            )
            self.is_connected = True
            logger.info("✅ Connected to Azure SQL Database")
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            raise

    async def disconnect(self) -> None:
        """Disconnect from database"""
        if self.pool:
            self.pool.close()
            await self.pool.wait_closed()
            self.is_connected = False
            logger.info("🔌 Disconnected from Azure SQL Database")

    async def check_connection(self) -> DatabaseResult:
        """Check database connectivity"""
        try:
            if not self.pool:
                return DatabaseResult(success=False, error="No connection pool")
            
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("SELECT 1")
                    await cursor.fetchone()
            
            return DatabaseResult(success=True, data="Connected")
        except Exception as e:
            logger.error(f"Database connection check failed: {e}")
            return DatabaseResult(success=False, error=str(e))

    # =====================================================
    # INVENTORY OPERATIONS
    # =====================================================

    async def get_inventory_items(self) -> DatabaseResult[List[InventoryItem]]:
        """Get all inventory items"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        SELECT part_number, component_name, current_stock, min_stock, 
                               unit_cost, inventory_value, digikey_pn, lead_time, 
                               status, supplier, category, last_updated, created_at
                        FROM inventory_items 
                        ORDER BY part_number
                    """)
                    rows = await cursor.fetchall()
                    
                    items = []
                    for row in rows:
                        item = InventoryItem(
                            part_number=row[0],
                            component_name=row[1],
                            current_stock=row[2],
                            min_stock=row[3],
                            unit_cost=row[4],
                            inventory_value=row[5],
                            digikey_pn=row[6],
                            lead_time=row[7],
                            status=row[8],
                            supplier=row[9],
                            category=row[10],
                            last_updated=row[11],
                            created_at=row[12]
                        )
                        items.append(item)
                    
                    return DatabaseResult(success=True, data=items)
        except Exception as e:
            logger.error(f"Error fetching inventory items: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def get_inventory_item(self, part_number: str) -> DatabaseResult[Optional[InventoryItem]]:
        """Get specific inventory item"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        SELECT part_number, component_name, current_stock, min_stock, 
                               unit_cost, inventory_value, digikey_pn, lead_time, 
                               status, supplier, category, last_updated, created_at
                        FROM inventory_items 
                        WHERE part_number = ?
                    """, (part_number,))
                    row = await cursor.fetchone()
                    
                    if row:
                        item = InventoryItem(
                            part_number=row[0],
                            component_name=row[1],
                            current_stock=row[2],
                            min_stock=row[3],
                            unit_cost=row[4],
                            inventory_value=row[5],
                            digikey_pn=row[6],
                            lead_time=row[7],
                            status=row[8],
                            supplier=row[9],
                            category=row[10],
                            last_updated=row[11],
                            created_at=row[12]
                        )
                        return DatabaseResult(success=True, data=item)
                    else:
                        return DatabaseResult(success=True, data=None)
        except Exception as e:
            logger.error(f"Error fetching inventory item {part_number}: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def create_inventory_item(self, item: CreateInventoryItemRequest) -> DatabaseResult:
        """Create new inventory item"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        INSERT INTO inventory_items 
                        (part_number, component_name, current_stock, min_stock, unit_cost, 
                         digikey_pn, lead_time, status, supplier, category)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item.part_number,
                        item.component_name,
                        item.current_stock,
                        item.min_stock,
                        item.unit_cost,
                        item.digikey_pn,
                        item.lead_time,
                        item.status,
                        item.supplier,
                        item.category
                    ))
                    await conn.commit()
                    
                    return DatabaseResult(success=True, rows_affected=cursor.rowcount)
        except Exception as e:
            logger.error(f"Error creating inventory item {item.part_number}: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def update_inventory_stock(self, request: UpdateInventoryStockRequest) -> DatabaseResult:
        """Update inventory stock level"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    # Call stored procedure if available, otherwise use simple update
                    try:
                        await cursor.execute("""
                            EXEC sp_update_inventory_stock ?, ?, ?
                        """, (request.part_number, request.new_stock, request.user_id))
                    except:
                        # Fallback to simple update
                        await cursor.execute("""
                            UPDATE inventory_items 
                            SET current_stock = ?, 
                                inventory_value = current_stock * unit_cost,
                                last_updated = GETUTCDATE()
                            WHERE part_number = ?
                        """, (request.new_stock, request.part_number))
                    
                    await conn.commit()
                    return DatabaseResult(success=True, rows_affected=cursor.rowcount)
        except Exception as e:
            logger.error(f"Error updating inventory stock for {request.part_number}: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def get_low_stock_items(self) -> DatabaseResult[List[LowStockItem]]:
        """Get items with low stock"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        SELECT part_number, component_name, current_stock, min_stock,
                               (min_stock - current_stock) as shortage, status
                        FROM inventory_items 
                        WHERE current_stock < min_stock
                        ORDER BY (min_stock - current_stock) DESC
                    """)
                    rows = await cursor.fetchall()
                    
                    items = []
                    for row in rows:
                        item = LowStockItem(
                            part_number=row[0],
                            component_name=row[1],
                            current_stock=row[2],
                            min_stock=row[3],
                            shortage=row[4],
                            status=row[5]
                        )
                        items.append(item)
                    
                    return DatabaseResult(success=True, data=items)
        except Exception as e:
            logger.error(f"Error fetching low stock items: {e}")
            return DatabaseResult(success=False, error=str(e))

    # =====================================================
    # BOM OPERATIONS
    # =====================================================

    async def get_bom_templates(self) -> DatabaseResult[List[BOMTemplateSummary]]:
        """Get all BOM templates summary"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        SELECT bt.bom_id, bt.name, bt.description, bt.version, bt.status,
                               COUNT(btp.id) as part_count,
                               SUM(btp.total_cost) as total_estimated_cost,
                               bt.updated_at
                        FROM bom_templates bt
                        LEFT JOIN bom_template_parts btp ON bt.bom_id = btp.bom_id
                        GROUP BY bt.bom_id, bt.name, bt.description, bt.version, bt.status, bt.updated_at
                        ORDER BY bt.updated_at DESC
                    """)
                    rows = await cursor.fetchall()
                    
                    templates = []
                    for row in rows:
                        template = BOMTemplateSummary(
                            bom_id=row[0],
                            name=row[1],
                            description=row[2],
                            version=row[3],
                            status=row[4],
                            part_count=row[5] or 0,
                            total_estimated_cost=row[6],
                            updated_at=row[7]
                        )
                        templates.append(template)
                    
                    return DatabaseResult(success=True, data=templates)
        except Exception as e:
            logger.error(f"Error fetching BOM templates: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def get_bom_template(self, bom_id: str) -> DatabaseResult[Optional[BOMTemplateWithParts]]:
        """Get specific BOM template with parts"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    # Get template
                    await cursor.execute("""
                        SELECT bom_id, name, description, version, status, 
                               total_estimated_cost, created_at, updated_at, created_by
                        FROM bom_templates 
                        WHERE bom_id = ?
                    """, (bom_id,))
                    template_row = await cursor.fetchone()
                    
                    if not template_row:
                        return DatabaseResult(success=True, data=None)
                    
                    # Get parts
                    await cursor.execute("""
                        SELECT id, bom_id, part_number, description, category, 
                               quantity_required, unit_cost, total_cost, supplier, 
                               digikey_pn, availability
                        FROM bom_template_parts 
                        WHERE bom_id = ?
                        ORDER BY part_number
                    """, (bom_id,))
                    parts_rows = await cursor.fetchall()
                    
                    # Build result
                    parts = []
                    for row in parts_rows:
                        part = BOMTemplatePart(
                            id=row[0],
                            bom_id=row[1],
                            part_number=row[2],
                            description=row[3],
                            category=row[4],
                            quantity_required=row[5],
                            unit_cost=row[6],
                            total_cost=row[7],
                            supplier=row[8],
                            digikey_pn=row[9],
                            availability=row[10]
                        )
                        parts.append(part)
                    
                    template = BOMTemplateWithParts(
                        bom_id=template_row[0],
                        name=template_row[1],
                        description=template_row[2],
                        version=template_row[3],
                        status=template_row[4],
                        total_estimated_cost=template_row[5],
                        created_at=template_row[6],
                        updated_at=template_row[7],
                        created_by=template_row[8],
                        parts=parts
                    )
                    
                    return DatabaseResult(success=True, data=template)
        except Exception as e:
            logger.error(f"Error fetching BOM template {bom_id}: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def create_bom_template(self, request: CreateBOMTemplateRequest) -> DatabaseResult[str]:
        """Create new BOM template"""
        try:
            bom_id = request.custom_id or f"bom-{int(datetime.now().timestamp())}"
            
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    # Start transaction
                    await conn.autocommit(False)
                    
                    try:
                        # Create template
                        await cursor.execute("""
                            INSERT INTO bom_templates (bom_id, name, description, version, status, created_by)
                            VALUES (?, ?, ?, '1.0', 'draft', 'bom-generator')
                        """, (bom_id, request.name, request.description))
                        
                        # Create parts
                        for part in request.parts:
                            await cursor.execute("""
                                INSERT INTO bom_template_parts 
                                (bom_id, part_number, description, category, quantity_required, 
                                 unit_cost, supplier, digikey_pn, availability)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                bom_id,
                                part.part_number,
                                part.description,
                                part.category,
                                part.quantity_required,
                                part.unit_cost,
                                part.supplier,
                                part.digikey_pn,
                                part.availability
                            ))
                        
                        await conn.commit()
                        return DatabaseResult(success=True, data=bom_id)
                        
                    except Exception as e:
                        await conn.rollback()
                        raise e
                    finally:
                        await conn.autocommit(True)
        except Exception as e:
            logger.error(f"Error creating BOM template: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def check_bom_availability(self, bom_id: str) -> DatabaseResult[List[BOMAvailabilityCheck]]:
        """Check availability of all parts in a BOM"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        SELECT 
                            btp.part_number,
                            btp.description,
                            btp.quantity_required,
                            ISNULL(ii.current_stock, 0) as current_stock,
                            CASE 
                                WHEN ii.current_stock >= btp.quantity_required THEN btp.quantity_required
                                WHEN ii.current_stock > 0 THEN ii.current_stock
                                ELSE 0
                            END as available_quantity,
                            CASE 
                                WHEN ii.current_stock >= btp.quantity_required THEN 0
                                ELSE btp.quantity_required - ISNULL(ii.current_stock, 0)
                            END as shortage,
                            CASE 
                                WHEN ii.current_stock >= btp.quantity_required THEN 'Available'
                                WHEN ii.current_stock > 0 THEN 'Partial'
                                ELSE 'Unavailable'
                            END as availability_status
                        FROM bom_template_parts btp
                        LEFT JOIN inventory_items ii ON btp.part_number = ii.part_number
                        WHERE btp.bom_id = ?
                        ORDER BY availability_status DESC, shortage DESC
                    """, (bom_id,))
                    rows = await cursor.fetchall()
                    
                    checks = []
                    for row in rows:
                        check = BOMAvailabilityCheck(
                            part_number=row[0],
                            description=row[1],
                            quantity_required=row[2],
                            current_stock=row[3],
                            available_quantity=row[4],
                            shortage=row[5],
                            availability_status=row[6]
                        )
                        checks.append(check)
                    
                    return DatabaseResult(success=True, data=checks)
        except Exception as e:
            logger.error(f"Error checking BOM availability for {bom_id}: {e}")
            return DatabaseResult(success=False, error=str(e))

    # =====================================================
    # CONFIGURATION OPERATIONS
    # =====================================================

    async def get_system_configuration(self) -> DatabaseResult[Optional[Dict[str, Any]]]:
        """Get system configuration"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        SELECT settings, field_mappings 
                        FROM configuration 
                        WHERE config_id = 'system_settings'
                    """)
                    row = await cursor.fetchone()
                    
                    if row:
                        config = {
                            "settings": json.loads(row[0]) if row[0] else {},
                            "fieldMappings": json.loads(row[1]) if row[1] else {}
                        }
                        return DatabaseResult(success=True, data=config)
                    else:
                        return DatabaseResult(success=True, data=None)
        except Exception as e:
            logger.error(f"Error fetching system configuration: {e}")
            return DatabaseResult(success=False, error=str(e))

    # =====================================================
    # AUDIT OPERATIONS
    # =====================================================

    async def log_action(self, action: str, entity_type: str, entity_id: str, 
                        details: Any, user_id: str = "system") -> None:
        """Log an action to audit trail"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        INSERT INTO audit_log (action, entity_type, entity_id, details, user_id, success)
                        VALUES (?, ?, ?, ?, ?, 1)
                    """, (action, entity_type, entity_id, json.dumps(details), user_id))
                    await conn.commit()
        except Exception as e:
            logger.error(f"Error logging action: {e}")
            # Don't raise - logging failures shouldn't break main operations
