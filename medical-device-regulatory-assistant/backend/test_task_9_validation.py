#!/usr/bin/env python3
"""
Task 9: Test Infrastructure Validation and Performance Optimization

This script runs comprehensive validation of the test infrastructure including:
- Test isolation validation
- Performance benchmarking
- Memory leak detection
- CI/CD integration testing
- Test maintenance documentation generation

Usage:
    python test_task_9_validation.py
    python test_task_9_validation.py --quick  # Run quick validation only
"""

import asyncio
import os
import sys
import time
from pathlib import Path

# Add the backend directory to Python path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from tests.utils.test_infrastructure_validator import TestInfrastructureValidator
from tests.utils.performance_monitor import PerformanceMonitor
from tests.utils.test_maintenance_docs import TestMaintenanceDocGenerator


async def main():
    """Main validation function for Task 9"""
    print("🧪 Task 9: Test Infrastructure Validation and Performance Optimization")
    print("=" * 80)
    
    quick_mode = "--quick" in sys.argv
    
    # Initialize components
    validator = TestInfrastructureValidator()
    performance_monitor = PerformanceMonitor()
    doc_generator = TestMaintenanceDocGenerator()
    
    results = {}
    
    try:
        # 1. Validate Test Isolation
        print("\n🔍 Step 1: Validating Test Isolation...")
        isolation_iterations = 3 if quick_mode else 5
        results["isolation"] = await validator.validate_test_isolation(iterations=isolation_iterations)
        
        if results["isolation"]["database_isolation"]:
            print("✅ Database isolation: PASS")
        else:
            print("❌ Database isolation: FAIL")
            for error in results["isolation"]["errors"]:
                print(f"   - {error}")
        
        if not results["isolation"]["race_conditions"]:
            print("✅ Race condition check: PASS")
        else:
            print("❌ Race conditions detected")
        
        # 2. Performance Benchmarking
        print("\n⚡ Step 2: Performance Benchmarking...")
        target_time = 30.0 if quick_mode else 60.0
        results["performance"] = await validator.benchmark_performance(target_time=target_time)
        
        if results["performance"]["meets_target"]:
            print(f"✅ Performance target met: {results['performance']['total_time']:.2f}s <= {target_time}s")
        else:
            print(f"⚠️ Performance target exceeded: {results['performance']['total_time']:.2f}s > {target_time}s")
            print("   Recommendations:")
            for rec in results["performance"]["recommendations"][:3]:
                print(f"   - {rec}")
        
        # 3. Memory Leak Detection
        print("\n🧠 Step 3: Memory Leak Detection...")
        memory_iterations = 5 if quick_mode else 10
        results["memory"] = await validator.detect_memory_leaks(iterations=memory_iterations)
        
        if not results["memory"]["has_memory_leaks"]:
            print(f"✅ No memory leaks detected: {results['memory']['memory_growth']:.2f} MB growth")
        else:
            print(f"⚠️ Memory leaks detected: {results['memory']['memory_growth']:.2f} MB growth")
            print("   Recommendations:")
            for rec in results["memory"]["recommendations"][:3]:
                print(f"   - {rec}")
        
        # 4. CI/CD Integration Testing
        print("\n🚀 Step 4: CI/CD Integration Testing...")
        results["ci_cd"] = validator.validate_ci_cd_integration()
        
        if results["ci_cd"]["test_execution"]["success"]:
            print("✅ CI/CD integration: PASS")
        else:
            print("❌ CI/CD integration: FAIL")
            if "error" in results["ci_cd"]["test_execution"]:
                print(f"   Error: {results['ci_cd']['test_execution']['error']}")
        
        # Check environment variables
        missing_env_vars = [
            var for var, info in results["ci_cd"]["environment_variables"].items()
            if not info["present"]
        ]
        if missing_env_vars:
            print(f"⚠️ Missing environment variables: {', '.join(missing_env_vars)}")
        else:
            print("✅ All required environment variables present")
        
        # 5. Generate Test Maintenance Documentation
        print("\n📚 Step 5: Generating Test Maintenance Documentation...")
        
        # Generate comprehensive documentation
        documentation = validator.generate_maintenance_documentation(results)
        
        # Save main documentation
        doc_path = Path("tests/docs/test_infrastructure_report.md")
        doc_path.parent.mkdir(parents=True, exist_ok=True)
        doc_path.write_text(documentation)
        print(f"✅ Main report saved: {doc_path}")
        
        # Generate additional documentation
        if not quick_mode:
            additional_docs = doc_generator.generate_all_documentation()
            print(f"✅ Generated {len(additional_docs)} additional documentation files")
            for doc_name in additional_docs.keys():
                print(f"   - {doc_name}_guide.md")
        
        # 6. Performance Analysis and Reporting
        print("\n📊 Step 6: Performance Analysis...")
        
        # Generate performance report
        performance_report = performance_monitor.generate_performance_report()
        perf_report_path = Path("tests/docs/performance_report.md")
        perf_report_path.write_text(performance_report)
        print(f"✅ Performance report saved: {perf_report_path}")
        
        # 7. Final Summary and Recommendations
        print("\n🎉 Task 9 Validation Complete!")
        print("=" * 80)
        
        print("\n📊 FINAL SUMMARY:")
        print(f"- Test Isolation: {'✅ PASS' if results['isolation']['database_isolation'] else '❌ FAIL'}")
        print(f"- Performance: {'✅ PASS' if results['performance']['meets_target'] else '⚠️ SLOW'}")
        print(f"- Memory: {'✅ PASS' if not results['memory']['has_memory_leaks'] else '⚠️ LEAKS'}")
        print(f"- CI/CD: {'✅ PASS' if results['ci_cd']['test_execution']['success'] else '❌ FAIL'}")
        
        # Overall assessment
        critical_failures = []
        if not results["isolation"]["database_isolation"]:
            critical_failures.append("Database isolation")
        if not results["ci_cd"]["test_execution"]["success"]:
            critical_failures.append("CI/CD integration")
        
        if critical_failures:
            print(f"\n❌ CRITICAL ISSUES DETECTED: {', '.join(critical_failures)}")
            print("   These issues must be resolved before production deployment.")
            return False
        else:
            print("\n✅ ALL CRITICAL VALIDATIONS PASSED")
            
            warnings = []
            if not results["performance"]["meets_target"]:
                warnings.append("Performance target exceeded")
            if results["memory"]["has_memory_leaks"]:
                warnings.append("Memory leaks detected")
            
            if warnings:
                print(f"⚠️ Warnings: {', '.join(warnings)}")
                print("   These should be addressed for optimal performance.")
            
            print("\n🎯 Task 9 Implementation: SUCCESS")
            return True
    
    except Exception as e:
        print(f"\n❌ Task 9 Validation Failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def run_specific_validation(validation_type: str):
    """Run specific validation type"""
    validator = TestInfrastructureValidator()
    
    if validation_type == "isolation":
        print("🔍 Running Test Isolation Validation...")
        result = asyncio.run(validator.validate_test_isolation(iterations=3))
        print(f"Result: {'PASS' if result['database_isolation'] else 'FAIL'}")
        
    elif validation_type == "performance":
        print("⚡ Running Performance Benchmark...")
        result = asyncio.run(validator.benchmark_performance(target_time=60.0))
        print(f"Result: {'PASS' if result['meets_target'] else 'SLOW'} ({result['total_time']:.2f}s)")
        
    elif validation_type == "memory":
        print("🧠 Running Memory Leak Detection...")
        result = asyncio.run(validator.detect_memory_leaks(iterations=5))
        print(f"Result: {'PASS' if not result['has_memory_leaks'] else 'LEAKS'} ({result['memory_growth']:.2f} MB)")
        
    elif validation_type == "ci-cd":
        print("🚀 Running CI/CD Integration Test...")
        result = validator.validate_ci_cd_integration()
        print(f"Result: {'PASS' if result['test_execution']['success'] else 'FAIL'}")
        
    else:
        print(f"Unknown validation type: {validation_type}")
        print("Available types: isolation, performance, memory, ci-cd")


if __name__ == "__main__":
    # Check for specific validation requests
    if len(sys.argv) > 1 and sys.argv[1].startswith("--validate-"):
        validation_type = sys.argv[1].replace("--validate-", "")
        run_specific_validation(validation_type)
    else:
        # Run full validation
        success = asyncio.run(main())
        sys.exit(0 if success else 1)