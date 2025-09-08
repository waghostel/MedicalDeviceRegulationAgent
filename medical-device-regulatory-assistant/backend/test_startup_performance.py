#!/usr/bin/env python3
"""
Startup Performance Test for Medical Device Regulatory Assistant

This script measures and analyzes startup performance to identify bottlenecks.
"""

import time
import asyncio
import subprocess
import psutil
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

class StartupPerformanceAnalyzer:
    """Analyze startup performance and identify bottlenecks"""
    
    def __init__(self):
        self.measurements = {}
        self.process = None
        self.start_time = None
        
    def measure_import_time(self) -> Dict[str, float]:
        """Measure time taken to import key modules"""
        print("📦 Measuring import times...")
        
        imports = [
            "fastapi",
            "uvicorn", 
            "aiosqlite",
            "redis.asyncio",
            "httpx",
            "jwt",
            "pydantic"
        ]
        
        import_times = {}
        
        for module in imports:
            start = time.time()
            try:
                __import__(module)
                import_time = (time.time() - start) * 1000
                import_times[module] = import_time
                print(f"  {module}: {import_time:.1f}ms")
            except ImportError as e:
                import_times[module] = -1
                print(f"  {module}: Not available ({e})")
        
        return import_times
    
    def measure_database_init_time(self) -> float:
        """Measure database initialization time"""
        print("\n💾 Measuring database initialization...")
        
        start = time.time()
        try:
            from database.connection import init_database
            
            # Test database initialization
            async def test_db_init():
                db_manager = await init_database("sqlite:./test_startup.db")
                await db_manager.close()
                # Clean up test database
                if os.path.exists("test_startup.db"):
                    os.remove("test_startup.db")
            
            asyncio.run(test_db_init())
            
            init_time = (time.time() - start) * 1000
            print(f"  Database init: {init_time:.1f}ms")
            return init_time
            
        except Exception as e:
            print(f"  Database init failed: {e}")
            return -1
    
    def measure_service_init_times(self) -> Dict[str, float]:
        """Measure individual service initialization times"""
        print("\n🔧 Measuring service initialization times...")
        
        service_times = {}
        
        # Test Redis initialization
        start = time.time()
        try:
            from services.cache import init_redis
            asyncio.run(init_redis())
            redis_time = (time.time() - start) * 1000
            service_times["redis"] = redis_time
            print(f"  Redis init: {redis_time:.1f}ms")
        except Exception as e:
            service_times["redis"] = -1
            print(f"  Redis init failed: {e}")
        
        # Test FDA API service
        start = time.time()
        try:
            from services.openfda import OpenFDAService
            fda_service = OpenFDAService()
            fda_time = (time.time() - start) * 1000
            service_times["fda_api"] = fda_time
            print(f"  FDA API init: {fda_time:.1f}ms")
        except Exception as e:
            service_times["fda_api"] = -1
            print(f"  FDA API init failed: {e}")
        
        return service_times
    
    def measure_app_creation_time(self) -> float:
        """Measure FastAPI app creation time"""
        print("\n🚀 Measuring FastAPI app creation...")
        
        start = time.time()
        try:
            from main import app
            app_time = (time.time() - start) * 1000
            print(f"  App creation: {app_time:.1f}ms")
            return app_time
        except Exception as e:
            print(f"  App creation failed: {e}")
            return -1
    
    def measure_full_startup_time(self) -> Dict[str, Any]:
        """Measure full server startup time"""
        print("\n⏱️  Measuring full server startup...")
        
        # Start server in background
        cmd = [
            "poetry", "run", "uvicorn", "main:app",
            "--host", "127.0.0.1",
            "--port", "8001",  # Use different port to avoid conflicts
            "--log-level", "error"  # Reduce log noise
        ]
        
        start_time = time.time()
        
        try:
            # Start process
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for server to be ready
            import requests
            max_wait = 30  # Maximum 30 seconds
            ready = False
            
            for i in range(max_wait * 10):  # Check every 100ms
                try:
                    response = requests.get("http://127.0.0.1:8001/health", timeout=1)
                    if response.status_code == 200:
                        ready = True
                        break
                except:
                    pass
                time.sleep(0.1)
            
            startup_time = (time.time() - start_time) * 1000
            
            if ready:
                print(f"  ✅ Server ready in {startup_time:.1f}ms")
                
                # Get memory usage
                try:
                    proc = psutil.Process(process.pid)
                    memory_mb = proc.memory_info().rss / 1024 / 1024
                    print(f"  📊 Memory usage: {memory_mb:.1f}MB")
                except:
                    memory_mb = -1
                
                # Stop server
                process.terminate()
                process.wait(timeout=5)
                
                return {
                    "startup_time_ms": startup_time,
                    "memory_mb": memory_mb,
                    "success": True
                }
            else:
                print(f"  ❌ Server failed to start within {max_wait}s")
                process.terminate()
                return {
                    "startup_time_ms": startup_time,
                    "memory_mb": -1,
                    "success": False
                }
                
        except Exception as e:
            print(f"  ❌ Startup test failed: {e}")
            return {
                "startup_time_ms": -1,
                "memory_mb": -1,
                "success": False,
                "error": str(e)
            }
    
    def analyze_bottlenecks(self, measurements: Dict[str, Any]) -> List[str]:
        """Analyze measurements to identify bottlenecks"""
        bottlenecks = []
        
        # Check import times
        if "imports" in measurements:
            slow_imports = [
                name for name, time_ms in measurements["imports"].items()
                if time_ms > 100  # > 100ms is slow for imports
            ]
            if slow_imports:
                bottlenecks.append(f"Slow imports: {', '.join(slow_imports)}")
        
        # Check database init
        if measurements.get("database_init", 0) > 500:  # > 500ms is slow
            bottlenecks.append("Slow database initialization")
        
        # Check service init
        if "services" in measurements:
            slow_services = [
                name for name, time_ms in measurements["services"].items()
                if time_ms > 200  # > 200ms is slow for service init
            ]
            if slow_services:
                bottlenecks.append(f"Slow service initialization: {', '.join(slow_services)}")
        
        # Check overall startup time
        if measurements.get("full_startup", {}).get("startup_time_ms", 0) > 8000:  # > 8s is slow
            bottlenecks.append("Overall startup time exceeds 8 seconds")
        
        return bottlenecks
    
    def generate_recommendations(self, bottlenecks: List[str]) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        for bottleneck in bottlenecks:
            if "import" in bottleneck.lower():
                recommendations.append("Consider lazy loading of heavy modules")
                recommendations.append("Move imports inside functions where possible")
            
            if "database" in bottleneck.lower():
                recommendations.append("Optimize database connection settings")
                recommendations.append("Consider connection pooling")
            
            if "service" in bottleneck.lower():
                recommendations.append("Initialize services in parallel")
                recommendations.append("Make optional services truly optional")
            
            if "startup time" in bottleneck.lower():
                recommendations.append("Implement parallel service initialization")
                recommendations.append("Add startup progress indicators")
        
        # General recommendations
        recommendations.extend([
            "Use async initialization where possible",
            "Implement health checks that don't block startup",
            "Consider pre-warming critical services"
        ])
        
        return list(set(recommendations))  # Remove duplicates
    
    def run_full_analysis(self) -> Dict[str, Any]:
        """Run complete startup performance analysis"""
        print("🔍 Startup Performance Analysis")
        print("=" * 50)
        
        measurements = {}
        
        # Measure import times
        measurements["imports"] = self.measure_import_time()
        
        # Measure database initialization
        measurements["database_init"] = self.measure_database_init_time()
        
        # Measure service initialization
        measurements["services"] = self.measure_service_init_times()
        
        # Measure app creation
        measurements["app_creation"] = self.measure_app_creation_time()
        
        # Measure full startup
        measurements["full_startup"] = self.measure_full_startup_time()
        
        # Analyze bottlenecks
        bottlenecks = self.analyze_bottlenecks(measurements)
        recommendations = self.generate_recommendations(bottlenecks)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "measurements": measurements,
            "bottlenecks": bottlenecks,
            "recommendations": recommendations
        }


def main():
    """Main analysis function"""
    analyzer = StartupPerformanceAnalyzer()
    results = analyzer.run_full_analysis()
    
    print("\n📊 Analysis Results")
    print("=" * 30)
    
    # Print summary
    full_startup = results["measurements"].get("full_startup", {})
    if full_startup.get("success"):
        startup_time = full_startup["startup_time_ms"]
        memory_usage = full_startup["memory_mb"]
        
        print(f"🚀 Startup Time: {startup_time:.1f}ms ({startup_time/1000:.1f}s)")
        if memory_usage > 0:
            print(f"💾 Memory Usage: {memory_usage:.1f}MB")
        
        # Performance rating
        if startup_time < 5000:
            print("⭐ Performance: Excellent (< 5s)")
        elif startup_time < 8000:
            print("⭐ Performance: Good (< 8s)")
        elif startup_time < 15000:
            print("⭐ Performance: Acceptable (< 15s)")
        else:
            print("⭐ Performance: Needs Improvement (> 15s)")
    else:
        print("❌ Startup failed or timed out")
    
    # Print bottlenecks
    if results["bottlenecks"]:
        print(f"\n🚨 Identified Bottlenecks ({len(results['bottlenecks'])}):")
        for i, bottleneck in enumerate(results["bottlenecks"], 1):
            print(f"  {i}. {bottleneck}")
    else:
        print("\n✅ No significant bottlenecks identified")
    
    # Print recommendations
    if results["recommendations"]:
        print(f"\n💡 Optimization Recommendations ({len(results['recommendations'])}):")
        for i, rec in enumerate(results["recommendations"], 1):
            print(f"  {i}. {rec}")
    
    # Save detailed results
    import json
    with open("startup_performance_analysis.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: startup_performance_analysis.json")
    
    # Return success if startup time is acceptable
    startup_time = full_startup.get("startup_time_ms", float('inf'))
    return 0 if startup_time < 8000 else 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)