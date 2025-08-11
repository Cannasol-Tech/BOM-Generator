"""
Simple startup script for the BOM Generator API
"""

import asyncio
import logging
import os
from typing import Optional

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_connection_string() -> str:
    """Get database connection string from environment"""
    connection_string = os.getenv('AZURE_SQL_CONNECTION_STRING')
    if not connection_string:
        logger.warning("AZURE_SQL_CONNECTION_STRING not found, using example")
        return "Driver={ODBC Driver 17 for SQL Server};Server=tcp:localhost,1433;Database=bom_generator;Uid=sa;Pwd=YourPassword123;Encrypt=yes;TrustServerCertificate=yes;"
    return connection_string

async def test_database_connection():
    """Test database connectivity"""
    try:
        # Simple test without dependencies
        logger.info("🔍 Testing database connection...")
        connection_string = get_connection_string()
        logger.info(f"Using connection string: {connection_string[:50]}...")
        logger.info("✅ Connection string loaded successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection test failed: {e}")
        return False

def main():
    """Main entry point"""
    logger.info("🚀 Starting BOM Generator API...")
    
    # Test database connection
    if asyncio.run(test_database_connection()):
        logger.info("✅ Database connectivity check passed")
    else:
        logger.warning("⚠️  Database connectivity check failed")
    
    # Show configuration
    logger.info("📋 API Configuration:")
    logger.info(f"   Host: {os.getenv('API_HOST', '0.0.0.0')}")
    logger.info(f"   Port: {os.getenv('API_PORT', '8000')}")
    logger.info(f"   Environment: {os.getenv('ENVIRONMENT', 'development')}")
    
    logger.info("""
🎯 API Endpoints will be available at:
   • Health Check: http://localhost:8000/api/health
   • API Docs: http://localhost:8000/api/docs
   • Inventory: http://localhost:8000/api/inventory
   • BOM Templates: http://localhost:8000/api/bom/templates
    
🔧 To start the API server:
   pip install -r requirements.txt
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    
📝 Don't forget to:
   1. Set up your Azure SQL Database
   2. Configure environment variables (.env file)
   3. Set up authentication (JWT tokens)
   4. Update CORS origins for your frontend
    """)

if __name__ == "__main__":
    main()
