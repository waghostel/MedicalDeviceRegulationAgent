"""
Input validation and sanitization service
"""

import re
import html
from typing import Dict, Any, List


def sanitize_input(input_text: str) -> str:
    """
    Sanitize input text to prevent XSS and injection attacks
    
    Args:
        input_text: Raw input text
        
    Returns:
        Sanitized text
    """
    if not isinstance(input_text, str):
        return str(input_text)
    
    # HTML escape to prevent XSS
    sanitized = html.escape(input_text)
    
    # Remove dangerous patterns
    dangerous_patterns = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'<iframe[^>]*>.*?</iframe>',
        r'onerror\s*=',
        r'onload\s*=',
        r'onclick\s*=',
        r'drop\s+table',
        r'delete\s+from',
        r'union\s+select',
        r'--\s*$',
    ]
    
    for pattern in dangerous_patterns:
        sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
    
    return sanitized.strip()


def validate_project_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate project data for completeness and security
    
    Args:
        data: Project data dictionary
        
    Returns:
        Validation result with 'valid', 'errors', and optionally 'sanitized' keys
    """
    errors = []
    sanitized_data = {}
    
    # Required fields
    required_fields = ['name', 'description', 'deviceType', 'intendedUse']
    
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f"Field '{field}' is required")
        else:
            # Check length limits
            value = str(data[field])
            if field == 'name' and len(value) > 200:
                errors.append(f"Field '{field}' is too long (max 200 characters)")
            elif field == 'description' and len(value) > 2000:
                errors.append(f"Field '{field}' is too long (max 2000 characters)")
            elif len(value) > 500:
                errors.append(f"Field '{field}' is too long (max 500 characters)")
            
            # Sanitize the value
            sanitized_data[field] = sanitize_input(value)
    
    # Check for malicious content
    for field, value in data.items():
        if isinstance(value, str):
            original_value = value
            sanitized_value = sanitize_input(value)
            
            # If sanitization changed the value significantly, it might be malicious
            if len(sanitized_value) < len(original_value) * 0.8:
                errors.append(f"Field '{field}' contains potentially malicious content")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'sanitized': sanitized_data if len(errors) == 0 else None
    }