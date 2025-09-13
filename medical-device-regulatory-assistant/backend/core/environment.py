"""
Environment validation module for Medical Device Regulatory Assistant.

This module provides comprehensive validation of the Python development environment,
including Python version, Poetry installation, required packages, and system dependencies.
"""

import sys
import subprocess
import importlib
import platform
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import json

# FDA API Configuration
FDA_API_KEY = os.getenv("FDA_API_KEY")
USE_REAL_FDA_API = os.getenv("USE_REAL_FDA_API", "false").lower() == "true"


@dataclass
class ValidationResult:
    """Result of environment validation check."""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    recommendations: List[str]
    details: Dict[str, Any]


class EnvironmentValidator:
    """Validates Python development environment for the Medical Device Regulatory Assistant."""
    
    # Required versions and packages
    REQUIRED_PYTHON_VERSION = (3, 11)
    MAX_PYTHON_VERSION = (3, 13)
    
    # Mapping of package names to their import names
    PACKAGE_IMPORT_MAP = {
        'python-dotenv': 'dotenv',
        'python-jose': 'jose',
        'python-multipart': 'multipart',
        'beautifulsoup4': 'bs4',
        'pillow': 'PIL'
    }
    
    REQUIRED_PACKAGES = [
        'fastapi',
        'uvicorn',
        'pydantic',
        'sqlalchemy',
        'aiosqlite',
        'httpx',
        'langchain',
        'langgraph',
        'pytest',
        'dotenv',  # python-dotenv imports as 'dotenv'
        'psutil'
    ]
    
    OPTIONAL_PACKAGES = [
        'redis',
        'celery',
        'reportlab',
        'pytesseract',
        'spacy',
        'nltk'
    ]
    
    REQUIRED_ENV_VARS = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET'
    ]
    
    OPTIONAL_ENV_VARS = [
        'REDIS_URL',
        'FDA_API_KEY',
        'USE_REAL_FDA_API',
        'OPENAI_API_KEY'
    ]

    def __init__(self):
        """Initialize the environment validator."""
        self.project_root = Path(__file__).parent.parent
        self.pyproject_path = self.project_root / "pyproject.toml"
        self.poetry_lock_path = self.project_root / "poetry.lock"

    def validate_python_environment(self) -> ValidationResult:
        """
        Validate Python version and basic environment setup.
        
        Returns:
            ValidationResult: Comprehensive validation results
        """
        errors = []
        warnings = []
        recommendations = []
        details = {}
        
        # Check Python version
        python_version = sys.version_info[:2]
        details['python_version'] = f"{python_version[0]}.{python_version[1]}"
        details['python_executable'] = sys.executable
        details['platform'] = platform.platform()
        
        if python_version < self.REQUIRED_PYTHON_VERSION:
            errors.append(
                f"Python {'.'.join(map(str, self.REQUIRED_PYTHON_VERSION))}+ required, "
                f"found {'.'.join(map(str, python_version))}"
            )
            recommendations.append(
                f"Install Python {'.'.join(map(str, self.REQUIRED_PYTHON_VERSION))} or higher"
            )
        elif python_version > self.MAX_PYTHON_VERSION:
            warnings.append(
                f"Python {'.'.join(map(str, python_version))} may not be fully supported. "
                f"Recommended: Python {'.'.join(map(str, self.REQUIRED_PYTHON_VERSION))}-"
                f"{'.'.join(map(str, self.MAX_PYTHON_VERSION))}"
            )
        
        # Check Poetry installation
        poetry_result = self._check_poetry_installation()
        details.update(poetry_result['details'])
        errors.extend(poetry_result['errors'])
        warnings.extend(poetry_result['warnings'])
        recommendations.extend(poetry_result['recommendations'])
        
        # Check project files
        project_files_result = self._check_project_files()
        details.update(project_files_result['details'])
        errors.extend(project_files_result['errors'])
        warnings.extend(project_files_result['warnings'])
        recommendations.extend(project_files_result['recommendations'])
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            recommendations=recommendations,
            details=details
        )

    def validate_package_dependencies(self) -> ValidationResult:
        """
        Validate that required packages are installed and accessible.
        
        Returns:
            ValidationResult: Package validation results
        """
        errors = []
        warnings = []
        recommendations = []
        details = {
            'installed_packages': {},
            'missing_required': [],
            'missing_optional': []
        }
        
        # Check required packages
        for package in self.REQUIRED_PACKAGES:
            import_name = self.PACKAGE_IMPORT_MAP.get(package, package.replace('-', '_'))
            try:
                module = importlib.import_module(import_name)
                version = getattr(module, '__version__', 'unknown')
                details['installed_packages'][package] = version
            except ImportError:
                details['missing_required'].append(package)
                errors.append(f"Required package '{package}' not installed")
                recommendations.append(f"Install with: poetry add {package}")
        
        # Check optional packages
        for package in self.OPTIONAL_PACKAGES:
            import_name = self.PACKAGE_IMPORT_MAP.get(package, package.replace('-', '_'))
            try:
                module = importlib.import_module(import_name)
                version = getattr(module, '__version__', 'unknown')
                details['installed_packages'][package] = version
            except ImportError:
                details['missing_optional'].append(package)
                warnings.append(f"Optional package '{package}' not installed")
                recommendations.append(f"Consider installing: poetry add {package}")
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            recommendations=recommendations,
            details=details
        )

    def validate_database_connection(self) -> ValidationResult:
        """
        Validate database connectivity and basic schema.
        
        Returns:
            ValidationResult: Database validation results
        """
        errors = []
        warnings = []
        recommendations = []
        details = {}
        
        try:
            import aiosqlite
            import os
            
            # Check for database file or URL
            database_url = os.getenv('DATABASE_URL', 'sqlite:./medical_device_assistant.db')
            details['database_url'] = database_url
            
            if database_url.startswith('sqlite:'):
                db_path = database_url.replace('sqlite:', '')
                db_file = Path(db_path)
                
                if db_file.exists():
                    details['database_exists'] = True
                    details['database_size'] = db_file.stat().st_size
                else:
                    warnings.append(f"Database file not found: {db_path}")
                    recommendations.append("Run database migrations: poetry run alembic upgrade head")
                    details['database_exists'] = False
            else:
                warnings.append("Non-SQLite database detected - connection test not implemented")
                details['database_type'] = 'non-sqlite'
                
        except ImportError:
            errors.append("aiosqlite package not available for database validation")
            recommendations.append("Install database dependencies: poetry install")
        except Exception as e:
            warnings.append(f"Database validation failed: {str(e)}")
            details['database_error'] = str(e)
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            recommendations=recommendations,
            details=details
        )

    def validate_external_services(self) -> ValidationResult:
        """
        Validate external service connectivity and configuration.
        
        Returns:
            ValidationResult: External services validation results
        """
        errors = []
        warnings = []
        recommendations = []
        details = {
            'environment_variables': {},
            'service_connectivity': {}
        }
        
        import os
        
        # Check required environment variables
        for env_var in self.REQUIRED_ENV_VARS:
            value = os.getenv(env_var)
            if value:
                details['environment_variables'][env_var] = 'set'
            else:
                errors.append(f"Required environment variable '{env_var}' not set")
                recommendations.append(f"Set {env_var} in your .env file")
                details['environment_variables'][env_var] = 'missing'
        
        # Check optional environment variables
        for env_var in self.OPTIONAL_ENV_VARS:
            value = os.getenv(env_var)
            if value:
                details['environment_variables'][env_var] = 'set'
            else:
                warnings.append(f"Optional environment variable '{env_var}' not set")
                details['environment_variables'][env_var] = 'missing'
        
        # Test basic HTTP connectivity (for FDA API, etc.)
        try:
            import httpx
            # This is a basic connectivity test - not hitting actual APIs
            details['http_client_available'] = True
        except ImportError:
            errors.append("HTTP client (httpx) not available")
            recommendations.append("Install httpx: poetry add httpx")
            details['http_client_available'] = False
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            recommendations=recommendations,
            details=details
        )

    def generate_setup_instructions(self, validation_results: List[ValidationResult]) -> str:
        """
        Generate comprehensive setup instructions based on validation results.
        
        Args:
            validation_results: List of validation results from different checks
            
        Returns:
            str: Formatted setup instructions
        """
        instructions = []
        instructions.append("# Medical Device Regulatory Assistant - Environment Setup Instructions\n")
        
        # Collect all errors and recommendations
        all_errors = []
        all_recommendations = []
        
        for result in validation_results:
            all_errors.extend(result.errors)
            all_recommendations.extend(result.recommendations)
        
        if all_errors:
            instructions.append("## Critical Issues (Must Fix)")
            for i, error in enumerate(all_errors, 1):
                instructions.append(f"{i}. ❌ {error}")
            instructions.append("")
        
        if all_recommendations:
            instructions.append("## Recommended Actions")
            for i, rec in enumerate(set(all_recommendations), 1):  # Remove duplicates
                instructions.append(f"{i}. 🔧 {rec}")
            instructions.append("")
        
        # Add general setup instructions
        instructions.append("## General Setup Steps")
        instructions.append("1. Ensure Python 3.11+ is installed")
        instructions.append("2. Install Poetry: `pip install poetry`")
        instructions.append("3. Navigate to backend directory: `cd medical-device-regulatory-assistant/backend`")
        instructions.append("4. Install dependencies: `poetry install`")
        instructions.append("5. Copy .env.example to .env and configure variables")
        instructions.append("6. Run database migrations: `poetry run alembic upgrade head`")
        instructions.append("7. Run tests to verify setup: `poetry run pytest tests/ -v`")
        instructions.append("")
        
        instructions.append("## Verification")
        instructions.append("Run the environment validator again to confirm all issues are resolved:")
        instructions.append("```bash")
        instructions.append("poetry run python -c \"from backend.core.environment import EnvironmentValidator; ")
        instructions.append("validator = EnvironmentValidator(); ")
        instructions.append("result = validator.validate_python_environment(); ")
        instructions.append("print('Valid:', result.is_valid)\"")
        instructions.append("```")
        
        return "\n".join(instructions)

    def _check_poetry_installation(self) -> Dict[str, Any]:
        """Check Poetry installation and configuration."""
        errors = []
        warnings = []
        recommendations = []
        details = {}
        
        try:
            # Check Poetry command availability
            result = subprocess.run(
                ['poetry', '--version'], 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            
            if result.returncode == 0:
                details['poetry_version'] = result.stdout.strip()
                details['poetry_available'] = True
            else:
                errors.append("Poetry command failed")
                recommendations.append("Reinstall Poetry: pip install poetry")
                details['poetry_available'] = False
                
        except FileNotFoundError:
            errors.append("Poetry not found in PATH")
            recommendations.append("Install Poetry: pip install poetry")
            details['poetry_available'] = False
        except subprocess.TimeoutExpired:
            warnings.append("Poetry command timed out")
            details['poetry_timeout'] = True
        except Exception as e:
            warnings.append(f"Poetry check failed: {str(e)}")
            details['poetry_error'] = str(e)
        
        return {
            'errors': errors,
            'warnings': warnings,
            'recommendations': recommendations,
            'details': details
        }

    def _check_project_files(self) -> Dict[str, Any]:
        """Check essential project files exist."""
        errors = []
        warnings = []
        recommendations = []
        details = {}
        
        # Check pyproject.toml
        if self.pyproject_path.exists():
            details['pyproject_toml_exists'] = True
            try:
                # Try to parse the file
                if sys.version_info >= (3, 11):
                    import tomllib
                    with open(self.pyproject_path, 'rb') as f:
                        pyproject_data = tomllib.load(f)
                else:
                    try:
                        import tomli
                        with open(self.pyproject_path, 'rb') as f:
                            pyproject_data = tomli.load(f)
                    except ImportError:
                        # Fallback to basic file existence check
                        pyproject_data = {'tool': {'poetry': {'name': 'unknown'}}}
                        warnings.append("tomli not available - limited pyproject.toml validation")
                
                details['pyproject_toml_valid'] = True
                details['project_name'] = pyproject_data.get('tool', {}).get('poetry', {}).get('name', 'unknown')
            except Exception as e:
                errors.append(f"pyproject.toml is invalid: {str(e)}")
                details['pyproject_toml_valid'] = False
        else:
            errors.append("pyproject.toml not found in backend directory")
            recommendations.append("Ensure you're in the correct backend directory")
            details['pyproject_toml_exists'] = False
        
        # Check poetry.lock
        if self.poetry_lock_path.exists():
            details['poetry_lock_exists'] = True
        else:
            warnings.append("poetry.lock not found")
            recommendations.append("Run: poetry install")
            details['poetry_lock_exists'] = False
        
        # Check main.py
        main_py_path = self.project_root / "main.py"
        if main_py_path.exists():
            details['main_py_exists'] = True
        else:
            warnings.append("main.py not found")
            details['main_py_exists'] = False
        
        return {
            'errors': errors,
            'warnings': warnings,
            'recommendations': recommendations,
            'details': details
        }

    def run_comprehensive_validation(self) -> Dict[str, ValidationResult]:
        """
        Run all validation checks and return comprehensive results.
        
        Returns:
            Dict[str, ValidationResult]: Results from all validation checks
        """
        results = {}
        
        results['python_environment'] = self.validate_python_environment()
        results['package_dependencies'] = self.validate_package_dependencies()
        results['database_connection'] = self.validate_database_connection()
        results['external_services'] = self.validate_external_services()
        
        return results

    def print_validation_summary(self, results: Dict[str, ValidationResult]) -> None:
        """
        Print a formatted summary of validation results.
        
        Args:
            results: Dictionary of validation results
        """
        print("=" * 60)
        print("MEDICAL DEVICE REGULATORY ASSISTANT - ENVIRONMENT VALIDATION")
        print("=" * 60)
        
        overall_valid = all(result.is_valid for result in results.values())
        status_icon = "✅" if overall_valid else "❌"
        print(f"\nOverall Status: {status_icon} {'VALID' if overall_valid else 'ISSUES FOUND'}")
        
        for check_name, result in results.items():
            print(f"\n{check_name.replace('_', ' ').title()}:")
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


# Convenience function for quick validation
def validate_environment() -> bool:
    """
    Quick environment validation function.
    
    Returns:
        bool: True if environment is valid, False otherwise
    """
    validator = EnvironmentValidator()
    results = validator.run_comprehensive_validation()
    validator.print_validation_summary(results)
    
    return all(result.is_valid for result in results.values())


if __name__ == "__main__":
    # Run validation when script is executed directly
    is_valid = validate_environment()
    sys.exit(0 if is_valid else 1)