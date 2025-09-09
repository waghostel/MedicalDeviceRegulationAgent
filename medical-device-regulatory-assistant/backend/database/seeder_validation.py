"""
Validation system for database seeding operations
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass
from enum import Enum

import jsonschema
from jsonschema import validate, ValidationError

logger = logging.getLogger(__name__)


class ValidationLevel(Enum):
    """Validation severity levels"""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationResult:
    """Result of a validation check"""
    level: ValidationLevel
    message: str
    field_path: Optional[str] = None
    expected_value: Optional[Any] = None
    actual_value: Optional[Any] = None
    suggestion: Optional[str] = None


@dataclass
class ValidationReport:
    """Complete validation report"""
    is_valid: bool
    results: List[ValidationResult]
    
    @property
    def errors(self) -> List[ValidationResult]:
        """Get only error-level results"""
        return [r for r in self.results if r.level == ValidationLevel.ERROR]
    
    @property
    def warnings(self) -> List[ValidationResult]:
        """Get only warning-level results"""
        return [r for r in self.results if r.level == ValidationLevel.WARNING]
    
    @property
    def has_errors(self) -> bool:
        """Check if report has any errors"""
        return len(self.errors) > 0
    
    @property
    def has_warnings(self) -> bool:
        """Check if report has any warnings"""
        return len(self.warnings) > 0


class SeederValidator:
    """Validates seeder configuration and data"""
    
    def __init__(self):
        self.schema = self._load_json_schema()
    
    def _load_json_schema(self) -> Dict[str, Any]:
        """Load JSON schema for mock data configuration"""
        return {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "properties": {
                "users": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "google_id": {"type": "string", "minLength": 1},
                            "email": {"type": "string", "format": "email"},
                            "name": {"type": "string", "minLength": 1},
                            "avatar_url": {"type": "string", "format": "uri"}
                        },
                        "required": ["google_id", "email", "name"],
                        "additionalProperties": False
                    },
                    "minItems": 1
                },
                "projects": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "minLength": 1, "maxLength": 255},
                            "description": {"type": "string", "maxLength": 2000},
                            "device_type": {"type": "string", "maxLength": 255},
                            "intended_use": {"type": "string", "maxLength": 5000},
                            "status": {"enum": ["draft", "in_progress", "completed"]},
                            "priority": {"enum": ["high", "medium", "low"]},
                            "tags": {
                                "type": "array",
                                "items": {"type": "string"},
                                "maxItems": 10
                            },
                            "user_email": {"type": "string", "format": "email"}
                        },
                        "required": ["name", "user_email"],
                        "additionalProperties": False
                    }
                },
                "device_classifications": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "project_name": {"type": "string"},
                            "device_class": {"enum": ["I", "II", "III"]},
                            "product_code": {"type": "string", "pattern": "^[A-Z]{3}$"},
                            "regulatory_pathway": {"enum": ["510k", "PMA", "De Novo"]},
                            "cfr_sections": {
                                "type": "array",
                                "items": {"type": "string", "pattern": "^21 CFR \\d+\\.\\d+$"}
                            },
                            "confidence_score": {"type": "number", "minimum": 0, "maximum": 1},
                            "reasoning": {"type": "string"}
                        },
                        "required": ["project_name", "device_class", "product_code"],
                        "additionalProperties": False
                    }
                },
                "predicate_devices": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "project_name": {"type": "string"},
                            "k_number": {"type": "string", "pattern": "^K\\d{6}$"},
                            "device_name": {"type": "string"},
                            "intended_use": {"type": "string"},
                            "product_code": {"type": "string", "pattern": "^[A-Z]{3}$"},
                            "clearance_date": {"type": "string", "format": "date"},
                            "confidence_score": {"type": "number", "minimum": 0, "maximum": 1},
                            "is_selected": {"type": "boolean"},
                            "comparison_data": {"type": "object"}
                        },
                        "required": ["project_name", "k_number", "device_name"],
                        "additionalProperties": False
                    }
                },
                "agent_interactions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "project_name": {"type": "string"},
                            "user_email": {"type": "string", "format": "email"},
                            "agent_action": {"type": "string"},
                            "input_data": {"type": "object"},
                            "output_data": {"type": "object"},
                            "confidence_score": {"type": "number", "minimum": 0, "maximum": 1},
                            "reasoning": {"type": "string"},
                            "execution_time_ms": {"type": "integer", "minimum": 0}
                        },
                        "required": ["project_name", "user_email", "agent_action"],
                        "additionalProperties": False
                    }
                }
            },
            "required": ["users", "projects"],
            "additionalProperties": False
        }
    
    def validate_config_file(self, config_path: str) -> ValidationReport:
        """Validate a configuration file"""
        results = []
        
        try:
            # Check if file exists
            config_file = Path(config_path)
            if not config_file.exists():
                results.append(ValidationResult(
                    level=ValidationLevel.ERROR,
                    message=f"Configuration file not found: {config_path}",
                    suggestion="Check the file path and ensure the file exists"
                ))
                return ValidationReport(is_valid=False, results=results)
            
            # Load and parse JSON
            try:
                with open(config_file, 'r') as f:
                    config_data = json.load(f)
            except json.JSONDecodeError as e:
                results.append(ValidationResult(
                    level=ValidationLevel.ERROR,
                    message=f"Invalid JSON format: {str(e)}",
                    suggestion="Check JSON syntax and fix any formatting errors"
                ))
                return ValidationReport(is_valid=False, results=results)
            
            # Validate against schema
            try:
                validate(instance=config_data, schema=self.schema)
                results.append(ValidationResult(
                    level=ValidationLevel.INFO,
                    message="Configuration file passed schema validation"
                ))
            except ValidationError as e:
                results.append(ValidationResult(
                    level=ValidationLevel.ERROR,
                    message=f"Schema validation failed: {e.message}",
                    field_path=".".join(str(p) for p in e.absolute_path) if e.absolute_path else None,
                    suggestion="Fix the data format according to the schema requirements"
                ))
                return ValidationReport(is_valid=False, results=results)
            
            # Perform business logic validation
            business_results = self._validate_business_logic(config_data)
            results.extend(business_results)
            
            # Check if validation passed
            has_errors = any(r.level == ValidationLevel.ERROR for r in results)
            
            return ValidationReport(is_valid=not has_errors, results=results)
            
        except Exception as e:
            results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                message=f"Unexpected validation error: {str(e)}",
                suggestion="Check the configuration file and try again"
            ))
            return ValidationReport(is_valid=False, results=results)
    
    def _validate_business_logic(self, config_data: Dict[str, Any]) -> List[ValidationResult]:
        """Validate business logic rules"""
        results = []
        
        # Extract data sections
        users = config_data.get('users', [])
        projects = config_data.get('projects', [])
        classifications = config_data.get('device_classifications', [])
        predicates = config_data.get('predicate_devices', [])
        interactions = config_data.get('agent_interactions', [])
        
        # Validate user references
        user_emails = {user['email'] for user in users}
        
        for project in projects:
            if project['user_email'] not in user_emails:
                results.append(ValidationResult(
                    level=ValidationLevel.ERROR,
                    message=f"Project '{project['name']}' references non-existent user: {project['user_email']}",
                    field_path=f"projects[name='{project['name']}'].user_email",
                    suggestion="Ensure all user_email references exist in the users array"
                ))
        
        # Validate project references
        project_names = {project['name'] for project in projects}
        
        for classification in classifications:
            if classification['project_name'] not in project_names:
                results.append(ValidationResult(
                    level=ValidationLevel.WARNING,
                    message=f"Classification references non-existent project: {classification['project_name']}",
                    field_path=f"device_classifications[project_name='{classification['project_name']}']",
                    suggestion="Ensure all project_name references exist in the projects array"
                ))
        
        for predicate in predicates:
            if predicate['project_name'] not in project_names:
                results.append(ValidationResult(
                    level=ValidationLevel.WARNING,
                    message=f"Predicate device references non-existent project: {predicate['project_name']}",
                    field_path=f"predicate_devices[project_name='{predicate['project_name']}']",
                    suggestion="Ensure all project_name references exist in the projects array"
                ))
        
        for interaction in interactions:
            if interaction['project_name'] not in project_names:
                results.append(ValidationResult(
                    level=ValidationLevel.WARNING,
                    message=f"Agent interaction references non-existent project: {interaction['project_name']}",
                    field_path=f"agent_interactions[project_name='{interaction['project_name']}']",
                    suggestion="Ensure all project_name references exist in the projects array"
                ))
            
            if interaction['user_email'] not in user_emails:
                results.append(ValidationResult(
                    level=ValidationLevel.WARNING,
                    message=f"Agent interaction references non-existent user: {interaction['user_email']}",
                    field_path=f"agent_interactions[user_email='{interaction['user_email']}']",
                    suggestion="Ensure all user_email references exist in the users array"
                ))
        
        # Validate data consistency
        for project in projects:
            project_classifications = [c for c in classifications if c['project_name'] == project['name']]
            project_predicates = [p for p in predicates if p['project_name'] == project['name']]
            
            if len(project_classifications) > 1:
                results.append(ValidationResult(
                    level=ValidationLevel.WARNING,
                    message=f"Project '{project['name']}' has multiple classifications",
                    suggestion="Consider having only one classification per project"
                ))
            
            # Check for matching product codes between classifications and predicates
            if project_classifications and project_predicates:
                classification_codes = {c.get('product_code') for c in project_classifications}
                predicate_codes = {p.get('product_code') for p in project_predicates}
                
                if not classification_codes.intersection(predicate_codes):
                    results.append(ValidationResult(
                        level=ValidationLevel.WARNING,
                        message=f"Project '{project['name']}' has mismatched product codes between classification and predicates",
                        suggestion="Ensure product codes are consistent between classifications and predicate devices"
                    ))
        
        return results
    
    def validate_seeded_data(self, db_manager) -> ValidationReport:
        """Validate data after seeding to ensure integrity"""
        results = []
        
        try:
            # This would be implemented to check database state
            # For now, return a basic validation
            results.append(ValidationResult(
                level=ValidationLevel.INFO,
                message="Post-seeding validation not yet implemented",
                suggestion="Implement database state validation checks"
            ))
            
            return ValidationReport(is_valid=True, results=results)
            
        except Exception as e:
            results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                message=f"Post-seeding validation failed: {str(e)}",
                suggestion="Check database state and seeding process"
            ))
            return ValidationReport(is_valid=False, results=results)


def format_validation_report(report: ValidationReport) -> str:
    """Format validation report for logging"""
    lines = []
    
    if report.is_valid:
        lines.append("✅ Validation PASSED")
    else:
        lines.append("❌ Validation FAILED")
    
    lines.append(f"   Errors: {len(report.errors)}")
    lines.append(f"   Warnings: {len(report.warnings)}")
    lines.append(f"   Total issues: {len(report.results)}")
    
    if report.results:
        lines.append("\nDetails:")
        
        for result in report.results:
            icon = "❌" if result.level == ValidationLevel.ERROR else "⚠️" if result.level == ValidationLevel.WARNING else "ℹ️"
            lines.append(f"  {icon} {result.message}")
            
            if result.field_path:
                lines.append(f"      Field: {result.field_path}")
            
            if result.suggestion:
                lines.append(f"      Suggestion: {result.suggestion}")
    
    return "\n".join(lines)