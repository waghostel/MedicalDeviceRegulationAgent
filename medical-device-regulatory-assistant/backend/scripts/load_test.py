#!/usr/bin/env python3
"""
Load testing script for Medical Device Regulatory Assistant API.
Tests concurrent user scenarios and measures performance metrics.
"""

import asyncio
import aiohttp
import time
import statistics
import json
import argparse
from typing import List, Dict, Any
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor
import sys
import os

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@dataclass
class LoadTestConfig:
    """Configuration for load testing."""
    base_url: str = "http://localhost:8000"
    concurrent_users: List[int] = None
    test_duration: int = 30  # seconds
    ramp_up_time: int = 5   # seconds
    think_time: float = 1.0  # seconds between requests
    timeout: int = 30       # request timeout

    def __post_init__(self):
        if self.concurrent_users is None:
            self.concurrent_users = [1, 5, 10, 20]


@dataclass
class TestResult:
    """Result of a single test request."""
    endpoint: str
    method: str
    response_time: float
    status_code: int
    success: bool
    error: str = None
    timestamp: float = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()


class LoadTestMetrics:
    """Collects and analyzes load test metrics."""
    
    def __init__(self):
        self.results: List[TestResult] = []
        self.start_time = time.time()
    
    def add_result(self, result: TestResult):
        """Add a test result."""
        self.results.append(result)
    
    def get_metrics_by_endpoint(self, endpoint: str) -> Dict[str, Any]:
        """Get metrics for a specific endpoint."""
        endpoint_results = [r for r in self.results if r.endpoint == endpoint]
        
        if not endpoint_results:
            return {}
        
        response_times = [r.response_time for r in endpoint_results]
        success_count = sum(1 for r in endpoint_results if r.success)
        
        return {
            "total_requests": len(endpoint_results),
            "successful_requests": success_count,
            "failed_requests": len(endpoint_results) - success_count,
            "success_rate": (success_count / len(endpoint_results)) * 100,
            "avg_response_time": statistics.mean(response_times),
            "min_response_time": min(response_times),
            "max_response_time": max(response_times),
            "p50_response_time": statistics.median(response_times),
            "p95_response_time": self._percentile(response_times, 95),
            "p99_response_time": self._percentile(response_times, 99),
            "requests_per_second": len(endpoint_results) / (time.time() - self.start_time),
        }
    
    def get_overall_metrics(self) -> Dict[str, Any]:
        """Get overall test metrics."""
        if not self.results:
            return {}
        
        response_times = [r.response_time for r in self.results]
        success_count = sum(1 for r in self.results if r.success)
        total_duration = time.time() - self.start_time
        
        return {
            "total_requests": len(self.results),
            "successful_requests": success_count,
            "failed_requests": len(self.results) - success_count,
            "success_rate": (success_count / len(self.results)) * 100,
            "avg_response_time": statistics.mean(response_times),
            "p95_response_time": self._percentile(response_times, 95),
            "total_duration": total_duration,
            "requests_per_second": len(self.results) / total_duration,
        }
    
    @staticmethod
    def _percentile(data: List[float], percentile: int) -> float:
        """Calculate percentile of data."""
        sorted_data = sorted(data)
        index = int((percentile / 100) * len(sorted_data))
        return sorted_data[min(index, len(sorted_data) - 1)]


class LoadTester:
    """Main load testing class."""
    
    def __init__(self, config: LoadTestConfig):
        self.config = config
        self.metrics = LoadTestMetrics()
        self.session = None
    
    async def make_request(self, method: str, endpoint: str, **kwargs) -> TestResult:
        """Make a single HTTP request and measure performance."""
        start_time = time.time()
        
        try:
            async with self.session.request(
                method, 
                f"{self.config.base_url}{endpoint}",
                timeout=aiohttp.ClientTimeout(total=self.config.timeout),
                **kwargs
            ) as response:
                await response.text()  # Ensure response is fully read
                response_time = time.time() - start_time
                
                return TestResult(
                    endpoint=endpoint,
                    method=method,
                    response_time=response_time,
                    status_code=response.status,
                    success=response.status < 400
                )
        
        except Exception as e:
            response_time = time.time() - start_time
            return TestResult(
                endpoint=endpoint,
                method=method,
                response_time=response_time,
                status_code=0,
                success=False,
                error=str(e)
            )
    
    async def simulate_user_session(self, user_id: int) -> List[TestResult]:
        """Simulate a complete user session."""
        results = []
        
        # 1. Health check
        result = await self.make_request("GET", "/health")
        results.append(result)
        
        if not result.success:
            return results
        
        await asyncio.sleep(self.config.think_time)
        
        # 2. Create project
        project_data = {
            "name": f"Load Test Project {user_id}",
            "description": "Test project for load testing",
            "deviceType": "Class II Medical Device",
            "intendedUse": "Testing purposes only"
        }
        
        result = await self.make_request("POST", "/api/projects", json=project_data)
        results.append(result)
        
        if not result.success:
            return results
        
        await asyncio.sleep(self.config.think_time)
        
        # 3. Get projects list
        result = await self.make_request("GET", "/api/projects")
        results.append(result)
        
        await asyncio.sleep(self.config.think_time)
        
        # 4. Device classification
        classification_data = {
            "deviceDescription": "Cardiac monitoring device for load testing",
            "intendedUse": "Continuous cardiac rhythm monitoring"
        }
        
        result = await self.make_request("POST", "/api/agents/classify-device", json=classification_data)
        results.append(result)
        
        await asyncio.sleep(self.config.think_time)
        
        # 5. Predicate search
        search_data = {
            "deviceDescription": "Cardiac monitoring device",
            "intendedUse": "Continuous cardiac rhythm monitoring",
            "productCode": "DQO"
        }
        
        result = await self.make_request("POST", "/api/agents/predicate-search", json=search_data)
        results.append(result)
        
        return results
    
    async def run_load_test(self, concurrent_users: int) -> Dict[str, Any]:
        """Run load test with specified number of concurrent users."""
        print(f"\n🔄 Running load test with {concurrent_users} concurrent users...")
        
        self.metrics = LoadTestMetrics()  # Reset metrics
        
        async with aiohttp.ClientSession() as session:
            self.session = session
            
            # Health check first
            health_result = await self.make_request("GET", "/health")
            if not health_result.success:
                raise Exception(f"Health check failed: {health_result.error}")
            
            # Create tasks for concurrent users
            tasks = []
            for user_id in range(concurrent_users):
                # Stagger user start times for ramp-up
                delay = (user_id / concurrent_users) * self.config.ramp_up_time
                task = asyncio.create_task(self._delayed_user_session(user_id, delay))
                tasks.append(task)
            
            # Wait for all tasks to complete
            session_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Collect all results
            for result_list in session_results:
                if isinstance(result_list, Exception):
                    print(f"⚠️  User session error: {result_list}")
                    continue
                
                for result in result_list:
                    self.metrics.add_result(result)
        
        return self.analyze_results()
    
    async def _delayed_user_session(self, user_id: int, delay: float) -> List[TestResult]:
        """Run user session with initial delay for ramp-up."""
        await asyncio.sleep(delay)
        return await self.simulate_user_session(user_id)
    
    def analyze_results(self) -> Dict[str, Any]:
        """Analyze test results and return metrics."""
        overall_metrics = self.metrics.get_overall_metrics()
        
        # Get metrics by endpoint
        endpoints = list(set(r.endpoint for r in self.metrics.results))
        endpoint_metrics = {}
        
        for endpoint in endpoints:
            endpoint_metrics[endpoint] = self.metrics.get_metrics_by_endpoint(endpoint)
        
        return {
            "overall": overall_metrics,
            "endpoints": endpoint_metrics,
            "raw_results": [asdict(r) for r in self.metrics.results]
        }
    
    def print_results(self, results: Dict[str, Any], concurrent_users: int):
        """Print formatted test results."""
        overall = results["overall"]
        
        print(f"\n📊 Results for {concurrent_users} concurrent users:")
        print(f"   Total Requests: {overall['total_requests']}")
        print(f"   Success Rate: {overall['success_rate']:.1f}%")
        print(f"   Avg Response Time: {overall['avg_response_time']:.3f}s")
        print(f"   P95 Response Time: {overall['p95_response_time']:.3f}s")
        print(f"   Requests/Second: {overall['requests_per_second']:.1f}")
        
        print("\n📈 Endpoint Breakdown:")
        for endpoint, metrics in results["endpoints"].items():
            if metrics:
                print(f"   {endpoint}:")
                print(f"     Success Rate: {metrics['success_rate']:.1f}%")
                print(f"     Avg Response: {metrics['avg_response_time']:.3f}s")
                print(f"     P95 Response: {metrics['p95_response_time']:.3f}s")
    
    async def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive load test with multiple user counts."""
        print("🚀 Starting comprehensive load test...")
        
        all_results = {}
        
        for user_count in self.config.concurrent_users:
            try:
                results = await self.run_load_test(user_count)
                all_results[f"{user_count}_users"] = results
                self.print_results(results, user_count)
                
                # Brief pause between test runs
                await asyncio.sleep(2)
                
            except Exception as e:
                print(f"❌ Load test with {user_count} users failed: {e}")
                all_results[f"{user_count}_users"] = {"error": str(e)}
        
        return all_results


def save_results(results: Dict[str, Any], filename: str = "load_test_results.json"):
    """Save test results to JSON file."""
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"📄 Results saved to {filename}")


async def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Load test Medical Device Regulatory Assistant API")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL for API")
    parser.add_argument("--users", type=int, nargs="+", default=[1, 5, 10, 20], help="Concurrent user counts to test")
    parser.add_argument("--duration", type=int, default=30, help="Test duration in seconds")
    parser.add_argument("--output", default="load_test_results.json", help="Output file for results")
    
    args = parser.parse_args()
    
    config = LoadTestConfig(
        base_url=args.url,
        concurrent_users=args.users,
        test_duration=args.duration
    )
    
    tester = LoadTester(config)
    
    try:
        results = await tester.run_comprehensive_test()
        save_results(results, args.output)
        
        # Check if any tests failed
        failed_tests = [k for k, v in results.items() if "error" in v]
        if failed_tests:
            print(f"\n❌ {len(failed_tests)} test configurations failed")
            return 1
        else:
            print("\n✅ All load tests completed successfully")
            return 0
            
    except Exception as e:
        print(f"\n💥 Load test execution failed: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)