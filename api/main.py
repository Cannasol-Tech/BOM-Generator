"""
BOM Generator API
Secure REST API for managing Bill of Materials and Inventory
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import os

from .database.azure_sql_service import AzureSQLBOMService
from .models.bom_models import (
    InventoryItem, 
    BOMTemplate, 
    CreateInventoryItemRequest,
    CreateBOMTemplateRequest,
    UpdateInventoryStockRequest,
    BOMAvailabilityCheck,
    DatabaseResult
)
from .auth.auth_service import AuthService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="BOM Generator API",
    description="Secure REST API for managing Bill of Materials and Inventory",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
auth_service = AuthService()

# Database service
db_service: Optional[AzureSQLBOMService] = None

@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    global db_service
    try:
        db_service = AzureSQLBOMService()
        await db_service.connect()
        logger.info("✅ Database connected successfully")
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up database connection on shutdown"""
    if db_service:
        await db_service.disconnect()
        logger.info("🔌 Database disconnected")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate JWT token and return user info"""
    try:
        user = await auth_service.validate_token(credentials.credentials)
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_db() -> AzureSQLBOMService:
    """Get database service instance"""
    if not db_service:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database service not available"
        )
    return db_service

# =====================================================
# HEALTH CHECK
# =====================================================

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        db = get_db()
        # Simple database connectivity check
        result = await db.check_connection()
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected" if result.success else "disconnected",
            "version": "1.0.0"
        }
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
        )

# =====================================================
# INVENTORY ENDPOINTS
# =====================================================

@app.get("/api/inventory", response_model=List[InventoryItem])
async def get_inventory_items(
    current_user: dict = Depends(get_current_user),
    db: AzureSQLBOMService = Depends(get_db)
):
    """Get all inventory items"""
    try:
        result = await db.get_inventory_items()
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.error
            )
        return result.data
    except Exception as e:
        logger.error(f"Error fetching inventory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch inventory items"
        )

@app.get("/api/inventory/{part_number}", response_model=InventoryItem)
async def get_inventory_item(
    part_number: str,
    current_user: dict = Depends(get_current_user),
    db: AzureSQLBOMService = Depends(get_db)
):
    """Get specific inventory item by part number"""
    try:
        result = await db.get_inventory_item(part_number)
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.error
            )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory item {part_number} not found"
            )
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching inventory item {part_number}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch inventory item"
        )

@app.post("/api/inventory", response_model=dict)
async def create_inventory_item(
    item: CreateInventoryItemRequest,
    current_user: dict = Depends(get_current_user),
    db: AzureSQLBOMService = Depends(get_db)
):
    """Create new inventory item"""
    try:
        result = await db.create_inventory_item(item)
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error
            )
        
        # Log the action
        await db.log_action(
            action="CREATE",
            entity_type="inventory",
            entity_id=item.part_number,
            details=item.dict(),
            user_id=current_user.get("user_id", "unknown")
        )
        
        return {
            "message": "Inventory item created successfully",
            "part_number": item.part_number,
            "rows_affected": result.rows_affected
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating inventory item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create inventory item"
        )

@app.put("/api/inventory/{part_number}/stock", response_model=dict)
async def update_inventory_stock(
    part_number: str,
    request: UpdateInventoryStockRequest,
    current_user: dict = Depends(get_current_user),
    db: AzureSQLBOMService = Depends(get_db)
):
    """Update inventory stock level"""
    try:
        # Ensure part number matches
        request.part_number = part_number
        request.user_id = current_user.get("user_id", "unknown")
        
        result = await db.update_inventory_stock(request)
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error
            )
        
        return {
            "message": "Inventory stock updated successfully",
            "part_number": part_number,
            "new_stock": request.new_stock,
            "rows_affected": result.rows_affected
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating inventory stock for {part_number}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update inventory stock"
        )

@app.get("/api/inventory/low-stock", response_model=List[dict])
async def get_low_stock_items(
    current_user: dict = Depends(get_current_user),
    db: AzureSQLBOMService = Depends(get_db)
):
    """Get items with low stock levels"""
    try:
        result = await db.get_low_stock_items()
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.error
            )
        return result.data
    except Exception as e:
        logger.error(f"Error fetching low stock items: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch low stock items"
        )

# =====================================================
# BOM ENDPOINTS
# =====================================================

@app.get("/api/bom/templates", response_model=List[dict])
async def get_bom_templates(
    current_user: dict = Depends(get_current_user),
    db: AzureSQLBOMService = Depends(get_db)
):
    """Get all BOM templates"""
    try:
        result = await db.get_bom_templates()
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.error
            )
        return result.data
    except Exception as e:
        logger.error(f"Error fetching BOM templates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch BOM templates"
        )

@app.get("/api/bom/templates/{bom_id}", response_model=dict)
async def get_bom_template(
    bom_id: str,
    current_user: dict = Depends(get_current_user),
    db: AzureSQLBOMService = Depends(get_db)
):
    """Get specific BOM template with parts"""
    try:
        result = await db.get_bom_template(bom_id)
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.error
            )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"BOM template {bom_id} not found"
            )
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching BOM template {bom_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch BOM template"
        )

@app.post("/api/bom/templates", response_model=dict)
async def create_bom_template(
    request: CreateBOMTemplateRequest,
    current_user: dict = Depends(get_current_user),
    db: AzureSQLBOMService = Depends(get_db)
):
    """Create new BOM template"""
    try:
        result = await db.create_bom_template(request)
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error
            )
        
        # Log the action
        await db.log_action(
            action="CREATE",
            entity_type="bom_template",
            entity_id=result.data,
            details=request.dict(),
            user_id=current_user.get("user_id", "unknown")
        )
        
        return {
            "message": "BOM template created successfully",
            "bom_id": result.data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating BOM template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create BOM template"
        )

@app.get("/api/bom/templates/{bom_id}/availability", response_model=List[BOMAvailabilityCheck])
async def check_bom_availability(
    bom_id: str,
    current_user: dict = Depends(get_current_user),
    db: AzureSQLBOMService = Depends(get_db)
):
    """Check availability of all parts in a BOM"""
    try:
        result = await db.check_bom_availability(bom_id)
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.error
            )
        return result.data
    except Exception as e:
        logger.error(f"Error checking BOM availability for {bom_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check BOM availability"
        )

# =====================================================
# CONFIGURATION ENDPOINTS
# =====================================================

@app.get("/api/config/system", response_model=dict)
async def get_system_configuration(
    current_user: dict = Depends(get_current_user),
    db: AzureSQLBOMService = Depends(get_db)
):
    """Get system configuration"""
    try:
        result = await db.get_system_configuration()
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.error
            )
        return result.data or {}
    except Exception as e:
        logger.error(f"Error fetching system configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch system configuration"
        )

# =====================================================
# ERROR HANDLERS
# =====================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
