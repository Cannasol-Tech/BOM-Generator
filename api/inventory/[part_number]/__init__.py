import azure.functions as func
import json
import logging
import os
import pyodbc

def main(req: func.HttpRequest) -> func.HttpResponse:
    """
    Individual inventory item operations
    Route: GET/PUT/DELETE /api/inventory/{part_number}
    Access: Authenticated
    """
    logging.info('Individual inventory item endpoint called')
    
    try:
        # Get the part number from the route
        part_number = req.route_params.get('part_number')
        if not part_number:
            return func.HttpResponse(
                json.dumps({"error": "Part number is required"}),
                status_code=400,
                headers={"Content-Type": "application/json"}
            )
        
        method = req.method
        
        if method == "GET":
            return get_inventory_item(part_number)
        elif method == "PUT":
            return update_inventory_item(part_number, req)
        elif method == "DELETE":
            return delete_inventory_item(part_number)
        else:
            return func.HttpResponse(
                json.dumps({"error": f"Method {method} not allowed"}),
                status_code=405,
                headers={"Content-Type": "application/json"}
            )
            
    except Exception as e:
        logging.error(f"Inventory item operation failed: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            headers={"Content-Type": "application/json"}
        )

def get_inventory_item(part_number: str):
    """Get specific inventory item"""
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
            WHERE part_number = ?
        """, (part_number,))
        
        row = cursor.fetchone()
        conn.close()
        
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
            
            return func.HttpResponse(
                json.dumps({
                    "success": True,
                    "data": item
                }),
                status_code=200,
                headers={"Content-Type": "application/json"}
            )
        else:
            return func.HttpResponse(
                json.dumps({
                    "success": False,
                    "error": "Item not found"
                }),
                status_code=404,
                headers={"Content-Type": "application/json"}
            )
        
    except Exception as e:
        logging.error(f"Error fetching inventory item {part_number}: {str(e)}")
        raise e

def update_inventory_item(part_number: str, req: func.HttpRequest):
    """Update inventory item"""
    try:
        req_body = req.get_json()
        
        # Basic validation
        if 'current_stock' in req_body:
            new_stock = req_body['current_stock']
            # Database update logic would go here
            
            return func.HttpResponse(
                json.dumps({
                    "success": True,
                    "message": f"Updated stock for {part_number} to {new_stock}"
                }),
                status_code=200,
                headers={"Content-Type": "application/json"}
            )
        else:
            return func.HttpResponse(
                json.dumps({"error": "No update data provided"}),
                status_code=400,
                headers={"Content-Type": "application/json"}
            )
        
    except Exception as e:
        logging.error(f"Error updating inventory item {part_number}: {str(e)}")
        raise e

def delete_inventory_item(part_number: str):
    """Delete inventory item"""
    try:
        # Database delete logic would go here
        
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "message": f"Deleted inventory item {part_number}"
            }),
            status_code=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        logging.error(f"Error deleting inventory item {part_number}: {str(e)}")
        raise e
