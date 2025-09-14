"""
Configuration Management System for Medical Device Regulatory Assistant.

This module provides unified configuration validation and management for both
development and test environments, ensuring consistent setup across all environments.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
import logging


class EnvironmentType(str, Enum):
    """Supported environment types."""
    DEVELOPMENT = "development"
    TESTING = "testing"
    PRODUCTION = "production"
    LOCAL = "local"


class ConfigurationLevel(str, Enum):
    """Configuration validation levels."""
    CRITICAL = "critical"  # Must be present for system to function
    REQUIRED = "required"  # Should be present for proper operation
    OPTIONAL = "optional"  # Nice to have but not essential
    DEPRECATED = "deprecated"  # Should be removed


@dataclass
class ConfigurationItem:
    """Represents a single configuration item."""
    key: str
    description: str
    level: ConfigurationLevel
    default_value: Optional[Any] = None
    allowed_values: Optional[List[Any]] = None
    validation_pattern: Optional[str] = None
    environment_specific: bool = False
    sensitive: bool = False  # For passwords, API keys, etc.


@dataclass
class ValidationResult:
    """Result of configuration validation."""
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)


class ConfigurationManager:
    """
    Manages and validates configuration for the Medical Device Regulatory Assistant.
    
    This class provides unified configuration management across development and test
    environments, with support for environment-specific overrides and validation.
    """
    
    # Backend configuration schema
    BACKEND_CONFIG_SCHEMA = [
        ConfigurationItem(
            key="DATABASE_URL",
            description="Database connection URL",
            level=ConfigurationLevel.CRITICAL,
            default_value="sqlite:./medical_device_assistant.db",
            environment_specific=True
        ),
        ConfigurationItem(
            key="NEXTAUTH_SECRET",
            description="NextAuth.js secret for JWT signing",
            level=ConfigurationLevel.CRITICAL,
            sensitive=True
        ),
        ConfigurationItem(
            key="NEXTAUTH_URL",
            description="NextAuth.js base URL",
            level=ConfigurationLevel.CRITICAL,
            default_value="http://localhost:3000",
            environment_specific=True
        ),
        ConfigurationItem(
            key="GOOGLE_CLIENT_ID",
            description="Google OAuth client ID",
            level=ConfigurationLevel.REQUIRED,
            sensitive=True
        ),
        ConfigurationItem(
            key="GOOGLE_CLIENT_SECRET",
            description="Google OAuth client secret",
            level=ConfigurationLevel.REQUIRED,
            sensitive=True
        ),
        ConfigurationItem(
            key="FDA_API_KEY",
            description="FDA API access key",
            level=ConfigurationLevel.OPTIONAL,
            sensitive=True
        ),
        ConfigurationItem(
            key="OPENAI_API_KEY",
            description="OpenAI API key for LLM functionality",
            level=ConfigurationLevel.OPTIONAL,
            sensitive=True
        ),
        ConfigurationItem(
            key="REDIS_URL",
            description="Redis connection URL for caching",
            level=ConfigurationLevel.OPTIONAL,
            default_value="redis://localhost:6379"
        ),
        ConfigurationItem(
            key="LOG_LEVEL",
            description="Application logging level",
            level=ConfigurationLevel.OPTIONAL,
            default_value="INFO",
            allowed_values=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        ),
        ConfigurationItem(
            key="CORS_ORIGINS",
            description="Allowed CORS origins (comma-separated)",
            level=ConfigurationLevel.OPTIONAL,
            default_value="http://localhost:3000,http://127.0.0.1:3000"
        ),
        ConfigurationItem(
            key="MAX_UPLOAD_SIZE",
            description="Maximum file upload size in bytes",
            level=ConfigurationLevel.OPTIONAL,
            default_value="10485760"  # 10MB
        ),
        ConfigurationItem(
            key="SESSION_TIMEOUT",
            description="User session timeout in seconds",
            level=ConfigurationLevel.OPTIONAL,
            default_value="3600"  # 1 hour
        ),
        ConfigurationItem(
            key="RATE_LIMIT_REQUESTS",
            description="Rate limit requests per minute",
            level=ConfigurationLevel.OPTIONAL,
            default_value="100"
        ),
        ConfigurationItem(
            key="ENABLE_METRICS",
            description="Enable Prometheus metrics collection",
            level=ConfigurationLevel.OPTIONAL,
            default_value="false",
            allowed_values=["true", "false"]
        ),
        ConfigurationItem(
            key="SENTRY_DSN",
            description="Sentry DSN for error tracking",
            level=ConfigurationLevel.OPTIONAL,
            sensitive=True
        )
    ]
    
    # Frontend configuration schema
    FRONTEND_CONFIG_SCHEMA = [
        ConfigurationItem(
            key="NEXT_PUBLIC_API_URL",
            description="Public API base URL",
            level=ConfigurationLevel.CRITICAL,
            default_value="http://localhost:8000",
            environment_specific=True
        ),
        ConfigurationItem(
            key="NEXT_PUBLIC_APP_NAME",
            description="Application display name",
            level=ConfigurationLevel.REQUIRED,
            default_value="Medical Device Regulatory Assistant"
        ),
        ConfigurationItem(
            key="NEXT_PUBLIC_ENABLE_ANALYTICS",
            description="Enable analytics tracking",
            level=ConfigurationLevel.OPTIONAL,
            default_value="false",
            allowed_values=["true", "false"]
        ),
        ConfigurationItem(
            key="NEXT_PUBLIC_SENTRY_DSN",
            description="Public Sentry DSN for frontend error tracking",
            level=ConfigurationLevel.OPTIONAL,
            sensitive=True
        )
    ]
    
    # Test-specific configuration
    TEST_CONFIG_SCHEMA = [
        ConfigurationItem(
            key="TEST_DATABASE_URL",
            description="Test database connection URL",
            level=ConfigurationLevel.CRITICAL,
            default_value="sqlite:./test.db"
        ),
        ConfigurationItem(
            key="TEST_API_BASE_URL",
            description="Test API base URL",
            level=ConfigurationLevel.CRITICAL,
            default_value="http://localhost:8001"
        ),
        ConfigurationItem(
            key="TEST_TIMEOUT",
            description="Test execution timeout in seconds",
            level=ConfigurationLevel.OPTIONAL,
            default_value="30"
        ),
        ConfigurationItem(
            key="TEST_PARALLEL_WORKERS",
            description="Number of parallel test workers",
            level=ConfigurationLevel.OPTIONAL,
            default_value="4"
        ),
        ConfigurationItem(
            key="MOCK_EXTERNAL_APIS",
            description="Mock external API calls in tests",
            level=ConfigurationLevel.OPTIONAL,
            default_value="true",
            allowed_values=["true", "false"]
        )
    ]

    def __init__(self, environment: EnvironmentType = EnvironmentType.DEVELOPMENT):
        """
        Initialize the configuration manager.
        
        Args:
            environment: The target environment type
        """
        self.environment = environment
        self.project_root = Path(__file__).parent.parent.parent
        self.backend_root = self.project_root / "backend"
        self.logger = logging.getLogger(__name__)
        
        # Load configuration from various sources
        self.config_data = self._load_configuration()

    def validate_backend_configuration(self) -> ValidationResult:
        """
        Validate backend configuration against schema.
        
        Returns:
            ValidationResult: Validation results for backend config
        """
        return self._validate_configuration_schema(
            self.BACKEND_CONFIG_SCHEMA,
            "Backend Configuration"
        )

    def validate_frontend_configuration(self) -> ValidationResult:
        """
        Validate frontend configuration against schema.
        
        Returns:
            ValidationResult: Validation results for frontend config
        """
        return self._validate_configuration_schema(
            self.FRONTEND_CONFIG_SCHEMA,
            "Frontend Configuration"
        )

    def validate_test_configuration(self) -> ValidationResult:
        """
        Validate test-specific configuration.
        
        Returns:
            ValidationResult: Validation results for test config
        """
        return self._validate_configuration_schema(
            self.TEST_CONFIG_SCHEMA,
            "Test Configuration"
        )

    def validate_configuration_files(self) -> ValidationResult:
        """
        Validate configuration files exist and are properly formatted.
        
        Returns:
            ValidationResult: File validation results
        """
        result = ValidationResult(is_valid=True)
        
        # Check backend configuration files
        backend_files = [
            ("pyproject.toml", "Backend dependency configuration"),
            ("poetry.lock", "Backend dependency lock file"),
            (".env.example", "Environment variables template"),
            ("alembic.ini", "Database migration configuration")
        ]
        
        for filename, description in backend_files:
            file_path = self.backend_root / filename
            if file_path.exists():
                result.details[f"backend_{filename.replace('.', '_')}"] = True
                try:
                    # Basic file validation
                    if filename.endswith('.toml'):
                        self._validate_toml_file(file_path)
                    elif filename.endswith('.ini'):
                        self._validate_ini_file(file_path)
                    elif filename.startswith('.env'):
                        self._validate_env_file(file_path)
                except Exception as e:
                    result.errors.append(f"Invalid {description}: {str(e)}")
                    result.is_valid = False
            else:
                if filename in ["pyproject.toml", "poetry.lock"]:
                    result.errors.append(f"Critical file missing: {filename}")
                    result.is_valid = False
                else:
                    result.warnings.append(f"Optional file missing: {filename}")
                result.details[f"backend_{filename.replace('.', '_')}"] = False
        
        # Check frontend configuration files
        frontend_files = [
            ("package.json", "Frontend dependency configuration"),
            ("pnpm-lock.yaml", "Frontend dependency lock file"),
            ("next.config.ts", "Next.js configuration"),
            ("tsconfig.json", "TypeScript configuration"),
            ("tailwind.config.js", "Tailwind CSS configuration")
        ]
        
        for filename, description in frontend_files:
            file_path = self.project_root / filename
            if file_path.exists():
                result.details[f"frontend_{filename.replace('.', '_').replace('-', '_')}"] = True
                try:
                    if filename.endswith('.json'):
                        self._validate_json_file(file_path)
                except Exception as e:
                    result.errors.append(f"Invalid {description}: {str(e)}")
                    result.is_valid = False
            else:
                if filename in ["package.json", "next.config.ts", "tsconfig.json"]:
                    result.errors.append(f"Critical file missing: {filename}")
                    result.is_valid = False
                else:
                    result.warnings.append(f"Optional file missing: {filename}")
                result.details[f"frontend_{filename.replace('.', '_').replace('-', '_')}"] = False
        
        return result

    def get_configuration_value(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value with environment-specific overrides.
        
        Args:
            key: Configuration key
            default: Default value if key not found
            
        Returns:
            Configuration value
        """
        # Check environment-specific override first
        env_key = f"{self.environment.value.upper()}_{key}"
        if env_key in self.config_data:
            return self.config_data[env_key]
        
        # Check standard key
        if key in self.config_data:
            return self.config_data[key]
        
        return default

    def set_configuration_value(self, key: str, value: Any) -> None:
        """
        Set a configuration value.
        
        Args:
            key: Configuration key
            value: Configuration value
        """
        self.config_data[key] = value

    def export_configuration(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """
        Export current configuration.
        
        Args:
            include_sensitive: Whether to include sensitive values
            
        Returns:
            Dictionary of configuration values
        """
        config = {}
        all_schemas = (
            self.BACKEND_CONFIG_SCHEMA + 
            self.FRONTEND_CONFIG_SCHEMA + 
            self.TEST_CONFIG_SCHEMA
        )
        
        for item in all_schemas:
            if item.sensitive and not include_sensitive:
                config[item.key] = "***REDACTED***" if item.key in self.config_data else None
            else:
                config[item.key] = self.get_configuration_value(item.key, item.default_value)
        
        return config

    def generate_env_template(self) -> str:
        """
        Generate a .env template file with all configuration options.
        
        Returns:
            String content for .env template
        """
        lines = []
        lines.append("# Medical Device Regulatory Assistant - Environment Configuration")
        lines.append("# Copy this file to .env.local and configure the values")
        lines.append("")
        
        # Group by schema
        schemas = [
            ("Backend Configuration", self.BACKEND_CONFIG_SCHEMA),
            ("Frontend Configuration", self.FRONTEND_CONFIG_SCHEMA),
            ("Test Configuration", self.TEST_CONFIG_SCHEMA)
        ]
        
        for section_name, schema in schemas:
            lines.append(f"# {section_name}")
            lines.append("#" + "=" * (len(section_name) + 2))
            
            for item in schema:
                lines.append("")
                lines.append(f"# {item.description}")
                if item.level == ConfigurationLevel.CRITICAL:
                    lines.append("# CRITICAL: Required for system to function")
                elif item.level == ConfigurationLevel.REQUIRED:
                    lines.append("# REQUIRED: Needed for proper operation")
                elif item.level == ConfigurationLevel.OPTIONAL:
                    lines.append("# OPTIONAL: Nice to have")
                
                if item.allowed_values:
                    lines.append(f"# Allowed values: {', '.join(map(str, item.allowed_values))}")
                
                if item.sensitive:
                    lines.append("# SENSITIVE: Keep this value secure")
                
                if item.default_value is not None:
                    lines.append(f"{item.key}={item.default_value}")
                else:
                    lines.append(f"# {item.key}=")
            
            lines.append("")
        
        return "\n".join(lines)

    def run_comprehensive_validation(self) -> Dict[str, ValidationResult]:
        """
        Run all configuration validations.
        
        Returns:
            Dictionary of validation results
        """
        results = {}
        
        results['backend_config'] = self.validate_backend_configuration()
        results['frontend_config'] = self.validate_frontend_configuration()
        results['test_config'] = self.validate_test_configuration()
        results['config_files'] = self.validate_configuration_files()
        
        return results

    def print_validation_summary(self, results: Dict[str, ValidationResult]) -> bool:
        """
        Print a formatted summary of validation results.
        
        Args:
            results: Dictionary of validation results
            
        Returns:
            bool: True if all validations passed
        """
        print("=" * 60)
        print("CONFIGURATION VALIDATION SUMMARY")
        print("=" * 60)
        
        overall_valid = all(result.is_valid for result in results.values())
        status_icon = "✅" if overall_valid else "❌"
        print(f"\nOverall Status: {status_icon} {'VALID' if overall_valid else 'ISSUES FOUND'}")
        print(f"Environment: {self.environment.value.upper()}")
        
        for check_name, result in results.items():
            display_name = check_name.replace('_', ' ').title()
            print(f"\n{display_name}:")
            print(f"  Status: {'✅ Valid' if result.is_valid else '❌ Issues Found'}")
            
            if result.errors:
                print("  Errors:")
                for error in result.errors:
                    print(f"    ❌ {error}")
            
            if result.warnings:
                print("  Warnings:")
                for warning in result.warnings:
                    print(f"    ⚠️  {warning}")
            
            if result.recommendations:
                print("  Recommendations:")
                for rec in result.recommendations:
                    print(f"    🔧 {rec}")
        
        print("\n" + "=" * 60)
        return overall_valid

    def _load_configuration(self) -> Dict[str, Any]:
        """Load configuration from environment variables and files."""
        config = {}
        
        # Load from environment variables
        config.update(os.environ)
        
        # Load from .env files (in order of precedence)
        env_files = [
            f".env.{self.environment.value}",
            ".env.local",
            ".env"
        ]
        
        for env_file in env_files:
            env_path = self.project_root / env_file
            if env_path.exists():
                config.update(self._load_env_file(env_path))
        
        return config

    def _validate_configuration_schema(
        self, 
        schema: List[ConfigurationItem], 
        schema_name: str
    ) -> ValidationResult:
        """Validate configuration against a schema."""
        result = ValidationResult(is_valid=True)
        result.details['schema_name'] = schema_name
        result.details['validated_items'] = []
        
        for item in schema:
            value = self.get_configuration_value(item.key)
            item_result = {
                'key': item.key,
                'level': item.level.value,
                'has_value': value is not None,
                'is_valid': True
            }
            
            if value is None:
                if item.level == ConfigurationLevel.CRITICAL:
                    result.errors.append(f"Critical configuration missing: {item.key}")
                    result.is_valid = False
                    item_result['is_valid'] = False
                elif item.level == ConfigurationLevel.REQUIRED:
                    result.warnings.append(f"Required configuration missing: {item.key}")
                    result.recommendations.append(f"Set {item.key} in your environment")
                elif item.level == ConfigurationLevel.OPTIONAL:
                    result.details[f"{item.key}_status"] = "optional_missing"
            else:
                # Validate value if present
                if item.allowed_values and value not in item.allowed_values:
                    result.errors.append(
                        f"Invalid value for {item.key}: {value}. "
                        f"Allowed: {', '.join(map(str, item.allowed_values))}"
                    )
                    result.is_valid = False
                    item_result['is_valid'] = False
                
                # Store value (redacted if sensitive)
                if item.sensitive:
                    item_result['value'] = "***REDACTED***"
                else:
                    item_result['value'] = value
            
            result.details['validated_items'].append(item_result)
        
        return result

    def _load_env_file(self, file_path: Path) -> Dict[str, str]:
        """Load environment variables from a file."""
        env_vars = {}
        try:
            with open(file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        if '=' in line:
                            key, value = line.split('=', 1)
                            env_vars[key.strip()] = value.strip()
        except Exception as e:
            self.logger.warning(f"Could not load env file {file_path}: {e}")
        
        return env_vars

    def _validate_toml_file(self, file_path: Path) -> None:
        """Validate a TOML file."""
        try:
            if sys.version_info >= (3, 11):
                import tomllib
                with open(file_path, 'rb') as f:
                    tomllib.load(f)
            else:
                # Basic validation - just check if file is readable
                with open(file_path, 'r') as f:
                    f.read()
        except Exception as e:
            raise ValueError(f"Invalid TOML file: {e}")

    def _validate_json_file(self, file_path: Path) -> None:
        """Validate a JSON file."""
        try:
            with open(file_path, 'r') as f:
                json.load(f)
        except Exception as e:
            raise ValueError(f"Invalid JSON file: {e}")

    def _validate_ini_file(self, file_path: Path) -> None:
        """Validate an INI file."""
        try:
            import configparser
            config = configparser.ConfigParser()
            config.read(file_path)
        except Exception as e:
            raise ValueError(f"Invalid INI file: {e}")

    def _validate_env_file(self, file_path: Path) -> None:
        """Validate an environment file."""
        try:
            with open(file_path, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if line and not line.startswith('#'):
                        if '=' not in line:
                            raise ValueError(f"Invalid format at line {line_num}: {line}")
        except Exception as e:
            raise ValueError(f"Invalid environment file: {e}")


# Convenience functions
def validate_configuration(environment: EnvironmentType = EnvironmentType.DEVELOPMENT) -> bool:
    """
    Quick configuration validation function.
    
    Args:
        environment: Target environment type
        
    Returns:
        bool: True if configuration is valid
    """
    manager = ConfigurationManager(environment)
    results = manager.run_comprehensive_validation()
    return manager.print_validation_summary(results)


def generate_env_template(output_path: Optional[Path] = None) -> str:
    """
    Generate environment template file.
    
    Args:
        output_path: Optional path to write template file
        
    Returns:
        str: Template content
    """
    manager = ConfigurationManager()
    template = manager.generate_env_template()
    
    if output_path:
        with open(output_path, 'w') as f:
            f.write(template)
        print(f"Environment template written to: {output_path}")
    
    return template


if __name__ == "__main__":
    # Run validation when script is executed directly
    import argparse
    
    parser = argparse.ArgumentParser(description="Configuration Management System")
    parser.add_argument(
        "--environment", 
        choices=[e.value for e in EnvironmentType],
        default=EnvironmentType.DEVELOPMENT.value,
        help="Target environment"
    )
    parser.add_argument(
        "--generate-template",
        action="store_true",
        help="Generate .env template file"
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Output path for generated template"
    )
    
    args = parser.parse_args()
    
    if args.generate_template:
        output_path = args.output or Path(".env.template")
        generate_env_template(output_path)
    else:
        environment = EnvironmentType(args.environment)
        is_valid = validate_configuration(environment)
        sys.exit(0 if is_valid else 1)