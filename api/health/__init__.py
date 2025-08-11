import azure.functions as func
import json
import logging

def main(req: func.HttpRequest) -> func.HttpResponse:
    """
    Health check endpoint
    Route: GET /api/health
    Access: Anonymous (public)
    """
    logging.info('Health check endpoint called')
    
    try:
        health_data = {
            "status": "healthy",
            "service": "BOM Generator API",
            "timestamp": func.datetime.now().isoformat(),
            "version": "1.0.0"
        }
        
        return func.HttpResponse(
            json.dumps(health_data),
            status_code=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        logging.error(f"Health check failed: {str(e)}")
        
        error_data = {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": func.datetime.now().isoformat()
        }
        
        return func.HttpResponse(
            json.dumps(error_data),
            status_code=503,
            headers={"Content-Type": "application/json"}
        )
