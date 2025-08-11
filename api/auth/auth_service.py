"""
Simple authentication service for BOM API
"""

from typing import Optional, Dict, Any
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

class AuthService:
    """Simple JWT-based authentication service"""
    
    def __init__(self):
        # In production, use Azure Key Vault or environment variables
        self.secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30

    async def validate_token(self, token: str) -> Dict[str, Any]:
        """Validate JWT token and return user info"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id: str = payload.get("sub")
            if user_id is None:
                raise JWTError("Invalid token")
            
            # In production, verify user exists in database
            return {
                "user_id": user_id,
                "email": payload.get("email"),
                "name": payload.get("name"),
                "roles": payload.get("roles", [])
            }
        except JWTError:
            raise Exception("Invalid token")

    def create_access_token(self, data: Dict[str, Any]) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
