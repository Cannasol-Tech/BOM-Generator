"""
Azure Static Web Apps API Functions for BOM Generator
Free tier implementation - no server costs!
"""

import json
import logging
import os
import pyodbc
from typing import Dict, Any, Optional
import azure.functions as func

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database connection string from environment
CONNECTION_STRING = os.environ.get('AZURE_SQL_CONNECTION_STRING')

def get_db_connection():
    """Get database connection"""
    if not CONNECTION_STRING:
        raise ValueError("Database connection string not configured")
    return pyodbc.connect(CONNECTION_STRING)

def create_response(data: Any = None, error: str = None, status_code: int = 200) -> func.HttpResponse:
    """Create standardized HTTP response"""
    response_body = {
        "success": error is None,
        "data": data,
        "error": error,
        "timestamp": func.datetime.now().isoformat()
    }
    
    return func.HttpResponse(
        json.dumps(response_body),
        status_code=status_code,
        headers={"Content-Type": "application/json"},
        charset='utf-8'
    )

# =====================================================
# INVENTORY ENDPOINTS
# =====================================================

def main_inventory_list(req: func.HttpRequest) -> func.HttpResponse:
    """GET /api/inventory - Get all inventory items"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT part_number, component_name, current_stock, min_stock, 
                   unit_cost, inventory_value, digikey_pn, lead_time, 
                   status, supplier, category, last_updated, created_at
            FROM inventory_items 
            ORDER BY part_number
        """)
        
        items = []
        for row in cursor.fetchall():
            item = {
                "part_number": row[0],
                "component_name": row[1],
                "current_stock": row[2],
                "min_stock": row[3],
                "unit_cost": float(row[4]) if row[4] else 0,
                "inventory_value": float(row[5]) if row[5] else 0,
                "digikey_pn": row[6],
                "lead_time": row[7],
                "status": row[8],
                "supplier": row[9],
                "category": row[10],
                "last_updated": row[11].isoformat() if row[11] else None,
                "created_at": row[12].isoformat() if row[12] else None
            }
            items.append(item)
        
        conn.close()
        return create_response(data=items)
        
    except Exception as e:
        logger.error(f"Error fetching inventory: {e}")
        return create_response(error=str(e), status_code=500)

def main_inventory_item(req: func.HttpRequest) -> func.HttpResponse:
    """GET /api/inventory/{part_number} - Get specific inventory item"""
    try:
        part_number = req.route_params.get('part_number')
        if not part_number:
            return create_response(error="Part number required", status_code=400)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT part_number, component_name, current_stock, min_stock, 
                   unit_cost, inventory_value, digikey_pn, lead_time, 
                   status, supplier, category, last_updated, created_at
            FROM inventory_items 
            WHERE part_number = ?
        """, (part_number,))
        
        row = cursor.fetchone()
        if row:
            item = {
                "part_number": row[0],
                "component_name": row[1],
                "current_stock": row[2],
                "min_stock": row[3],
                "unit_cost": float(row[4]) if row[4] else 0,
                "inventory_value": float(row[5]) if row[5] else 0,
                "digikey_pn": row[6],
                "lead_time": row[7],
                "status": row[8],
                "supplier": row[9],
                "category": row[10],
                "last_updated": row[11].isoformat() if row[11] else None,
                "created_at": row[12].isoformat() if row[12] else None
            }
            conn.close()
            return create_response(data=item)
        else:
            conn.close()
            return create_response(error="Item not found", status_code=404)
            
    except Exception as e:
        logger.error(f"Error fetching inventory item: {e}")
        return create_response(error=str(e), status_code=500)

def main_inventory_low_stock(req: func.HttpRequest) -> func.HttpResponse:
    """GET /api/inventory/low-stock - Get low stock items"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT part_number, component_name, current_stock, min_stock,
                   (min_stock - current_stock) as shortage, status
            FROM inventory_items 
            WHERE current_stock < min_stock
            ORDER BY (min_stock - current_stock) DESC
        """)
        
        items = []
        for row in cursor.fetchall():
            item = {
                "part_number": row[0],
                "component_name": row[1],
                "current_stock": row[2],
                "min_stock": row[3],
                "shortage": row[4],
                "status": row[5]
            }
            items.append(item)
        
        conn.close()
        return create_response(data=items)
        
    except Exception as e:
        logger.error(f"Error fetching low stock items: {e}")
        return create_response(error=str(e), status_code=500)

# =====================================================
# BOM ENDPOINTS
# =====================================================

def main_bom_templates(req: func.HttpRequest) -> func.HttpResponse:
    """GET /api/bom/templates - Get BOM templates"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT bt.bom_id, bt.name, bt.description, bt.version, bt.status,
                   COUNT(btp.id) as part_count,
                   SUM(btp.total_cost) as total_estimated_cost,
                   bt.updated_at
            FROM bom_templates bt
            LEFT JOIN bom_template_parts btp ON bt.bom_id = btp.bom_id
            GROUP BY bt.bom_id, bt.name, bt.description, bt.version, bt.status, bt.updated_at
            ORDER BY bt.updated_at DESC
        """)
        
        templates = []
        for row in cursor.fetchall():
            template = {
                "bom_id": row[0],
                "name": row[1],
                "description": row[2],
                "version": row[3],
                "status": row[4],
                "part_count": row[5] or 0,
                "total_estimated_cost": float(row[6]) if row[6] else 0,
                "updated_at": row[7].isoformat() if row[7] else None
            }
            templates.append(template)
        
        conn.close()
        return create_response(data=templates)
        
    except Exception as e:
        logger.error(f"Error fetching BOM templates: {e}")
        return create_response(error=str(e), status_code=500)

def main_bom_availability(req: func.HttpRequest) -> func.HttpResponse:
    """GET /api/bom/{bom_id}/availability - Check BOM availability"""
    try:
        bom_id = req.route_params.get('bom_id')
        if not bom_id:
            return create_response(error="BOM ID required", status_code=400)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
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
        
        checks = []
        for row in cursor.fetchall():
            check = {
                "part_number": row[0],
                "description": row[1],
                "quantity_required": row[2],
                "current_stock": row[3],
                "available_quantity": row[4],
                "shortage": row[5],
                "availability_status": row[6]
            }
            checks.append(check)
        
        conn.close()
        return create_response(data=checks)
        
    except Exception as e:
        logger.error(f"Error checking BOM availability: {e}")
        return create_response(error=str(e), status_code=500)

# =====================================================
# HEALTH CHECK
# =====================================================

def main_health(req: func.HttpRequest) -> func.HttpResponse:
    """GET /api/health - Health check endpoint"""
    try:
        # Test database connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        conn.close()
        
        return create_response(data={
            "status": "healthy",
            "database": "connected",
            "timestamp": func.datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return create_response(
            data={"status": "unhealthy", "database": "disconnected"},
            error=str(e),
            status_code=503
        )
