"""
Configuration management for Azure SQL BOM Service
Handles environment variables and Azure Key Vault integration
"""

import os
from typing import Optional
from dataclasses import dataclass

@dataclass
class AzureSQLConfig:
    """Configuration class for Azure SQL connection"""
    server: str
    database: str
    username: Optional[str] = None
    password: Optional[str] = None
    driver: str = "ODBC Driver 17 for SQL Server"
    encrypt: bool = True
    trust_server_certificate: bool = False
    connection_timeout: int = 30
    
    # Azure-specific settings
    subscription_id: str = "1c060ec3-ba93-4f39-8bb0-1685793e30e6"  # Your Azure subscription
    key_vault_url: Optional[str] = None
    managed_identity: bool = False
    
    @classmethod
    def from_environment(cls) -> 'AzureSQLConfig':
        """Create configuration from environment variables"""
        return cls(
            server=os.getenv('AZURE_SQL_SERVER', ''),
            database=os.getenv('AZURE_SQL_DATABASE', 'cannasol_bom'),
            username=os.getenv('AZURE_SQL_USERNAME'),
            password=os.getenv('AZURE_SQL_PASSWORD'),
            driver=os.getenv('AZURE_SQL_DRIVER', "ODBC Driver 17 for SQL Server"),
            encrypt=os.getenv('AZURE_SQL_ENCRYPT', 'true').lower() == 'true',
            trust_server_certificate=os.getenv('AZURE_SQL_TRUST_CERT', 'false').lower() == 'true',
            connection_timeout=int(os.getenv('AZURE_SQL_TIMEOUT', '30')),
            subscription_id=os.getenv('AZURE_SUBSCRIPTION_ID', "1c060ec3-ba93-4f39-8bb0-1685793e30e6"),
            key_vault_url=os.getenv('AZURE_KEY_VAULT_URL'),
            managed_identity=os.getenv('AZURE_USE_MANAGED_IDENTITY', 'false').lower() == 'true'
        )
    
    def get_connection_string(self) -> str:
        """Generate ODBC connection string"""
        if self.managed_identity:
            return (
                f"DRIVER={{{self.driver}}};"
                f"SERVER={self.server};"
                f"DATABASE={self.database};"
                f"Authentication=ActiveDirectoryMsi;"
                f"Encrypt={'yes' if self.encrypt else 'no'};"
                f"TrustServerCertificate={'yes' if self.trust_server_certificate else 'no'};"
                f"Connection Timeout={self.connection_timeout};"
            )
        else:
            return (
                f"DRIVER={{{self.driver}}};"
                f"SERVER={self.server};"
                f"DATABASE={self.database};"
                f"UID={self.username};"
                f"PWD={self.password};"
                f"Encrypt={'yes' if self.encrypt else 'no'};"
                f"TrustServerCertificate={'yes' if self.trust_server_certificate else 'no'};"
                f"Connection Timeout={self.connection_timeout};"
            )
    
    def validate(self) -> bool:
        """Validate configuration"""
        if not self.server or not self.database:
            return False
        
        if not self.managed_identity and (not self.username or not self.password):
            return False
            
        return True


# Default configuration for Cannasol
CANNASOL_CONFIG = AzureSQLConfig(
    server="cannasol-sql-server.database.windows.net",  # Update with actual server
    database="cannasol_bom",
    username="bomadmin",  # Will be overridden by env vars
    password="",  # Will be set via Key Vault or env vars
    subscription_id="1c060ec3-ba93-4f39-8bb0-1685793e30e6"
)
