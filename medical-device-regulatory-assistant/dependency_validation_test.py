#!/usr/bin/env python3
"""
Dependency Resolution Validation Test for Task F1.3

This script validates that both frontend and backend dependencies are properly resolved
and creates baseline performance metrics for test execution.
"""

import subprocess
import time
import json
import sys
import os
from pathlib import Path
from typing import Dict, Any, List, Tuple


class DependencyValidator:
    """Validates dependency resolution and creates performance baselines"""
    
    def __init__(self):
        self.results = {
            "timestamp": time.time(),
            "frontend": {},
            "backend": {},
            "performance_baseline": {},
            "dependency_conflicts": [],
            "summary": {}
        }
        
    def run_command(self, command: List[str], cwd: str = None, timeout: int = 300) -> Tuple[int, str, str, float]:
        """Run a command and return exit code, stdout, stderr, and execution time"""
        start_time = time.time()
        try:
            result = subprocess.run(
                command,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            execution_time = time.time() - start_time
            return result.returncode, result.stdout, result.stderr, execution_time
        except subprocess.TimeoutExpired:
            execution_time = time.time() - start_time
            return -1, "", f"Command timed out after {timeout} seconds", execution_time
        except Exception as e:
            execution_time = time.time() - start_time
            return -1, "", str(e), execution_time

    def validate_frontend_dependencies(self) -> Dict[str, Any]:
        """Validate frontend dependencies and test execution"""
        print("🔍 Validating Frontend Dependencies...")
        
        frontend_results = {
            "dependency_check": {},
            "test_execution": {},
            "package_manager": "pnpm"
        }
        
        # Check if pnpm is available
        exit_code, stdout, stderr, exec_time = self.run_command(["pnpm", "--version"])
        frontend_results["dependency_check"]["pnpm_available"] = {
            "success": exit_code == 0,
            "version": stdout.strip() if exit_code == 0 else None,
            "error": stderr if exit_code != 0 else None
        }
        
        if exit_code != 0:
            print(f"❌ pnpm not available: {stderr}")
            return frontend_results
            
        # Check package.json exists
        package_json_path = Path("package.json")
        frontend_results["dependency_check"]["package_json_exists"] = package_json_path.exists()
        
        if not package_json_path.exists():
            print("❌ package.json not found")
            return frontend_results
            
        # Install dependencies
        print("📦 Installing frontend dependencies...")
        exit_code, stdout, stderr, exec_time = self.run_command(
            ["pnpm", "install"], 
            timeout=180
        )
        frontend_results["dependency_check"]["install"] = {
            "success": exit_code == 0,
            "execution_time": exec_time,
            "error": stderr if exit_code != 0 else None
        }
        
        if exit_code != 0:
            print(f"❌ Frontend dependency installation failed: {stderr}")
            return frontend_results
            
        print(f"✅ Frontend dependencies installed in {exec_time:.2f}s")
        
        # Run a quick test to check basic functionality
        print("🧪 Running frontend test validation...")
        exit_code, stdout, stderr, exec_time = self.run_command(
            ["pnpm", "test", "--testNamePattern=React19ErrorBoundary", "--maxWorkers=1", "--silent"],
            timeout=60
        )
        
        frontend_results["test_execution"]["basic_test"] = {
            "success": exit_code == 0,
            "execution_time": exec_time,
            "output": stdout,
            "error": stderr if exit_code != 0 else None
        }
        
        # Try to run a simple configuration test
        exit_code, stdout, stderr, exec_time = self.run_command(
            ["node", "-e", "console.log('Node.js working')"],
            timeout=10
        )
        
        frontend_results["test_execution"]["node_check"] = {
            "success": exit_code == 0,
            "execution_time": exec_time,
            "output": stdout.strip() if exit_code == 0 else None,
            "error": stderr if exit_code != 0 else None
        }
        
        return frontend_results

    def validate_backend_dependencies(self) -> Dict[str, Any]:
        """Validate backend dependencies and test execution"""
        print("🔍 Validating Backend Dependencies...")
        
        backend_results = {
            "dependency_check": {},
            "test_execution": {},
            "package_manager": "poetry"
        }
        
        # Change to backend directory
        backend_dir = Path("backend")
        if not backend_dir.exists():
            print("❌ Backend directory not found")
            backend_results["dependency_check"]["backend_dir_exists"] = False
            return backend_results
            
        backend_results["dependency_check"]["backend_dir_exists"] = True
        
        # Check if poetry is available
        exit_code, stdout, stderr, exec_time = self.run_command(["poetry", "--version"])
        backend_results["dependency_check"]["poetry_available"] = {
            "success": exit_code == 0,
            "version": stdout.strip() if exit_code == 0 else None,
            "error": stderr if exit_code != 0 else None
        }
        
        if exit_code != 0:
            print(f"❌ Poetry not available: {stderr}")
            return backend_results
            
        # Check pyproject.toml exists
        pyproject_path = backend_dir / "pyproject.toml"
        backend_results["dependency_check"]["pyproject_toml_exists"] = pyproject_path.exists()
        
        if not pyproject_path.exists():
            print("❌ pyproject.toml not found")
            return backend_results
            
        # Install dependencies
        print("📦 Installing backend dependencies...")
        exit_code, stdout, stderr, exec_time = self.run_command(
            ["poetry", "install"], 
            cwd=str(backend_dir),
            timeout=300
        )
        backend_results["dependency_check"]["install"] = {
            "success": exit_code == 0,
            "execution_time": exec_time,
            "error": stderr if exit_code != 0 else None
        }
        
        if exit_code != 0:
            print(f"❌ Backend dependency installation failed: {stderr}")
            return backend_results
            
        print(f"✅ Backend dependencies installed in {exec_time:.2f}s")
        
        # Test jsonschema import (Task F1.1 requirement)
        print("🧪 Testing jsonschema import...")
        exit_code, stdout, stderr, exec_time = self.run_command(
            ["poetry", "run", "python", "-c", "import jsonschema; print('jsonschema imported successfully')"],
            cwd=str(backend_dir),
            timeout=30
        )
        
        backend_results["test_execution"]["jsonschema_import"] = {
            "success": exit_code == 0,
            "execution_time": exec_time,
            "output": stdout.strip() if exit_code == 0 else None,
            "error": stderr if exit_code != 0 else None
        }
        
        if exit_code == 0:
            print(f"✅ jsonschema import successful")
        else:
            print(f"❌ jsonschema import failed: {stderr}")
            
        # Test basic Python functionality
        exit_code, stdout, stderr, exec_time = self.run_command(
            ["poetry", "run", "python", "-c", "print('Python environment working')"],
            cwd=str(backend_dir),
            timeout=30
        )
        
        backend_results["test_execution"]["python_check"] = {
            "success": exit_code == 0,
            "execution_time": exec_time,
            "output": stdout.strip() if exit_code == 0 else None,
            "error": stderr if exit_code != 0 else None
        }
        
        # Try to import core modules
        test_imports = [
            "fastapi",
            "sqlalchemy", 
            "pydantic",
            "pytest"
        ]
        
        for module in test_imports:
            exit_code, stdout, stderr, exec_time = self.run_command(
                ["poetry", "run", "python", "-c", f"import {module}; print('{module} imported successfully')"],
                cwd=str(backend_dir),
                timeout=30
            )
            
            backend_results["test_execution"][f"{module}_import"] = {
                "success": exit_code == 0,
                "execution_time": exec_time,
                "output": stdout.strip() if exit_code == 0 else None,
                "error": stderr if exit_code != 0 else None
            }
        
        return backend_results

    def create_performance_baseline(self) -> Dict[str, Any]:
        """Create baseline performance metrics"""
        print("📊 Creating Performance Baseline...")
        
        baseline = {
            "test_execution_times": {},
            "dependency_install_times": {},
            "system_info": {}
        }
        
        # System information
        try:
            import platform
            import psutil
            
            baseline["system_info"] = {
                "platform": platform.platform(),
                "python_version": platform.python_version(),
                "cpu_count": psutil.cpu_count(),
                "memory_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
                "memory_available_gb": round(psutil.virtual_memory().available / (1024**3), 2)
            }
        except ImportError:
            baseline["system_info"] = {"error": "psutil not available"}
            
        # Extract timing information from previous tests
        if "frontend" in self.results and "dependency_check" in self.results["frontend"]:
            install_time = self.results["frontend"]["dependency_check"].get("install", {}).get("execution_time")
            if install_time:
                baseline["dependency_install_times"]["frontend_pnpm"] = install_time
                
        if "backend" in self.results and "dependency_check" in self.results["backend"]:
            install_time = self.results["backend"]["dependency_check"].get("install", {}).get("execution_time")
            if install_time:
                baseline["dependency_install_times"]["backend_poetry"] = install_time
        
        return baseline

    def analyze_dependency_conflicts(self) -> List[Dict[str, Any]]:
        """Analyze and document dependency conflicts"""
        print("🔍 Analyzing Dependency Conflicts...")
        
        conflicts = []
        
        # Check frontend conflicts
        frontend_results = self.results.get("frontend", {})
        if not frontend_results.get("dependency_check", {}).get("install", {}).get("success", False):
            conflicts.append({
                "type": "frontend_install_failure",
                "description": "Frontend dependency installation failed",
                "error": frontend_results.get("dependency_check", {}).get("install", {}).get("error"),
                "severity": "high"
            })
            
        # Check backend conflicts
        backend_results = self.results.get("backend", {})
        if not backend_results.get("dependency_check", {}).get("install", {}).get("success", False):
            conflicts.append({
                "type": "backend_install_failure", 
                "description": "Backend dependency installation failed",
                "error": backend_results.get("dependency_check", {}).get("install", {}).get("error"),
                "severity": "high"
            })
            
        # Check for specific import failures
        backend_tests = backend_results.get("test_execution", {})
        for test_name, test_result in backend_tests.items():
            if test_name.endswith("_import") and not test_result.get("success", False):
                conflicts.append({
                    "type": "import_failure",
                    "description": f"Failed to import {test_name.replace('_import', '')}",
                    "error": test_result.get("error"),
                    "severity": "medium"
                })
                
        # Check for jsonschema specifically (Task F1.1)
        jsonschema_test = backend_tests.get("jsonschema_import", {})
        if not jsonschema_test.get("success", False):
            conflicts.append({
                "type": "jsonschema_missing",
                "description": "jsonschema dependency not properly installed (Task F1.1 requirement)",
                "error": jsonschema_test.get("error"),
                "severity": "high",
                "task_reference": "F1.1"
            })
        
        return conflicts

    def generate_summary(self) -> Dict[str, Any]:
        """Generate validation summary"""
        frontend_success = (
            self.results.get("frontend", {})
            .get("dependency_check", {})
            .get("install", {})
            .get("success", False)
        )
        
        backend_success = (
            self.results.get("backend", {})
            .get("dependency_check", {})
            .get("install", {})
            .get("success", False)
        )
        
        jsonschema_success = (
            self.results.get("backend", {})
            .get("test_execution", {})
            .get("jsonschema_import", {})
            .get("success", False)
        )
        
        total_conflicts = len(self.results.get("dependency_conflicts", []))
        
        return {
            "overall_status": "success" if frontend_success and backend_success and jsonschema_success else "failure",
            "frontend_dependencies": "resolved" if frontend_success else "failed",
            "backend_dependencies": "resolved" if backend_success else "failed", 
            "jsonschema_requirement": "satisfied" if jsonschema_success else "failed",
            "total_conflicts": total_conflicts,
            "critical_conflicts": len([c for c in self.results.get("dependency_conflicts", []) if c.get("severity") == "high"]),
            "recommendations": self.generate_recommendations()
        }
        
    def generate_recommendations(self) -> List[str]:
        """Generate recommendations based on validation results"""
        recommendations = []
        
        conflicts = self.results.get("dependency_conflicts", [])
        
        if any(c.get("type") == "frontend_install_failure" for c in conflicts):
            recommendations.append("Run 'pnpm install' to resolve frontend dependencies")
            
        if any(c.get("type") == "backend_install_failure" for c in conflicts):
            recommendations.append("Run 'poetry install' in backend directory to resolve backend dependencies")
            
        if any(c.get("type") == "jsonschema_missing" for c in conflicts):
            recommendations.append("Add jsonschema to pyproject.toml dependencies (Task F1.1)")
            
        if any(c.get("type") == "import_failure" for c in conflicts):
            recommendations.append("Check for missing or incompatible package versions")
            
        if not conflicts:
            recommendations.append("All dependencies resolved successfully - proceed with test execution")
            
        return recommendations

    def run_validation(self) -> Dict[str, Any]:
        """Run complete dependency validation"""
        print("🚀 Starting Dependency Resolution Validation (Task F1.3)")
        print("=" * 60)
        
        # Validate frontend
        self.results["frontend"] = self.validate_frontend_dependencies()
        
        # Validate backend  
        self.results["backend"] = self.validate_backend_dependencies()
        
        # Create performance baseline
        self.results["performance_baseline"] = self.create_performance_baseline()
        
        # Analyze conflicts
        self.results["dependency_conflicts"] = self.analyze_dependency_conflicts()
        
        # Generate summary
        self.results["summary"] = self.generate_summary()
        
        return self.results

    def save_results(self, filename: str = "dependency_validation_results.json"):
        """Save validation results to file"""
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"📄 Results saved to {filename}")

    def print_summary(self):
        """Print validation summary"""
        print("\n" + "=" * 60)
        print("📋 DEPENDENCY VALIDATION SUMMARY")
        print("=" * 60)
        
        summary = self.results.get("summary", {})
        
        status_emoji = "✅" if summary.get("overall_status") == "success" else "❌"
        print(f"{status_emoji} Overall Status: {summary.get('overall_status', 'unknown').upper()}")
        
        print(f"📦 Frontend Dependencies: {summary.get('frontend_dependencies', 'unknown')}")
        print(f"🐍 Backend Dependencies: {summary.get('backend_dependencies', 'unknown')}")
        print(f"📋 jsonschema Requirement (F1.1): {summary.get('jsonschema_requirement', 'unknown')}")
        print(f"⚠️  Total Conflicts: {summary.get('total_conflicts', 0)}")
        print(f"🚨 Critical Conflicts: {summary.get('critical_conflicts', 0)}")
        
        recommendations = summary.get("recommendations", [])
        if recommendations:
            print("\n💡 RECOMMENDATIONS:")
            for i, rec in enumerate(recommendations, 1):
                print(f"   {i}. {rec}")
                
        conflicts = self.results.get("dependency_conflicts", [])
        if conflicts:
            print("\n⚠️  DEPENDENCY CONFLICTS:")
            for conflict in conflicts:
                severity_emoji = "🚨" if conflict.get("severity") == "high" else "⚠️"
                print(f"   {severity_emoji} {conflict.get('description', 'Unknown conflict')}")
                if conflict.get("error"):
                    print(f"      Error: {conflict.get('error')}")
                    
        baseline = self.results.get("performance_baseline", {})
        install_times = baseline.get("dependency_install_times", {})
        if install_times:
            print("\n⏱️  PERFORMANCE BASELINE:")
            for package_manager, time_taken in install_times.items():
                print(f"   {package_manager}: {time_taken:.2f}s")


def main():
    """Main execution function"""
    # Change to the medical-device-regulatory-assistant directory
    project_root = Path(__file__).parent
    os.chdir(project_root)
    
    validator = DependencyValidator()
    
    try:
        results = validator.run_validation()
        validator.print_summary()
        validator.save_results()
        
        # Exit with appropriate code
        if results.get("summary", {}).get("overall_status") == "success":
            print("\n✅ Task F1.3 validation completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Task F1.3 validation failed - see conflicts above")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️  Validation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Validation failed with error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()