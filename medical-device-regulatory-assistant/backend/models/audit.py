"""
Audit trail models for compliance and security
"""

import re
from datetime import datetime, timezone, UTC
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class AuditLogEntry(BaseModel):
    """Audit log entry for tracking user actions"""
    
    user_id: str = Field(..., description="ID of the user performing the action")
    action: str = Field(..., description="Action being performed")
    resource_type: str = Field(..., description="Type of resource being acted upon")
    resource_id: str = Field(..., description="ID of the resource")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional action details")
    ip_address: Optional[str] = Field(None, description="IP address of the user")
    user_agent: Optional[str] = Field(None, description="User agent string")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC), description="When the action occurred")
    
    model_config = ConfigDict(
        # Make fields immutable after creation
        frozen=True
    )
        
    @field_validator('details')
    @classmethod
    def filter_sensitive_data(cls, v):
        """Filter sensitive data from audit log details"""
        if not isinstance(v, dict):
            return v
            
        filtered = {}
        sensitive_patterns = [
            r'password',
            r'api_key',
            r'token',
            r'secret',
            r'credit_card',
            r'ssn',
            r'social_security',
        ]
        
        for key, value in v.items():
            key_lower = key.lower()
            is_sensitive = any(re.search(pattern, key_lower) for pattern in sensitive_patterns)
            
            if is_sensitive:
                filtered[key] = "[REDACTED]"
            elif isinstance(value, str):
                # Check if value looks like sensitive data
                value_lower = value.lower()
                if any(re.search(pattern, value_lower) for pattern in sensitive_patterns):
                    filtered[key] = "[REDACTED]"
                # Check for credit card patterns
                elif re.search(r'\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}', value):
                    filtered[key] = "[REDACTED]"
                # Check for API key patterns
                elif re.search(r'sk-[a-zA-Z0-9]{20,}', value):
                    filtered[key] = "[REDACTED]"
                else:
                    filtered[key] = value
            else:
                filtered[key] = value
                
        return filtered
    
