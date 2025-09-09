"""
JSON Schema Validator for Mock Data Configuration

This module provides utilities for validating mock data configuration files
against the defined JSON schema for the Medical Device Regulatory Assistant.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from jsonschema import validate, ValidationError, Draft7Validator
from jsonschema.exceptions import SchemaError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MockDataValidator:
    """Validator for mock data configuration files"""
    
    def __init__(self, schema_path: Optional[str] = None):
        """
        Initialize the validator with a JSON schema
        
        Args:
            schema_path: Path to the JSON schema file. If None, uses default schema.
        """
        if schema_path is None:
            schema_path = Path(__file__).parent / "schemas" / "mock_data_schema.json"
        
        self.schema_path = Path(schema_path)
        self.schema = self._load_schema()
        self.validator = Draft7Validator(self.schema)
    
    def _load_schema(self) -> Dict[str, Any]:
        """Load the JSON schema from file"""
        try:
            with open(self.schema_path, 'r') as f:
                schema = json.load(f)
            logger.info(f"Loaded schema from {self.schema_path}")
            return schema
        except FileNotFoundError:
            raise FileNotFoundError(f"Schema file not found: {self.schema_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in schema file: {e}")
    
    def validate_config(self, config_path: str) -> Tuple[bool, List[str]]:
        """
        Validate a mock data configuration file
        
        Args:
            config_path: Path to the configuration file to validate
            
        Returns:
            Tuple of (is_valid, error_messages)
        """
        try:
            config = self._load_config(config_path)
            return self._validate_data(config)
        except Exception as e:
            return False, [f"Error loading configuration: {str(e)}"]
    
    def validate_data(self, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate mock data directly
        
        Args:
            data: Dictionary containing mock data to validate
            
        Returns:
            Tuple of (is_valid, error_messages)
        """
        return self._validate_data(data)
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        config_file = Path(config_path)
        if not config_file.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_path}")
        
        with open(config_file, 'r') as f:
            return json.load(f)
    
    def _validate_data(self, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate data against schema"""
        errors = []
        
        try:
            # First check if schema itself is valid
            Draft7Validator.check_schema(self.schema)
        except SchemaError as e:
            return False, [f"Invalid schema: {str(e)}"]
        
        # Validate the data
        validation_errors = sorted(self.validator.iter_errors(data), key=lambda e: e.path)
        
        for error in validation_errors:
            error_path = " -> ".join([str(p) for p in error.path]) if error.path else "root"
            error_message = f"Path '{error_path}': {error.message}"
            errors.append(error_message)
        
        # Additional business logic validation
        business_errors = self._validate_business_rules(data)
        errors.extend(business_errors)
        
        is_valid = len(errors) == 0
        return is_valid, errors
    
    def _validate_business_rules(self, data: Dict[str, Any]) -> List[str]:
        """Validate business-specific rules beyond JSON schema"""
        errors = []
        
        # Check that all project user_emails reference existing users
        user_emails = {user['email'] for user in data.get('users', [])}
        for project in data.get('projects', []):
            if project['user_email'] not in user_emails:
                errors.append(
                    f"Project '{project['name']}' references non-existent user email: {project['user_email']}"
                )
        
        # Check that all device_classifications reference existing projects
        project_names = {project['name'] for project in data.get('projects', [])}
        for classification in data.get('device_classifications', []):
            if classification['project_name'] not in project_names:
                errors.append(
                    f"Device classification references non-existent project: {classification['project_name']}"
                )
        
        # Check that all predicate_devices reference existing projects
        for predicate in data.get('predicate_devices', []):
            if predicate['project_name'] not in project_names:
                errors.append(
                    f"Predicate device '{predicate['k_number']}' references non-existent project: {predicate['project_name']}"
                )
        
        # Check that all agent_interactions reference existing projects and users
        for interaction in data.get('agent_interactions', []):
            if interaction['project_name'] not in project_names:
                errors.append(
                    f"Agent interaction references non-existent project: {interaction['project_name']}"
                )
            if interaction['user_email'] not in user_emails:
                errors.append(
                    f"Agent interaction references non-existent user email: {interaction['user_email']}"
                )
        
        # Check for duplicate user emails
        user_emails_list = [user['email'] for user in data.get('users', [])]
        if len(user_emails_list) != len(set(user_emails_list)):
            errors.append("Duplicate user emails found")
        
        # Check for duplicate user google_ids
        google_ids = [user['google_id'] for user in data.get('users', [])]
        if len(google_ids) != len(set(google_ids)):
            errors.append("Duplicate user google_ids found")
        
        # Check for duplicate project names
        project_names_list = [project['name'] for project in data.get('projects', [])]
        if len(project_names_list) != len(set(project_names_list)):
            errors.append("Duplicate project names found")
        
        # Check for duplicate K-numbers
        k_numbers = [predicate['k_number'] for predicate in data.get('predicate_devices', [])]
        if len(k_numbers) != len(set(k_numbers)):
            errors.append("Duplicate K-numbers found in predicate devices")
        
        return errors
    
    def get_schema_info(self) -> Dict[str, Any]:
        """Get information about the loaded schema"""
        return {
            "schema_path": str(self.schema_path),
            "schema_title": self.schema.get("title", "Unknown"),
            "schema_description": self.schema.get("description", "No description"),
            "required_properties": self.schema.get("required", []),
            "properties": list(self.schema.get("properties", {}).keys())
        }


def validate_mock_data_file(config_path: str, schema_path: Optional[str] = None) -> None:
    """
    Convenience function to validate a mock data configuration file and print results
    
    Args:
        config_path: Path to the configuration file to validate
        schema_path: Optional path to custom schema file
    """
    validator = MockDataValidator(schema_path)
    is_valid, errors = validator.validate_config(config_path)
    
    print(f"Validating: {config_path}")
    print(f"Schema: {validator.schema_path}")
    print("-" * 50)
    
    if is_valid:
        print("✅ Configuration is VALID")
        
        # Load and show summary statistics
        try:
            with open(config_path, 'r') as f:
                data = json.load(f)
            
            print(f"📊 Summary:")
            print(f"  - Users: {len(data.get('users', []))}")
            print(f"  - Projects: {len(data.get('projects', []))}")
            print(f"  - Device Classifications: {len(data.get('device_classifications', []))}")
            print(f"  - Predicate Devices: {len(data.get('predicate_devices', []))}")
            print(f"  - Agent Interactions: {len(data.get('agent_interactions', []))}")
        except Exception as e:
            print(f"Could not load summary: {e}")
    else:
        print("❌ Configuration is INVALID")
        print(f"Found {len(errors)} error(s):")
        for i, error in enumerate(errors, 1):
            print(f"  {i}. {error}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python json_validator.py <config_file_path> [schema_file_path]")
        sys.exit(1)
    
    config_file = sys.argv[1]
    schema_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    validate_mock_data_file(config_file, schema_file)