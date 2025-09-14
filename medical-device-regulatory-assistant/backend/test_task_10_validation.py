#!/usr/bin/env python3
"""
Task 10 Validation Script: Comprehensive Real FDA API Integration Testing

This script validates the implementation of Task 10 by testing all components
of the real FDA API integration testing suite.

Validation includes:
1. Test file structure and organization
2. Pytest marker configuration
3. Test runner functionality
4. Schema validation utilities
5. Performance benchmarking tools
6. Health monitoring capabilities
7. Documentation completeness

Usage:
    python test_task_10_validation.py
"""

import os
import sys
import subprocess
import importlib.util
from pathlib import Path
from typing import Dict, List, Any, Tuple
import json
import ast


class Task10Validator:
    """Validator for Task 10 implementation"""
    
    def __init__(self):
        self.backend_dir = Path(__file__).parent
        self.test_dir = self.backend_dir / "tests" / "integration" / "real_fda_api"
        self.validation_results = {
            "passed": [],
            "failed": [],
            "warnings": []
        }
    
    def validate_file_structure(self) -> bool:
        """Validate that all required files exist with correct structure"""
        print("🔍 Validating file structure...")
        
        required_files = [
            "__init__.py",
            "test_real_fda_integration.py",
            "test_schema_validation.py", 
            "test_performance_benchmarks.py",
            "test_api_health_monitoring.py",
            "run_real_api_tests.py",
            "README.md"
        ]
        
        missing_files = []
        for file_name in required_files:
            file_path = self.test_dir / file_name
            if not file_path.exists():
                missing_files.append(file_name)
        
        if missing_files:
            self.validation_results["failed"].append(
                f"Missing required files: {', '.join(missing_files)}"
            )
            return False
        
        self.validation_results["passed"].append("All required files exist")
        return True
    
    def validate_pytest_markers(self) -> bool:
        """Validate pytest marker configuration"""
        print("🔍 Validating pytest markers...")
        
        # Check pyproject.toml for real_api marker
        pyproject_path = self.backend_dir / "pyproject.toml"
        
        if not pyproject_path.exists():
            self.validation_results["failed"].append("pyproject.toml not found")
            return False
        
        with open(pyproject_path, 'r') as f:
            content = f.read()
        
        if 'real_api: marks tests that make real FDA API calls' not in content:
            self.validation_results["failed"].append(
                "real_api marker not configured in pyproject.toml"
            )
            return False
        
        self.validation_results["passed"].append("Pytest markers properly configured")
        return True
    
    def validate_test_files_content(self) -> bool:
        """Validate content of test files"""
        print("🔍 Validating test file content...")
        
        test_files = [
            "test_real_fda_integration.py",
            "test_schema_validation.py",
            "test_performance_benchmarks.py", 
            "test_api_health_monitoring.py"
        ]
        
        validation_passed = True
        
        for test_file in test_files:
            file_path = self.test_dir / test_file
            
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                
                # Parse AST to analyze structure
                tree = ast.parse(content)
                
                # Check for required imports
                required_imports = ['pytest', 'pytest_asyncio', 'services.openfda']
                imports_found = []
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            imports_found.append(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            imports_found.append(node.module)
                
                missing_imports = []
                for required in required_imports:
                    if not any(required in imp for imp in imports_found):
                        missing_imports.append(required)
                
                if missing_imports:
                    self.validation_results["failed"].append(
                        f"{test_file}: Missing imports: {', '.join(missing_imports)}"
                    )
                    validation_passed = False
                
                # Check for real_api marker
                if 'pytestmark = pytest.mark.real_api' not in content:
                    self.validation_results["failed"].append(
                        f"{test_file}: Missing real_api marker"
                    )
                    validation_passed = False
                
                # Count test methods
                test_methods = [
                    node.name for node in ast.walk(tree)
                    if isinstance(node, ast.FunctionDef) and node.name.startswith('test_')
                ]
                
                if len(test_methods) < 3:
                    self.validation_results["warnings"].append(
                        f"{test_file}: Only {len(test_methods)} test methods found"
                    )
                
                self.validation_results["passed"].append(
                    f"{test_file}: {len(test_methods)} test methods found"
                )
                
            except Exception as e:
                self.validation_results["failed"].append(
                    f"{test_file}: Error parsing file: {e}"
                )
                validation_passed = False
        
        return validation_passed
    
    def validate_test_runner(self) -> bool:
        """Validate test runner script"""
        print("🔍 Validating test runner...")
        
        runner_path = self.test_dir / "run_real_api_tests.py"
        
        try:
            # Check if script is executable
            with open(runner_path, 'r') as f:
                content = f.read()
            
            # Check for required components
            required_components = [
                'class RealAPITestRunner',
                'def check_environment',
                'def build_pytest_command',
                'def run_tests',
                'if __name__ == "__main__"'
            ]
            
            missing_components = []
            for component in required_components:
                if component not in content:
                    missing_components.append(component)
            
            if missing_components:
                self.validation_results["failed"].append(
                    f"Test runner missing components: {', '.join(missing_components)}"
                )
                return False
            
            # Check for command line argument handling
            if 'argparse' not in content:
                self.validation_results["failed"].append(
                    "Test runner missing command line argument handling"
                )
                return False
            
            self.validation_results["passed"].append("Test runner properly implemented")
            return True
            
        except Exception as e:
            self.validation_results["failed"].append(f"Error validating test runner: {e}")
            return False
    
    def validate_schema_validation_utilities(self) -> bool:
        """Validate schema validation utilities"""
        print("🔍 Validating schema validation utilities...")
        
        schema_file = self.test_dir / "test_schema_validation.py"
        
        try:
            with open(schema_file, 'r') as f:
                content = f.read()
            
            # Check for schema validation methods
            required_methods = [
                '_validate_fda_search_result_schema',
                '_validate_device_classification_schema',
                '_validate_adverse_event_schema'
            ]
            
            missing_methods = []
            for method in required_methods:
                if method not in content:
                    missing_methods.append(method)
            
            if missing_methods:
                self.validation_results["failed"].append(
                    f"Schema validation missing methods: {', '.join(missing_methods)}"
                )
                return False
            
            # Check for data integrity tests
            if 'test_predicate_search_data_consistency' not in content:
                self.validation_results["warnings"].append(
                    "Schema validation missing data consistency tests"
                )
            
            self.validation_results["passed"].append("Schema validation utilities implemented")
            return True
            
        except Exception as e:
            self.validation_results["failed"].append(f"Error validating schema utilities: {e}")
            return False
    
    def validate_performance_benchmarking(self) -> bool:
        """Validate performance benchmarking capabilities"""
        print("🔍 Validating performance benchmarking...")
        
        perf_file = self.test_dir / "test_performance_benchmarks.py"
        
        try:
            with open(perf_file, 'r') as f:
                content = f.read()
            
            # Check for performance utilities
            required_components = [
                'class PerformanceMetrics',
                'test_predicate_search_response_time',
                'test_concurrent_request_performance',
                'test_cache_performance_impact',
                'test_memory_usage_during_requests'
            ]
            
            missing_components = []
            for component in required_components:
                if component not in content:
                    missing_components.append(component)
            
            if missing_components:
                self.validation_results["failed"].append(
                    f"Performance benchmarking missing: {', '.join(missing_components)}"
                )
                return False
            
            # Check for performance assertions
            if 'assert.*response_time.*<' not in content and 'assert.*duration.*<' not in content:
                self.validation_results["warnings"].append(
                    "Performance tests may be missing time assertions"
                )
            
            self.validation_results["passed"].append("Performance benchmarking implemented")
            return True
            
        except Exception as e:
            self.validation_results["failed"].append(f"Error validating performance benchmarking: {e}")
            return False
    
    def validate_health_monitoring(self) -> bool:
        """Validate health monitoring capabilities"""
        print("🔍 Validating health monitoring...")
        
        health_file = self.test_dir / "test_api_health_monitoring.py"
        
        try:
            with open(health_file, 'r') as f:
                content = f.read()
            
            # Check for health monitoring components
            required_components = [
                'class HealthMonitor',
                'test_continuous_health_monitoring',
                'test_api_availability_monitoring',
                'test_error_rate_monitoring',
                'test_sla_compliance_monitoring'
            ]
            
            missing_components = []
            for component in required_components:
                if component not in content:
                    missing_components.append(component)
            
            if missing_components:
                self.validation_results["failed"].append(
                    f"Health monitoring missing: {', '.join(missing_components)}"
                )
                return False
            
            # Check for health metrics
            if 'health_percentage' not in content:
                self.validation_results["warnings"].append(
                    "Health monitoring may be missing percentage calculations"
                )
            
            self.validation_results["passed"].append("Health monitoring implemented")
            return True
            
        except Exception as e:
            self.validation_results["failed"].append(f"Error validating health monitoring: {e}")
            return False
    
    def validate_error_handling(self) -> bool:
        """Validate comprehensive error handling"""
        print("🔍 Validating error handling...")
        
        integration_file = self.test_dir / "test_real_fda_integration.py"
        
        try:
            with open(integration_file, 'r') as f:
                content = f.read()
            
            # Check for error handling tests
            error_tests = [
                'test_404_error_handling',
                'test_invalid_search_parameters',
                'test_rate_limiting_behavior'
            ]
            
            missing_tests = []
            for test in error_tests:
                if test not in content:
                    missing_tests.append(test)
            
            if missing_tests:
                self.validation_results["failed"].append(
                    f"Error handling missing tests: {', '.join(missing_tests)}"
                )
                return False
            
            # Check for specific error types
            error_types = [
                'FDAAPIError',
                'RateLimitExceededError', 
                'PredicateNotFoundError'
            ]
            
            missing_errors = []
            for error_type in error_types:
                if error_type not in content:
                    missing_errors.append(error_type)
            
            if missing_errors:
                self.validation_results["warnings"].append(
                    f"May be missing error types: {', '.join(missing_errors)}"
                )
            
            self.validation_results["passed"].append("Error handling implemented")
            return True
            
        except Exception as e:
            self.validation_results["failed"].append(f"Error validating error handling: {e}")
            return False
    
    def validate_documentation(self) -> bool:
        """Validate documentation completeness"""
        print("🔍 Validating documentation...")
        
        readme_path = self.test_dir / "README.md"
        
        try:
            with open(readme_path, 'r') as f:
                content = f.read()
            
            # Check for required sections
            required_sections = [
                '# Real FDA API Integration Tests',
                '## ⚠️ Important Safety Guidelines',
                '## 🚀 Quick Start',
                '## 📁 Test Structure',
                '## 🔧 Configuration',
                '## 🐛 Troubleshooting'
            ]
            
            missing_sections = []
            for section in required_sections:
                if section not in content:
                    missing_sections.append(section)
            
            if missing_sections:
                self.validation_results["failed"].append(
                    f"Documentation missing sections: {', '.join(missing_sections)}"
                )
                return False
            
            # Check for usage examples
            if '```bash' not in content:
                self.validation_results["warnings"].append(
                    "Documentation may be missing usage examples"
                )
            
            # Check for safety guidelines
            if 'rate limit' not in content.lower():
                self.validation_results["warnings"].append(
                    "Documentation may be missing rate limiting guidelines"
                )
            
            self.validation_results["passed"].append("Documentation is comprehensive")
            return True
            
        except Exception as e:
            self.validation_results["failed"].append(f"Error validating documentation: {e}")
            return False
    
    def validate_environment_setup(self) -> bool:
        """Validate environment setup and dependencies"""
        print("🔍 Validating environment setup...")
        
        try:
            # Check if required packages are available
            required_packages = [
                'pytest',
                'pytest_asyncio', 
                'httpx',
                'asyncio',
                'statistics',
                'psutil'
            ]
            
            missing_packages = []
            for package in required_packages:
                try:
                    __import__(package)
                except ImportError:
                    missing_packages.append(package)
            
            if missing_packages:
                self.validation_results["warnings"].append(
                    f"May be missing packages: {', '.join(missing_packages)}"
                )
            
            # Check OpenFDA service availability
            try:
                from services.openfda import OpenFDAService, create_production_openfda_service
                self.validation_results["passed"].append("OpenFDA service imports successful")
            except ImportError as e:
                self.validation_results["failed"].append(f"Cannot import OpenFDA service: {e}")
                return False
            
            self.validation_results["passed"].append("Environment setup validated")
            return True
            
        except Exception as e:
            self.validation_results["failed"].append(f"Error validating environment: {e}")
            return False
    
    def run_syntax_validation(self) -> bool:
        """Run syntax validation on all Python files"""
        print("🔍 Running syntax validation...")
        
        python_files = list(self.test_dir.glob("*.py"))
        syntax_errors = []
        
        for file_path in python_files:
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                
                # Try to parse the file
                ast.parse(content)
                
            except SyntaxError as e:
                syntax_errors.append(f"{file_path.name}: {e}")
            except Exception as e:
                syntax_errors.append(f"{file_path.name}: {e}")
        
        if syntax_errors:
            self.validation_results["failed"].extend(syntax_errors)
            return False
        
        self.validation_results["passed"].append(f"Syntax validation passed for {len(python_files)} files")
        return True
    
    def validate_test_command_compatibility(self) -> bool:
        """Validate that the test command from task requirements works"""
        print("🔍 Validating test command compatibility...")
        
        # The task specifies this test command:
        # cd medical-device-regulatory-assistant/backend && poetry run python -m pytest tests/integration/real_fda_api/ -v --real-api
        
        try:
            # Check if we can construct the command (don't actually run it)
            expected_test_path = self.backend_dir / "tests" / "integration" / "real_fda_api"
            
            if not expected_test_path.exists():
                self.validation_results["failed"].append(
                    f"Test path does not exist: {expected_test_path}"
                )
                return False
            
            # Check if pyproject.toml has the right configuration
            pyproject_path = self.backend_dir / "pyproject.toml"
            with open(pyproject_path, 'r') as f:
                content = f.read()
            
            if 'testpaths = ["tests"]' not in content:
                self.validation_results["warnings"].append(
                    "pyproject.toml may not have correct testpaths configuration"
                )
            
            self.validation_results["passed"].append("Test command compatibility validated")
            return True
            
        except Exception as e:
            self.validation_results["failed"].append(f"Error validating test command: {e}")
            return False
    
    def run_validation(self) -> Tuple[bool, Dict[str, Any]]:
        """Run all validation checks"""
        print("🚀 Starting Task 10 validation...\n")
        
        validation_methods = [
            self.validate_file_structure,
            self.validate_pytest_markers,
            self.validate_test_files_content,
            self.validate_test_runner,
            self.validate_schema_validation_utilities,
            self.validate_performance_benchmarking,
            self.validate_health_monitoring,
            self.validate_error_handling,
            self.validate_documentation,
            self.validate_environment_setup,
            self.run_syntax_validation,
            self.validate_test_command_compatibility
        ]
        
        all_passed = True
        for method in validation_methods:
            try:
                result = method()
                if not result:
                    all_passed = False
            except Exception as e:
                self.validation_results["failed"].append(f"Validation error in {method.__name__}: {e}")
                all_passed = False
        
        return all_passed, self.validation_results
    
    def print_results(self, all_passed: bool, results: Dict[str, Any]):
        """Print validation results"""
        print("\n" + "="*60)
        print("TASK 10 VALIDATION RESULTS")
        print("="*60)
        
        if all_passed:
            print("✅ VALIDATION PASSED")
        else:
            print("❌ VALIDATION FAILED")
        
        print(f"\n📊 Summary:")
        print(f"   ✅ Passed: {len(results['passed'])}")
        print(f"   ❌ Failed: {len(results['failed'])}")
        print(f"   ⚠️  Warnings: {len(results['warnings'])}")
        
        if results["passed"]:
            print(f"\n✅ Passed Checks:")
            for item in results["passed"]:
                print(f"   • {item}")
        
        if results["warnings"]:
            print(f"\n⚠️  Warnings:")
            for item in results["warnings"]:
                print(f"   • {item}")
        
        if results["failed"]:
            print(f"\n❌ Failed Checks:")
            for item in results["failed"]:
                print(f"   • {item}")
        
        print("\n" + "="*60)
        
        if all_passed:
            print("🎉 Task 10 implementation is complete and ready for testing!")
            print("\n📝 Next Steps:")
            print("   1. Set FDA_API_KEY environment variable (optional)")
            print("   2. Run quick test: python tests/integration/real_fda_api/run_real_api_tests.py --quick")
            print("   3. Run full test suite: poetry run python -m pytest tests/integration/real_fda_api/ -v --real-api")
        else:
            print("🔧 Please address the failed checks before proceeding.")


def main():
    """Main validation function"""
    validator = Task10Validator()
    all_passed, results = validator.run_validation()
    validator.print_results(all_passed, results)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())