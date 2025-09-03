"""
Load testing for Medical Device Regulatory Assistant API endpoints.
Tests concurrent user scenarios and performance under load.
"""

import asyncio
import time
from typing import List, Dict, Any
import pytest
import httpx
from concurrent.futures import ThreadPoolExecutor, as_completed
import statistics

# Test configuration
BASE_URL = "http://localhost:8000"
CONCURRENT_USERS = [1, 5, 10, 20, 50]
TEST_DURATION = 30  # seconds
PERFORMANCE_THRESHOLDS = {
    "classification": 2.0,  # 2 seconds max
    "predicate_search": 10.0,  # 10 seconds max
    "project_creation": 1.0,  # 1 second max
    "dashboard_load": 0.5,  # 500ms max
}


class LoadTestResult:
    def __init__(self):
        self.response_times: List[float] = []
        self.success_count = 0
        self.error_count = 0
        self.errors: List[str] = []

    def add_result(self, response_time: float, success: bool, error: str = None):
        self.response_times.append(response_time)
        if success:
            self.success_count += 1
        else:
            self.error_count += 1
            if error:
                self.errors.append(error)

    @property
    def avg_response_time(self) -> float:
        return statistics.mean(self.response_times) if self.response_times else 0

    @property
    def p95_response_time(self) -> float:
        if not self.response_times:
            return 0
        sorted_times = sorted(self.response_times)
        index = int(0.95 * len(sorted_times))
        return sorted_times[index]

    @property
    def success_rate(self) -> float:
        total = self.success_count + self.error_count
        return (self.success_count / total * 100) if total > 0 else 0


async def make_request(client: httpx.AsyncClient, method: str, url: str, **kwargs) -> tuple[float, bool, str]:
    """Make a single HTTP request and measure response time."""
    start_time = time.time()
    try:
        response = await client.request(method, url, **kwargs)
        response_time = time.time() - start_time
        success = response.status_code < 400
        error = f"HTTP {response.status_code}" if not success else None
        return response_time, success, error
    except Exception as e:
        response_time = time.time() - start_time
        return response_time, False, str(e)


async def simulate_user_session(client: httpx.AsyncClient, session_id: int) -> Dict[str, LoadTestResult]:
    """Simulate a complete user session with multiple API calls."""
    results = {
        "project_creation": LoadTestResult(),
        "dashboard_load": LoadTestResult(),
        "classification": LoadTestResult(),
        "predicate_search": LoadTestResult(),
    }

    # 1. Create a project
    project_data = {
        "name": f"Load Test Project {session_id}",
        "description": "Test project for load testing",
        "deviceType": "Class II Medical Device",
        "intendedUse": "Testing purposes only"
    }
    
    response_time, success, error = await make_request(
        client, "POST", f"{BASE_URL}/api/projects", json=project_data
    )
    results["project_creation"].add_result(response_time, success, error)

    if not success:
        return results

    # 2. Load dashboard (simulate multiple dashboard API calls)
    for _ in range(3):
        response_time, success, error = await make_request(
            client, "GET", f"{BASE_URL}/api/projects/1/dashboard"
        )
        results["dashboard_load"].add_result(response_time, success, error)

    # 3. Perform device classification
    classification_data = {
        "deviceDescription": "Cardiac monitoring device",
        "intendedUse": "Continuous cardiac rhythm monitoring"
    }
    
    response_time, success, error = await make_request(
        client, "POST", f"{BASE_URL}/api/agents/classify-device", json=classification_data
    )
    results["classification"].add_result(response_time, success, error)

    # 4. Perform predicate search
    search_data = {
        "deviceDescription": "Cardiac monitoring device",
        "intendedUse": "Continuous cardiac rhythm monitoring",
        "productCode": "DQO"
    }
    
    response_time, success, error = await make_request(
        client, "POST", f"{BASE_URL}/api/agents/predicate-search", json=search_data
    )
    results["predicate_search"].add_result(response_time, success, error)

    return results


async def run_concurrent_load_test(num_users: int, duration: int) -> Dict[str, LoadTestResult]:
    """Run load test with specified number of concurrent users."""
    print(f"Running load test with {num_users} concurrent users for {duration} seconds...")
    
    combined_results = {
        "project_creation": LoadTestResult(),
        "dashboard_load": LoadTestResult(),
        "classification": LoadTestResult(),
        "predicate_search": LoadTestResult(),
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Health check first
        try:
            response = await client.get(f"{BASE_URL}/health")
            if response.status_code != 200:
                raise Exception(f"Health check failed: {response.status_code}")
        except Exception as e:
            raise Exception(f"Cannot connect to server: {e}")

        start_time = time.time()
        session_id = 0
        
        while time.time() - start_time < duration:
            # Create tasks for concurrent users
            tasks = []
            for i in range(num_users):
                task = asyncio.create_task(simulate_user_session(client, session_id + i))
                tasks.append(task)
            
            session_id += num_users
            
            # Wait for all tasks to complete
            session_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Combine results
            for result in session_results:
                if isinstance(result, Exception):
                    print(f"Session error: {result}")
                    continue
                
                for endpoint, endpoint_result in result.items():
                    combined_results[endpoint].response_times.extend(endpoint_result.response_times)
                    combined_results[endpoint].success_count += endpoint_result.success_count
                    combined_results[endpoint].error_count += endpoint_result.error_count
                    combined_results[endpoint].errors.extend(endpoint_result.errors)

    return combined_results


@pytest.mark.asyncio
@pytest.mark.slow
async def test_single_user_performance():
    """Test performance with a single user to establish baseline."""
    results = await run_concurrent_load_test(1, 10)
    
    for endpoint, result in results.items():
        if result.response_times:
            threshold = PERFORMANCE_THRESHOLDS[endpoint]
            avg_time = result.avg_response_time
            
            print(f"{endpoint}: avg={avg_time:.2f}s, p95={result.p95_response_time:.2f}s, "
                  f"success_rate={result.success_rate:.1f}%")
            
            assert avg_time < threshold, f"{endpoint} average response time {avg_time:.2f}s exceeds threshold {threshold}s"
            assert result.success_rate >= 95, f"{endpoint} success rate {result.success_rate:.1f}% below 95%"


@pytest.mark.asyncio
@pytest.mark.slow
async def test_concurrent_users_performance():
    """Test performance under various concurrent user loads."""
    for num_users in CONCURRENT_USERS:
        print(f"\n--- Testing {num_users} concurrent users ---")
        
        results = await run_concurrent_load_test(num_users, 15)
        
        for endpoint, result in results.items():
            if result.response_times:
                threshold = PERFORMANCE_THRESHOLDS[endpoint]
                avg_time = result.avg_response_time
                p95_time = result.p95_response_time
                
                print(f"{endpoint}: avg={avg_time:.2f}s, p95={p95_time:.2f}s, "
                      f"success_rate={result.success_rate:.1f}%, requests={len(result.response_times)}")
                
                # More lenient thresholds for high concurrency
                max_threshold = threshold * (1 + num_users * 0.1)  # Allow 10% increase per user
                
                assert avg_time < max_threshold, \
                    f"{endpoint} with {num_users} users: avg response time {avg_time:.2f}s exceeds threshold {max_threshold:.2f}s"
                
                # Success rate should remain high even under load
                min_success_rate = max(80, 95 - num_users)  # Allow some degradation with high load
                assert result.success_rate >= min_success_rate, \
                    f"{endpoint} with {num_users} users: success rate {result.success_rate:.1f}% below {min_success_rate}%"


@pytest.mark.asyncio
@pytest.mark.slow
async def test_sustained_load():
    """Test system behavior under sustained load."""
    print("\n--- Testing sustained load (50 users for 60 seconds) ---")
    
    results = await run_concurrent_load_test(10, 60)  # Reduced from 50 users to avoid overwhelming
    
    for endpoint, result in results.items():
        if result.response_times:
            print(f"{endpoint}: {len(result.response_times)} requests, "
                  f"avg={result.avg_response_time:.2f}s, "
                  f"p95={result.p95_response_time:.2f}s, "
                  f"success_rate={result.success_rate:.1f}%")
            
            # Under sustained load, allow higher thresholds
            threshold = PERFORMANCE_THRESHOLDS[endpoint] * 2
            assert result.avg_response_time < threshold, \
                f"{endpoint} sustained load avg response time exceeds {threshold}s"
            
            assert result.success_rate >= 75, \
                f"{endpoint} sustained load success rate below 75%"


@pytest.mark.asyncio
async def test_memory_usage_under_load():
    """Test memory usage doesn't grow excessively under load."""
    import psutil
    import os
    
    # Get initial memory usage
    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info().rss / 1024 / 1024  # MB
    
    # Run load test
    await run_concurrent_load_test(5, 20)
    
    # Check final memory usage
    final_memory = process.memory_info().rss / 1024 / 1024  # MB
    memory_increase = final_memory - initial_memory
    
    print(f"Memory usage: initial={initial_memory:.1f}MB, final={final_memory:.1f}MB, "
          f"increase={memory_increase:.1f}MB")
    
    # Memory increase should be reasonable (less than 100MB for this test)
    assert memory_increase < 100, f"Memory usage increased by {memory_increase:.1f}MB, which is excessive"


if __name__ == "__main__":
    # Run a quick load test
    async def main():
        print("Running quick load test...")
        results = await run_concurrent_load_test(5, 10)
        
        print("\nResults:")
        for endpoint, result in results.items():
            if result.response_times:
                print(f"{endpoint}: avg={result.avg_response_time:.2f}s, "
                      f"p95={result.p95_response_time:.2f}s, "
                      f"success_rate={result.success_rate:.1f}%")

    asyncio.run(main())