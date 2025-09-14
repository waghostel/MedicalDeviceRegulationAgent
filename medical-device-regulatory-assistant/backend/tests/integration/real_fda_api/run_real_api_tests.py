#!/usr/bin/env python3
"""
Real FDA API Test Runner

This script provides a convenient way to run real FDA API integration tests
with proper configuration and safety checks.

Usage:
    python run_real_api_tests.py [options]

Options:
    --all                   Run all real API tests
    --health-only          Run only health monitoring tests
    --performance-only     Run only performance tests
    --schema-only          Run only schema validation tests
    --quick                Run a quick subset of tests
    --with-benchmarks      Include performance benchmarking
    --verbose              Verbose output
    --dry-run              Show what would be run without executing

Environment Variables:
    FDA_API_KEY            FDA API key (optional but recommended)
    USE_REAL_FDA_API       Set to 'true' to enable real API calls
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path
from typing import List, Dict, Any
import json


class RealAPITestRunner:
    """Test runner for real FDA API integration tests"""
    
    def __init__(self):
        self.backend_dir = Path(__file__).parent.parent.parent.parent
        self.test_dir = Path(__file__).parent
        self.verbose = False
        self.dry_run = False
    
    def check_environment(self) -> Dict[str, Any]:
        """Check environment configuration for real API testing"""
        env_status = {
            "fda_api_key_configured": bool(os.getenv("FDA_API_KEY")),
            "real_api_enabled": os.getenv("USE_REAL_FDA_API", "false").lower() == "true",
            "poetry_available": self._check_poetry(),
            "network_available": self._check_network(),
            "warnings": [],
            "errors": []
        }
        
        # Check for potential issues
        if not env_status["fda_api_key_configured"]:
            env_status["warnings"].append(
                "FDA_API_KEY not configured - tests may hit rate limits faster"
            )
        
        if not env_status["poetry_available"]:
            env_status["errors"].append("Poetry not available - required for running tests")
        
        if not env_status["network_available"]:
            env_status["errors"].append("Network connection to api.fda.gov not available")
        
        return env_status
    
    def _check_poetry(self) -> bool:
        """Check if Poetry is available"""
        try:
            result = subprocess.run(
                ["poetry", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def _check_network(self) -> bool:
        """Check network connectivity to FDA API"""
        try:
            import socket
            socket.create_connection(("api.fda.gov", 443), timeout=5)
            return True
        except OSError:
            return False
    
    def build_pytest_command(self, test_selection: str, options: Dict[str, Any]) -> List[str]:
        """Build pytest command with appropriate options"""
        cmd = ["poetry", "run", "python", "-m", "pytest"]
        
        # Add test directory/files based on selection
        if test_selection == "all":
            cmd.append(str(self.test_dir))
        elif test_selection == "health":
            cmd.append(str(self.test_dir / "test_api_health_monitoring.py"))
        elif test_selection == "performance":
            cmd.append(str(self.test_dir / "test_performance_benchmarks.py"))
        elif test_selection == "schema":
            cmd.append(str(self.test_dir / "test_schema_validation.py"))
        elif test_selection == "integration":
            cmd.append(str(self.test_dir / "test_real_fda_integration.py"))
        elif test_selection == "quick":
            # Quick subset of tests
            cmd.extend([
                str(self.test_dir / "test_real_fda_integration.py::TestRealFDAAPIIntegration::test_real_predicate_search_with_validation"),
                str(self.test_dir / "test_api_health_monitoring.py::TestFDAAPIHealthMonitoring::test_api_availability_monitoring"),
                str(self.test_dir / "test_schema_validation.py::TestFDAAPISchemaValidation::test_predicate_search_response_schema")
            ])
        
        # Add real-api marker
        cmd.extend(["-m", "real_api"])
        
        # Add verbosity
        if options.get("verbose", False):
            cmd.append("-v")
        else:
            cmd.append("-q")
        
        # Add other pytest options
        cmd.extend([
            "--tb=short",  # Shorter traceback format
            "--strict-markers",
            "--strict-config"
        ])
        
        # Add performance options if requested
        if options.get("with_benchmarks", False):
            cmd.extend([
                "--benchmark-only",
                "--benchmark-sort=mean"
            ])
        
        # Add coverage if requested
        if options.get("with_coverage", False):
            cmd.extend([
                "--cov=services.openfda",
                "--cov-report=term-missing"
            ])
        
        return cmd
    
    def run_tests(self, test_selection: str, options: Dict[str, Any]) -> int:
        """Run the selected tests"""
        # Check environment first
        env_status = self.check_environment()
        
        if env_status["errors"]:
            print("❌ Environment check failed:")
            for error in env_status["errors"]:
                print(f"   {error}")
            return 1
        
        if env_status["warnings"]:
            print("⚠️  Environment warnings:")
            for warning in env_status["warnings"]:
                print(f"   {warning}")
            print()
        
        # Build command
        cmd = self.build_pytest_command(test_selection, options)
        
        if self.dry_run:
            print("🔍 Dry run - would execute:")
            print(f"   {' '.join(cmd)}")
            return 0
        
        # Set environment variables for real API testing
        env = os.environ.copy()
        env["USE_REAL_FDA_API"] = "true"
        
        print(f"🚀 Running real FDA API tests: {test_selection}")
        print(f"📁 Working directory: {self.backend_dir}")
        print(f"🔧 Command: {' '.join(cmd[2:])}")  # Skip 'poetry run'
        print()
        
        # Run tests
        try:
            result = subprocess.run(
                cmd,
                cwd=self.backend_dir,
                env=env,
                text=True
            )
            return result.returncode
            
        except KeyboardInterrupt:
            print("\n⚠️  Tests interrupted by user")
            return 130
        except Exception as e:
            print(f"❌ Error running tests: {e}")
            return 1
    
    def print_usage_info(self):
        """Print usage information and safety guidelines"""
        print("""
🔬 Real FDA API Integration Tests

These tests make actual calls to the FDA's openFDA API and should be used carefully:

SAFETY GUIDELINES:
• Tests respect FDA rate limits (240 requests/minute)
• Use FDA_API_KEY environment variable to avoid rate limiting
• Tests include delays between requests to be respectful
• Run sparingly to avoid hitting API limits

ENVIRONMENT SETUP:
• Set FDA_API_KEY for better rate limits (optional)
• Ensure network connectivity to api.fda.gov
• Tests will automatically set USE_REAL_FDA_API=true

TEST CATEGORIES:
• Integration: Basic API functionality and error handling
• Schema: Response validation and data integrity
• Performance: Response times and throughput
• Health: Availability monitoring and SLA compliance

EXAMPLES:
• Quick test:        python run_real_api_tests.py --quick
• Health only:       python run_real_api_tests.py --health-only
• All tests:         python run_real_api_tests.py --all --verbose
• Performance:       python run_real_api_tests.py --performance-only --with-benchmarks
""")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Run real FDA API integration tests",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    # Test selection options
    test_group = parser.add_mutually_exclusive_group(required=True)
    test_group.add_argument("--all", action="store_true", help="Run all real API tests")
    test_group.add_argument("--health-only", action="store_true", help="Run only health monitoring tests")
    test_group.add_argument("--performance-only", action="store_true", help="Run only performance tests")
    test_group.add_argument("--schema-only", action="store_true", help="Run only schema validation tests")
    test_group.add_argument("--integration-only", action="store_true", help="Run only integration tests")
    test_group.add_argument("--quick", action="store_true", help="Run a quick subset of tests")
    test_group.add_argument("--info", action="store_true", help="Show usage information")
    
    # Additional options
    parser.add_argument("--with-benchmarks", action="store_true", help="Include performance benchmarking")
    parser.add_argument("--with-coverage", action="store_true", help="Include code coverage")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be run without executing")
    
    args = parser.parse_args()
    
    runner = RealAPITestRunner()
    runner.verbose = args.verbose
    runner.dry_run = args.dry_run
    
    if args.info:
        runner.print_usage_info()
        return 0
    
    # Determine test selection
    if args.all:
        test_selection = "all"
    elif args.health_only:
        test_selection = "health"
    elif args.performance_only:
        test_selection = "performance"
    elif args.schema_only:
        test_selection = "schema"
    elif args.integration_only:
        test_selection = "integration"
    elif args.quick:
        test_selection = "quick"
    else:
        print("❌ No test selection specified")
        return 1
    
    # Build options
    options = {
        "verbose": args.verbose,
        "with_benchmarks": args.with_benchmarks,
        "with_coverage": args.with_coverage
    }
    
    # Run tests
    return runner.run_tests(test_selection, options)


if __name__ == "__main__":
    sys.exit(main())