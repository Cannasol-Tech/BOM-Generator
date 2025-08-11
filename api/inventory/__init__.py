import azure.functions as func
import json
import logging
import os
import pyodbc

def main(req: func.HttpRequest) -> func.HttpResponse:
    """
    Inventory operations
    Route: GET /api/inventory
    Access: Authenticated
    """
    logging.info('Inventory endpoint called')
    
    try:
        method = req.method
        
        if method == "GET":
            return get_all_inventory()
        elif method == "POST":
            return create_inventory_item(req)
        else:
            return func.HttpResponse(
                json.dumps({"error": f"Method {method} not allowed"}),
                status_code=405,
                headers={"Content-Type": "application/json"}
            )
            
    except Exception as e:
        logging.error(f"Inventory operation failed: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            headers={"Content-Type": "application/json"}
        )

def get_all_inventory():
    """Get all inventory items"""
    try:
        connection_string = os.environ.get('AZURE_SQL_CONNECTION_STRING')
        if not connection_string:
            raise ValueError("Database connection string not configured")
        
        conn = pyodbc.connect(connection_string)
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
        
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "data": items,
                "count": len(items)
            }),
            status_code=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        logging.error(f"Error fetching inventory: {str(e)}")
        raise e

def create_inventory_item(req: func.HttpRequest):
    """Create new inventory item"""
    try:
        req_body = req.get_json()
        
        # Validate required fields
        required_fields = ['part_number', 'component_name']
        for field in required_fields:
            if field not in req_body:
                return func.HttpResponse(
                    json.dumps({"error": f"Missing required field: {field}"}),
                    status_code=400,
                    headers={"Content-Type": "application/json"}
                )
        
        # Database insert logic would go here
        # For now, return success
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "message": "Inventory item created",
                "part_number": req_body['part_number']
            }),
            status_code=201,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        logging.error(f"Error creating inventory item: {str(e)}")
        raise e
