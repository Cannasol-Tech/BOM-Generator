"""
Azure SQL Database Service for BOM Generator
Python implementation with modern practices and type safety
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional, Union, Any, Generic, TypeVar
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager
import logging

try:
    import pyodbc
    import aioodbc
    from azure.identity import DefaultAzureCredential
    from azure.keyvault.secrets import SecretClient
    from pydantic import BaseModel, Field, ConfigDict
    from pydantic.dataclasses import dataclass as pydantic_dataclass
    DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  Missing dependencies: {e}")
    print("📦 Install with: pip install pyodbc aioodbc azure-identity azure-keyvault-secrets pydantic")
    DEPENDENCIES_AVAILABLE = False
    
    # Fallback classes for type checking
    class BaseModel:
        pass
    class Field:
        def __init__(self, *args, **kwargs):
            pass
    class ConfigDict:
        pass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Type variable for generic result
T = TypeVar('T')


# =====================================================
# DATA MODELS (Using Pydantic for validation)
# =====================================================

class DatabaseResult(BaseModel, Generic[T]):
    """Generic database operation result"""
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    rows_affected: Optional[int] = None
    
    model_config = ConfigDict(arbitrary_types_allowed=True) if DEPENDENCIES_AVAILABLE else {}


class InventoryItem(BaseModel):
    """Inventory item model with validation"""
    part_number: str = Field(..., max_length=50)
    component_name: str = Field(..., max_length=255)
    current_stock: int = Field(..., ge=0)
    min_stock: int = Field(..., ge=0)
    unit_cost: float = Field(..., ge=0)
    inventory_value: Optional[float] = None
    digikey_pn: Optional[str] = Field(None, max_length=100)
    lead_time: Optional[int] = Field(None, ge=0)
    status: str = Field(..., max_length=50)
    supplier: str = Field(..., max_length=100)
    category: str = Field(..., max_length=100)
    last_updated: Optional[datetime] = None
    created_at: Optional[datetime] = None

    def calculate_inventory_value(self) -> float:
        """Calculate inventory value automatically"""
        return self.current_stock * self.unit_cost


class BOMTemplatePart(BaseModel):
    """BOM template part model"""
    id: Optional[int] = None
    bom_id: str = Field(..., max_length=50)
    part_number: str = Field(..., max_length=50)
    description: str = Field(..., max_length=255)
    category: str = Field(..., max_length=100)
    quantity_required: int = Field(..., gt=0)
    unit_cost: float = Field(..., ge=0)
    total_cost: Optional[float] = None
    supplier: str = Field(..., max_length=100)
    digikey_pn: Optional[str] = Field(None, max_length=100)
    availability: str = Field(default="unknown", max_length=20)

    def calculate_total_cost(self) -> float:
        """Calculate total cost automatically"""
        return self.quantity_required * self.unit_cost


class BOMTemplate(BaseModel):
    """BOM template model"""
    bom_id: str = Field(..., max_length=50)
    name: str = Field(..., max_length=255)
    description: str = Field(..., max_length=1000)
    version: str = Field(default="1.0", max_length=10)
    status: str = Field(default="draft", max_length=20)
    total_estimated_cost: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: str = Field(default="bom-generator", max_length=100)


class BOMTemplateWithParts(BOMTemplate):
    """BOM template with parts included"""
    parts: List[BOMTemplatePart] = Field(default_factory=list)


class CreateInventoryItemRequest(BaseModel):
    """Request model for creating inventory items"""
    part_number: str = Field(..., max_length=50)
    component_name: str = Field(..., max_length=255)
    current_stock: int = Field(..., ge=0)
    min_stock: int = Field(..., ge=0)
    unit_cost: float = Field(..., ge=0)
    digikey_pn: Optional[str] = Field(None, max_length=100)
    lead_time: Optional[int] = Field(None, ge=0)
    status: str = Field(..., max_length=50)
    supplier: str = Field(..., max_length=100)
    category: str = Field(..., max_length=100)


class CreateBOMTemplateRequest(BaseModel):
    """Request model for creating BOM templates"""
    name: str = Field(..., max_length=255)
    description: str = Field(..., max_length=1000)
    custom_id: Optional[str] = Field(None, max_length=50)
    parts: List[BOMTemplatePart] = Field(..., min_items=1)


class UpdateInventoryStockRequest(BaseModel):
    """Request model for updating inventory stock"""
    part_number: str = Field(..., max_length=50)
    new_stock: int = Field(..., ge=0)
    user_id: Optional[str] = Field("system", max_length=100)


class LowStockItem(BaseModel):
    """Low stock item model"""
    part_number: str
    component_name: str
    current_stock: int
    min_stock: int
    shortage: int
    status: str


class BOMAvailabilityCheck(BaseModel):
    """BOM availability check result"""
    part_number: str
    required_quantity: int
    available_stock: int
    shortage: int
    availability_status: str


# =====================================================
# MAIN SERVICE CLASS
# =====================================================

class AzureSQLBOMService:
    """
    Azure SQL Database Service for BOM Generator
    Modern Python implementation with async/await and proper error handling
    """
    
    def __init__(self, connection_string: str, key_vault_url: Optional[str] = None):
        """
        Initialize the service
        
        Args:
            connection_string: Azure SQL connection string
            key_vault_url: Optional Azure Key Vault URL for secrets
        """
        self.connection_string = connection_string
        self.key_vault_url = key_vault_url
        self.pool: Optional[aioodbc.Pool] = None
        self.is_connected = False
        
        # Setup credentials if Key Vault is used
        if key_vault_url:
            self.credential = DefaultAzureCredential()
            self.secret_client = SecretClient(
                vault_url=key_vault_url, 
                credential=self.credential
            )

    # =====================================================
    # CONNECTION MANAGEMENT
    # =====================================================

    async def connect(self) -> None:
        """Establish database connection pool"""
        if not self.is_connected:
            try:
                self.pool = await aioodbc.create_pool(
                    dsn=self.connection_string,
                    minsize=1,
                    maxsize=10,
                    echo=False
                )
                self.is_connected = True
                logger.info("✅ Connected to Azure SQL Database")
            except Exception as e:
                logger.error(f"❌ Failed to connect to database: {e}")
                raise

    async def disconnect(self) -> None:
        """Close database connection pool"""
        if self.is_connected and self.pool:
            self.pool.close()
            await self.pool.wait_closed()
            self.is_connected = False
            logger.info("🔌 Disconnected from Azure SQL Database")

    @asynccontextmanager
    async def get_connection(self):
        """Get database connection from pool"""
        if not self.is_connected:
            await self.connect()
        
        async with self.pool.acquire() as conn:
            yield conn

    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.disconnect()

    # =====================================================
    # INVENTORY MANAGEMENT
    # =====================================================

    async def get_inventory_items(self) -> DatabaseResult[List[InventoryItem]]:
        """Fetch all inventory items"""
        try:
            async with self.get_connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        SELECT part_number, component_name, current_stock, min_stock, 
                               unit_cost, inventory_value, digikey_pn, lead_time, 
                               status, supplier, category, last_updated, created_at
                        FROM inventory_items 
                        ORDER BY part_number
                    """)
                    
                    rows = await cursor.fetchall()
                    columns = [desc[0] for desc in cursor.description]
                    
                    items = [
                        InventoryItem(**dict(zip(columns, row)))
                        for row in rows
                    ]
                    
                    return DatabaseResult(success=True, data=items)
                    
        except Exception as e:
            logger.error(f"❌ Error fetching inventory items: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def get_inventory_item(self, part_number: str) -> DatabaseResult[Optional[InventoryItem]]:
        """Fetch single inventory item by part number"""
        try:
            async with self.get_connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        SELECT part_number, component_name, current_stock, min_stock, 
                               unit_cost, inventory_value, digikey_pn, lead_time, 
                               status, supplier, category, last_updated, created_at
                        FROM inventory_items 
                        WHERE part_number = ?
                    """, part_number)
                    
                    row = await cursor.fetchone()
                    
                    if row:
                        columns = [desc[0] for desc in cursor.description]
                        item = InventoryItem(**dict(zip(columns, row)))
                        return DatabaseResult(success=True, data=item)
                    else:
                        return DatabaseResult(success=True, data=None)
                        
        except Exception as e:
            logger.error(f"❌ Error fetching inventory item {part_number}: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def create_inventory_item(self, item: CreateInventoryItemRequest) -> DatabaseResult[None]:
        """Create new inventory item"""
        try:
            async with self.get_connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        INSERT INTO inventory_items 
                        (part_number, component_name, current_stock, min_stock, unit_cost, 
                         digikey_pn, lead_time, status, supplier, category)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item.part_number, item.component_name, item.current_stock,
                        item.min_stock, item.unit_cost, item.digikey_pn,
                        item.lead_time, item.status, item.supplier, item.category
                    ))
                    
                    await conn.commit()
                    rows_affected = cursor.rowcount
                    
                    await self.log_action(
                        action="CREATE",
                        entity_type="inventory_item",
                        entity_id=item.part_number,
                        details=item.model_dump(),
                        user_id="system"
                    )
                    
                    return DatabaseResult(success=True, rows_affected=rows_affected)
                    
        except Exception as e:
            logger.error(f"❌ Error creating inventory item {item.part_number}: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def update_inventory_stock(self, request: UpdateInventoryStockRequest) -> DatabaseResult[None]:
        """Update inventory stock using stored procedure"""
        try:
            async with self.get_connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        EXEC sp_update_inventory_stock ?, ?, ?
                    """, (request.part_number, request.new_stock, request.user_id))
                    
                    await conn.commit()
                    rows_affected = cursor.rowcount
                    
                    return DatabaseResult(success=True, rows_affected=rows_affected)
                    
        except Exception as e:
            logger.error(f"❌ Error updating inventory stock for {request.part_number}: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def get_low_stock_items(self) -> DatabaseResult[List[LowStockItem]]:
        """Get low stock items using view"""
        try:
            async with self.get_connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        SELECT part_number, component_name, current_stock, 
                               min_stock, shortage, status
                        FROM vw_low_stock_items 
                        ORDER BY shortage DESC
                    """)
                    
                    rows = await cursor.fetchall()
                    columns = [desc[0] for desc in cursor.description]
                    
                    items = [
                        LowStockItem(**dict(zip(columns, row)))
                        for row in rows
                    ]
                    
                    return DatabaseResult(success=True, data=items)
                    
        except Exception as e:
            logger.error(f"❌ Error fetching low stock items: {e}")
            return DatabaseResult(success=False, error=str(e))

    # =====================================================
    # BOM TEMPLATE MANAGEMENT
    # =====================================================

    async def get_bom_templates(self) -> DatabaseResult[List[BOMTemplate]]:
        """Get all BOM templates"""
        try:
            async with self.get_connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        SELECT bom_id, name, description, version, status,
                               total_estimated_cost, created_at, updated_at, created_by
                        FROM vw_bom_template_summary 
                        ORDER BY updated_at DESC
                    """)
                    
                    rows = await cursor.fetchall()
                    columns = [desc[0] for desc in cursor.description]
                    
                    templates = [
                        BOMTemplate(**dict(zip(columns, row)))
                        for row in rows
                    ]
                    
                    return DatabaseResult(success=True, data=templates)
                    
        except Exception as e:
            logger.error(f"❌ Error fetching BOM templates: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def get_bom_template(self, bom_id: str) -> DatabaseResult[Optional[BOMTemplateWithParts]]:
        """Get BOM template with parts"""
        try:
            async with self.get_connection() as conn:
                async with conn.cursor() as cursor:
                    # Get template
                    await cursor.execute("""
                        SELECT bom_id, name, description, version, status, 
                               total_estimated_cost, created_at, updated_at, created_by
                        FROM bom_templates 
                        WHERE bom_id = ?
                    """, bom_id)
                    
                    template_row = await cursor.fetchone()
                    if not template_row:
                        return DatabaseResult(success=True, data=None)
                    
                    template_columns = [desc[0] for desc in cursor.description]
                    template_data = dict(zip(template_columns, template_row))
                    
                    # Get parts
                    await cursor.execute("""
                        SELECT id, bom_id, part_number, description, category, 
                               quantity_required, unit_cost, total_cost, supplier, 
                               digikey_pn, availability
                        FROM bom_template_parts 
                        WHERE bom_id = ?
                        ORDER BY part_number
                    """, bom_id)
                    
                    parts_rows = await cursor.fetchall()
                    parts_columns = [desc[0] for desc in cursor.description]
                    
                    parts = [
                        BOMTemplatePart(**dict(zip(parts_columns, row)))
                        for row in parts_rows
                    ]
                    
                    template = BOMTemplateWithParts(**template_data, parts=parts)
                    
                    return DatabaseResult(success=True, data=template)
                    
        except Exception as e:
            logger.error(f"❌ Error fetching BOM template {bom_id}: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def create_bom_template(self, request: CreateBOMTemplateRequest) -> DatabaseResult[str]:
        """Create BOM template with parts in transaction"""
        try:
            async with self.get_connection() as conn:
                async with conn.cursor() as cursor:
                    # Start transaction
                    await conn.begin()
                    
                    try:
                        bom_id = request.custom_id or f"bom-{int(datetime.now().timestamp())}"
                        
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
                                bom_id, part.part_number, part.description, part.category,
                                part.quantity_required, part.unit_cost, part.supplier,
                                part.digikey_pn, part.availability
                            ))
                        
                        await conn.commit()
                        
                        await self.log_action(
                            action="CREATE",
                            entity_type="bom_template",
                            entity_id=bom_id,
                            details=request.model_dump(),
                            user_id="system"
                        )
                        
                        return DatabaseResult(success=True, data=bom_id)
                        
                    except Exception as e:
                        await conn.rollback()
                        raise e
                        
        except Exception as e:
            logger.error(f"❌ Error creating BOM template: {e}")
            return DatabaseResult(success=False, error=str(e))

    async def check_bom_availability(self, bom_id: str) -> DatabaseResult[List[BOMAvailabilityCheck]]:
        """Check BOM availability using stored procedure"""
        try:
            async with self.get_connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("EXEC sp_check_bom_availability ?", bom_id)
                    
                    rows = await cursor.fetchall()
                    columns = [desc[0] for desc in cursor.description]
                    
                    results = [
                        BOMAvailabilityCheck(**dict(zip(columns, row)))
                        for row in rows
                    ]
                    
                    return DatabaseResult(success=True, data=results)
                    
        except Exception as e:
            logger.error(f"❌ Error checking BOM availability for {bom_id}: {e}")
            return DatabaseResult(success=False, error=str(e))

    # =====================================================
    # CONFIGURATION MANAGEMENT
    # =====================================================

    async def get_system_configuration(self) -> DatabaseResult[Optional[Dict[str, Any]]]:
        """Get system configuration"""
        try:
            async with self.get_connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        SELECT settings, field_mappings 
                        FROM configuration 
                        WHERE config_id = 'system_settings'
                    """)
                    
                    row = await cursor.fetchone()
                    
                    if row:
                        settings, field_mappings = row
                        config = {
                            "settings": json.loads(settings) if settings else {},
                            "fieldMappings": json.loads(field_mappings) if field_mappings else {}
                        }
                        return DatabaseResult(success=True, data=config)
                    else:
                        return DatabaseResult(success=True, data=None)
                        
        except Exception as e:
            logger.error(f"❌ Error fetching system configuration: {e}")
            return DatabaseResult(success=False, error=str(e))

    # =====================================================
    # AUDIT LOG
    # =====================================================

    async def log_action(
        self, 
        action: str, 
        entity_type: str, 
        entity_id: str, 
        details: Any, 
        user_id: str = "system"
    ) -> None:
        """Log action to audit log"""
        try:
            async with self.get_connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("""
                        INSERT INTO audit_log (action, entity_type, entity_id, details, user_id, success)
                        VALUES (?, ?, ?, ?, ?, 1)
                    """, (action, entity_type, entity_id, json.dumps(details), user_id))
                    
                    await conn.commit()
                    
        except Exception as e:
            logger.error(f"❌ Error logging action: {e}")
            # Don't raise - logging failures shouldn't break main operations


# =====================================================
# USAGE EXAMPLE
# =====================================================

async def main():
    """Example usage of the service"""
    connection_string = "DRIVER={ODBC Driver 17 for SQL Server};SERVER=your-server.database.windows.net;DATABASE=your-db;UID=your-user;PWD=your-password"
    
    async with AzureSQLBOMService(connection_string) as service:
        # Get inventory items
        result = await service.get_inventory_items()
        if result.success:
            print(f"Found {len(result.data)} inventory items")
            for item in result.data[:3]:  # Show first 3
                print(f"  - {item.part_number}: {item.component_name} (Stock: {item.current_stock})")
        
        # Get BOM templates
        templates_result = await service.get_bom_templates()
        if templates_result.success:
            print(f"Found {len(templates_result.data)} BOM templates")


if __name__ == "__main__":
    asyncio.run(main())
