"""
Pydantic models for BOM API
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal

# =====================================================
# BASE MODELS
# =====================================================

class DatabaseResult(BaseModel):
    """Standard database operation result"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    rows_affected: Optional[int] = None

# =====================================================
# INVENTORY MODELS
# =====================================================

class InventoryItem(BaseModel):
    """Inventory item model"""
    part_number: str = Field(..., max_length=50)
    component_name: str = Field(..., max_length=255)
    current_stock: int = Field(..., ge=0)
    min_stock: int = Field(..., ge=0)
    unit_cost: Decimal = Field(..., ge=0, decimal_places=2)
    inventory_value: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    digikey_pn: Optional[str] = Field(None, max_length=100)
    lead_time: Optional[int] = Field(None, ge=0)
    status: str = Field(..., max_length=50)
    supplier: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    last_updated: Optional[datetime] = None
    created_at: Optional[datetime] = None

class CreateInventoryItemRequest(BaseModel):
    """Request model for creating inventory item"""
    part_number: str = Field(..., max_length=50)
    component_name: str = Field(..., max_length=255)
    current_stock: int = Field(..., ge=0)
    min_stock: int = Field(..., ge=0)
    unit_cost: Decimal = Field(..., ge=0, decimal_places=2)
    digikey_pn: Optional[str] = Field(None, max_length=100)
    lead_time: Optional[int] = Field(None, ge=0)
    status: str = Field(default="In Stock", max_length=50)
    supplier: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)

class UpdateInventoryStockRequest(BaseModel):
    """Request model for updating inventory stock"""
    part_number: Optional[str] = None  # Set by API
    new_stock: int = Field(..., ge=0)
    user_id: Optional[str] = None  # Set by API

class LowStockItem(BaseModel):
    """Low stock item model"""
    part_number: str
    component_name: str
    current_stock: int
    min_stock: int
    shortage: int
    status: str

# =====================================================
# BOM MODELS
# =====================================================

class BOMTemplatePart(BaseModel):
    """BOM template part model"""
    id: Optional[int] = None
    bom_id: str
    part_number: str = Field(..., max_length=50)
    description: str = Field(..., max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    quantity_required: int = Field(..., gt=0)
    unit_cost: Decimal = Field(..., ge=0, decimal_places=2)
    total_cost: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    supplier: Optional[str] = Field(None, max_length=100)
    digikey_pn: Optional[str] = Field(None, max_length=100)
    availability: Optional[str] = Field(None, max_length=20)

class BOMTemplate(BaseModel):
    """BOM template model"""
    bom_id: str = Field(..., max_length=50)
    name: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    version: str = Field(default="1.0", max_length=20)
    status: str = Field(default="draft", max_length=20)
    total_estimated_cost: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = Field(None, max_length=100)

class BOMTemplateSummary(BaseModel):
    """BOM template summary model"""
    bom_id: str
    name: str
    description: Optional[str] = None
    version: str
    status: str
    part_count: int
    total_estimated_cost: Optional[Decimal] = None
    updated_at: Optional[datetime] = None

class BOMTemplateWithParts(BOMTemplate):
    """BOM template with parts included"""
    parts: List[BOMTemplatePart] = []

class CreateBOMTemplateRequest(BaseModel):
    """Request model for creating BOM template"""
    name: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    custom_id: Optional[str] = Field(None, max_length=50)
    parts: List[BOMTemplatePart] = []

class BOMAvailabilityCheck(BaseModel):
    """BOM availability check result"""
    part_number: str
    description: str
    quantity_required: int
    current_stock: int
    available_quantity: int
    shortage: int
    availability_status: str

# =====================================================
# CONFIGURATION MODELS
# =====================================================

class SystemSettings(BaseModel):
    """System settings model"""
    sharepoint_library: Optional[str] = None
    inventory_file_format: str = Field(default="csv")
    bom_output_format: str = Field(default="xlsx")
    email_notifications: bool = Field(default=True)
    low_stock_threshold: float = Field(default=0.5, ge=0, le=1)
    cost_variance_threshold: float = Field(default=0.1, ge=0, le=1)
    auto_backup: bool = Field(default=True)
    backup_frequency: str = Field(default="daily")

class FieldMappings(BaseModel):
    """Field mappings model"""
    inventory: Dict[str, str] = {}
    bom: Dict[str, str] = {}

class Configuration(BaseModel):
    """Full configuration model"""
    config_id: str
    settings: SystemSettings
    field_mappings: FieldMappings
    last_updated: Optional[datetime] = None

# =====================================================
# AUDIT MODELS
# =====================================================

class AuditLog(BaseModel):
    """Audit log model"""
    id: Optional[int] = None
    action: str = Field(..., max_length=50)
    entity_type: str = Field(..., max_length=20)
    entity_id: str = Field(..., max_length=50)
    details: Optional[Dict[str, Any]] = None
    user_id: str = Field(..., max_length=100)
    success: bool = Field(default=True)
    timestamp: Optional[datetime] = None

# =====================================================
# EXECUTION MODELS
# =====================================================

class BOMExecution(BaseModel):
    """BOM execution model"""
    id: Optional[int] = None
    bom_id: str
    execution_type: str = Field(..., max_length=20)
    status: str = Field(..., max_length=20)
    executed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_parts: int = Field(..., ge=0)
    available_parts: int = Field(..., ge=0)
    unavailable_parts: int = Field(..., ge=0)
    total_cost: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    processing_time: Optional[float] = Field(None, ge=0)
    n8n_execution_id: Optional[str] = Field(None, max_length=100)

class BOMExecutionWithDetails(BOMExecution):
    """BOM execution with detailed results"""
    low_stock_warnings: List[LowStockItem] = []
    output_files: Optional[Dict[str, str]] = None
